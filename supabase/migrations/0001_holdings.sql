-- 보유 종목. 사용자별로 분리되며 RLS로 본인 데이터만 접근 가능.
create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null check (symbol = upper(symbol) and length(symbol) between 1 and 10),
  shares numeric(18, 6) not null check (shares > 0),
  avg_cost numeric(18, 4) not null check (avg_cost >= 0),
  target_weight numeric(5, 2) check (target_weight between 0 and 100),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table public.holdings enable row level security;

create policy "holdings_owner_all" on public.holdings
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
