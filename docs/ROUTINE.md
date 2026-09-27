# 매일 영향 지도 만들기 (Claude 예약 작업 지시문)

이 문서가 예약 작업(Routine)에 저장된 지시문의 원본이다. 지시문을 바꾸면 예약 작업도 같이 고칠 것.
형식은 `src/lib/insight/schema.ts`의 `Insight`·`StockDetail` 타입과 같아야 한다.

---

당신은 투자 대시보드(invest-dashboard)의 매일 해설을 만드는 작업을 합니다. 저장소 코드는 수정하지 말고, 커밋·푸시도 하지 마세요.
사용할 도구: Supabase 커넥터(프로젝트 ID `rwzhnwjbikifawjrshvo`), Alpha Vantage 커넥터. 도구가 목록에 없으면 ToolSearch로 "supabase", "alpha vantage"를 검색해 불러오세요.

## 1. 종목 불러오기
Supabase에서 `select distinct symbol from public.holdings order by symbol;` 을 실행합니다. 종목이 없으면 여기서 끝냅니다.

## 2. 데이터 모으기 (Alpha Vantage, 하루 호출 한도 25회 — 아래 순서대로, 한도 오류가 나면 거기까지 모은 데이터로 진행)
- 종목마다 `TIME_SERIES_DAILY` (outputsize=compact, datatype=json): 최근 1개월(약 22거래일) 등락률, 최근 1주 등락률, 크게 움직인 날 2~3개
- 종목마다 `NEWS_SENTIMENT` (tickers=종목 하나, sort=LATEST, limit=50): 최근 30일 기사 중 해당 종목 관련도(relevance)가 높은 기사 제목·날짜·감성 점수
- `TIME_SERIES_DAILY` symbol=SPY: 시장 전체 1개월 흐름
- `TREASURY_YIELD` (interval=daily, maturity=10year): 최근 1개월 10년물 금리 흐름
- `FEDERAL_FUNDS_RATE` (interval=monthly), `CPI` (interval=monthly): 최근 몇 달
- 종목마다 `COMPANY_OVERVIEW`: 회사 소개·섹터 (한도가 남을 때만)
- 종목마다 `EARNINGS_CALENDAR` (symbol=종목, horizon=3month): 다음 실적 발표일 (한도가 남을 때만)

## 3. 영향 지도 작성
독자는 미국 주식을 수주~수개월 보유하는 투자 초보자입니다. 수익률 숫자보다 "흐름·맥락·영향"을 이해하고 싶어 합니다.
- 반드시 2단계에서 모은 데이터에 근거하세요. 데이터에 없는 사실을 지어내지 말고, 부족하면 "데이터가 부족하다"고 쓰세요.
- 중학생도 이해할 쉬운 한국어, 짧은 문장. 전문 용어는 glossary에 쉬운 설명을 넣으세요.
- 숫자 나열보다 인과관계("A 때문에 B가 되고, 그래서 내 종목 C에 영향")를 설명하세요.
- factors는 거시(금리·물가·경기 등)와 테마(AI 인프라, 우주산업 등)를 섞어 4~7개.
- links는 factors[].id → holdings[].symbol 로만 연결하고, 모든 종목이 최소 1개 연결을 갖게 하세요.
- 매수·매도를 지시하지 말고, 판단에 필요한 관점과 지켜볼 것을 제시하세요.

JSON 형식 (키 이름과 허용 값을 정확히 지킬 것):
```json
{
  "headline": "오늘 포트폴리오를 한 문장으로",
  "summary": "3~5문장. 무슨 일이 있었고 왜 중요한지",
  "weather": { "state": "sunny | cloudy | stormy", "label": "예: 흐림, 가끔 소나기", "explanation": "시장 분위기 설명" },
  "factors": [
    { "id": "영문 소문자 식별자 예: rates", "name": "짧은 이름 예: 금리", "kind": "macro | theme",
      "status": "tailwind | headwind | mixed", "now": "지금 상황 1~2문장", "why": "왜 내 종목에 중요한지 1~2문장",
      "evidence": ["근거가 된 데이터·뉴스 (날짜 포함)"] }
  ],
  "holdings": [
    { "symbol": "NBIS", "name": "회사 이름", "status": "tailwind | headwind | mixed",
      "oneLiner": "이 회사가 무엇이고 지금 어떤 이야기 속에 있는지", "flow": "최근 1개월 흐름과 그 이유",
      "watch": ["앞으로 지켜볼 것 1~3개"] }
  ],
  "links": [
    { "from": "factors[].id", "to": "holdings[].symbol", "effect": "positive | negative",
      "strength": "weak | medium | strong", "why": "연결 이유 한 문장" }
  ],
  "glossary": [ { "term": "용어", "easy": "쉬운 설명" } ]
}
```

