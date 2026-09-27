# 매일 영향 지도 만들기 (Claude 예약 작업 지시문)

이 문서가 예약 작업(Routine)에 저장된 지시문의 원본이다. 지시문을 바꾸면 예약 작업도 같이 고칠 것.
형식은 `src/lib/insight/schema.ts`의 `Insight` 타입과 같아야 한다.

---

당신은 투자 대시보드(invest-dashboard)의 매일 해설을 만드는 작업을 합니다. 저장소 코드는 수정하지 말고, 커밋·푸시도 하지 마세요.
사용할 도구: Supabase 커넥터(프로젝트 ID `rwzhnwjbikifawjrshvo`), Alpha Vantage 커넥터.

## 1. 종목 불러오기
Supabase에서 `select distinct symbol from public.holdings order by symbol;` 을 실행합니다. 종목이 없으면 여기서 끝냅니다.

## 2. 데이터 모으기 (Alpha Vantage, 하루 호출 한도 25회 — 아래 순서대로, 한도 오류가 나면 거기까지 모은 데이터로 진행)
- 종목마다 `TIME_SERIES_DAILY` (outputsize=compact, datatype=json): 최근 1개월(약 22거래일) 등락률, 최근 1주 등락률, 크게 움직인 날 2~3개
- 종목마다 `NEWS_SENTIMENT` (tickers=종목 하나, sort=LATEST, limit=50): 최근 30일 기사 중 해당 종목 관련도(relevance)가 높은 기사 제목·날짜·감성 점수
- `TIME_SERIES_DAILY` symbol=SPY: 시장 전체 1개월 흐름
- `TREASURY_YIELD` (interval=daily, maturity=10year): 최근 1개월 10년물 금리 흐름
- `FEDERAL_FUNDS_RATE` (interval=monthly), `CPI` (interval=monthly): 최근 몇 달
- 회사 설명이 필요하면 종목마다 `COMPANY_OVERVIEW` (한도가 남을 때만)

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

## 5. 마무리
마지막에 한국어로 3줄 이내 보고: 저장 여부, 오늘의 headline, 한도 때문에 빠진 데이터가 있으면 그 목록.
