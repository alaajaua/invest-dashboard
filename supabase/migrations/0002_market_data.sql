-- 시장 데이터 캐시. 모든 사용자가 공유하며, 쓰기는 서버(service role)만 가능.
create table if not exists public.market_cache (
  key text primary key,            -- 예: daily:AAPL, news:portfolio, macro:CPI
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.market_cache enable row level security;

create policy "market_cache_read" on public.market_cache
  for select to authenticated using (true);

-- Alpha Vantage 일일 호출 수 (무료 키 25회/일, 미국 동부 기준이 아닌 UTC 날짜로 집계)
create table if not exists public.api_usage (
  day date primary key,
  calls int not null default 0
);

alter table public.api_usage enable row level security;

create policy "api_usage_read" on public.api_usage
  for select to authenticated using (true);