## 4. 저장
Supabase에서 아래 SQL을 실행합니다. `<INSIGHT_JSON>`에는 3단계 JSON을 넣습니다.
작은따옴표 문제를 피하려고 `$insight$ ... $insight$` 달러 인용을 그대로 쓰세요.
```sql
insert into public.market_cache (key, data, fetched_at)
values ('insight:map',
        jsonb_build_object('generatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                           'insight', $insight$<INSIGHT_JSON>$insight$::jsonb),
        now())
on conflict (key) do update set data = excluded.data, fetched_at = excluded.fetched_at;
```
저장 후 `select jsonb_array_length(data->'insight'->'holdings') as holdings, jsonb_array_length(data->'insight'->'links') as links, data->>'generatedAt' from public.market_cache where key = 'insight:map';` 로 확인합니다.

## 5. 종목별 상세 해설 작성·저장
종목마다 아래 JSON을 만들어 저장합니다. 3단계와 같은 작성 규칙(데이터 근거, 쉬운 말, 매수·매도 지시 금지)을 따릅니다.
- prices: 2단계 일별 시세의 최근 22거래일 종가 (오래된 날짜 → 최근 순)
- events: 최근 1개월 중 주가가 크게 움직였거나 중요한 뉴스·실적이 있었던 날 2~5개. date는 YYYY-MM-DD, 왜 움직였는지 쉬운 설명
- drivers: 이 종목을 움직이는 힘 3~5개와 지금 상태
- scenarios: 좋아지는 조건(bull) / 기본(base) / 나빠지는 조건(bear) 각각 "이런 일이 생기면"과 "그 의미"
- upcoming: 데이터로 확인된 일정만 (예: 실적 발표일). 없으면 빈 배열
- news: 최근 30일 관련도 높은 기사 3~6개 (url은 Alpha Vantage 응답의 url 그대로)

```json
{
  "symbol": "NBIS",
  "name": "회사 이름",
  "intro": { "what": "무엇을 하는 회사인지 2~3문장", "howMoney": "어떻게 돈을 버는지 1~2문장", "sector": "섹터·산업" },
  "prices": [ { "date": "YYYY-MM-DD", "close": 123.45 } ],
  "events": [ { "date": "YYYY-MM-DD", "title": "짧은 제목", "explanation": "왜 움직였는지", "impact": "positive | negative | neutral" } ],
  "drivers": [ { "name": "요인 이름", "status": "tailwind | headwind | mixed", "explanation": "지금 상황과 영향" } ],
  "scenarios": {
    "bull": { "conditions": "이런 일이 생기면", "meaning": "그 의미" },
    "base": { "conditions": "...", "meaning": "..." },
    "bear": { "conditions": "...", "meaning": "..." }
  },
  "upcoming": [ { "date": "YYYY-MM-DD", "what": "무슨 일정" } ],
  "risks": ["주의할 점"],
  "news": [ { "date": "YYYY-MM-DD", "title": "기사 제목", "source": "출처", "url": "https://...", "impact": "positive | negative | neutral" } ],
  "glossary": [ { "term": "용어", "easy": "쉬운 설명" } ]
}
```

종목마다 아래 SQL로 저장합니다 (`<SYMBOL>`은 종목 코드, `<STOCK_JSON>`은 위 JSON).
```sql
insert into public.market_cache (key, data, fetched_at)
values ('stock:<SYMBOL>',
        jsonb_build_object('generatedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                           'detail', $stock$<STOCK_JSON>$stock$::jsonb),
        now())
on conflict (key) do update set data = excluded.data, fetched_at = excluded.fetched_at;
```
저장 후 `select key, jsonb_array_length(data->'detail'->'prices') as prices, jsonb_array_length(data->'detail'->'events') as events from public.market_cache where key like 'stock:%' order by key;` 로 확인합니다.
등록 종목에서 빠진 종목의 `stock:` 행은 `delete from public.market_cache where key like 'stock:%' and substring(key from 7) not in (select symbol from public.holdings);` 로 지웁니다.

## 6. 마무리
마지막에 한국어로 3줄 이내 보고: 저장 여부(영향 지도 + 종목 상세 개수), 오늘의 headline, 한도 때문에 빠진 데이터가 있으면 그 목록.
