# 투자 대시보드

보유한 미국 주식/ETF의 흐름·맥락·전망을 한눈에 보는 개인용 대시보드. 설계는 [docs/DESIGN.md](docs/DESIGN.md) 참고.

## 처음 설정

1. **Supabase 테이블 생성**: Supabase 대시보드 > SQL Editor에서 `supabase/migrations/` 안의 SQL을 순서대로 실행
2. **로그인 계정 만들기**: Authentication > Users > Add user (이메일·비밀번호, "Auto Confirm" 체크)
   - 혼자 쓰므로 Authentication > Sign In / Providers에서 "Allow new users to sign up"은 끄는 것을 권장
3. **환경변수**: `.env.example`을 `.env.local`로 복사하고 Project Settings > API의 URL과 anon key 입력
4. 실행:

```bash
npm install
npm run dev   # http://localhost:3000
```
