# 투자 대시보드

내 미국 주식/ETF를 움직이는 흐름·맥락·영향을 그림과 쉬운 말로 보여 주는 개인용 대시보드. 설계는 [docs/DESIGN.md](docs/DESIGN.md) 참고.

## 구조

```
Claude 예약 작업 (평일 21:46 KST, docs/ROUTINE.md)
  ├ Supabase 커넥터: 내 종목 읽기
  ├ Alpha Vantage 커넥터: 시세·뉴스·금리·물가 수집
  ├ 영향 지도·해설 작성
  └ Supabase 커넥터: market_cache('insight:map')에 저장
대시보드 (Vercel, Next.js) → 로그인 후 저장된 해설을 읽어서 그림으로 보여 줌
```

API 키나 서버 비밀값이 필요 없다. Vercel 환경변수도 필요 없다.

## 처음 설정

1. **Supabase 테이블**: SQL Editor에서 `supabase/migrations/`의 SQL을 순서대로 실행
2. **로그인 계정**: Authentication > Users > Add user (Auto Confirm 체크), 신규 가입은 끄기
3. **예약 작업**: claude.ai의 Routines에서 `docs/ROUTINE.md` 지시문으로 예약 작업을 만들고, **Supabase·Alpha Vantage 커넥터를 연결**
4. **Vercel**: 저장소를 Import하면 끝 (환경변수 없음)

```bash
npm install
npm run dev   # http://localhost:3000
```
