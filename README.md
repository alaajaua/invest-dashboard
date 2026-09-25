# 투자 대시보드

보유한 미국 주식/ETF의 흐름·맥락·전망을 한눈에 보는 개인용 대시보드. 설계는 [docs/DESIGN.md](docs/DESIGN.md) 참고.

## 처음 설정

1. **Supabase 테이블 생성**: Supabase 대시보드 > SQL Editor에서 `supabase/migrations/` 안의 SQL을 순서대로 실행
2. **로그인 계정 만들기**: Authentication > Users > Add user (이메일·비밀번호, "Auto Confirm" 체크)
   - 혼자 쓰므로 Authentication > Sign In / Providers에서 "Allow new users to sign up"은 끄는 것을 권장
3. **환경변수**: `.env.example`을 `.env.local`로 복사하고 값 입력
   - Supabase URL·anon key·service_role key: Project Settings > API
   - `ALPHAVANTAGE_API_KEY`: 발급받은 키
   - `CRON_SECRET`: 아무 긴 임의 문자열 (예: `openssl rand -hex 32`)
4. 실행:

```bash
npm install
npm run dev   # http://localhost:3000
```

## Vercel 배포

1. Vercel에서 이 저장소를 Import
2. Settings > Environment Variables에 `.env.example`의 값을 모두 입력 (`ANTHROPIC_API_KEY`는 5단계부터)
3. 배포하면 `vercel.json`의 크론이 자동 등록됨
   - 평일 21:30 UTC (한국 06:30, 미국 장 마감 후): 시세·뉴스·금리 갱신
   - 매일 13:00 UTC (한국 22:00): 남은 작업(주간·월간 데이터) 처리

## 데이터 수집 방식

무료 키는 하루 25회 제한이라 **오래된 데이터만, 중요한 순서대로** 가져온다 (`src/lib/market/collector.ts`).

| 순서 | 데이터 | 갱신 주기 |
|---|---|---|
| 1 | 보유 종목 일별 시세 (최근 100일) | 18시간 |
| 2 | SPY (시장 기준) | 18시간 |
| 3 | 종목별 뉴스·심리 | 44시간 |
| 4 | 10년 국채금리 | 18시간 |
| 5 | 보유 섹터 ETF 시세 | 18시간 |
| 6 | 기업 개요·실적 | 7일 |
| 7 | 기준금리·CPI·실업률 | 7일 |

예산이 부족하면 뒤쪽 작업은 다음 실행으로 미뤄진다. 크론은 수동 새로고침용으로 3회를 남겨 둔다.
