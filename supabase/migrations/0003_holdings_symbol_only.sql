-- 종목 코드만으로 등록할 수 있도록 수량·평단가를 선택 항목으로 변경
alter table public.holdings alter column shares drop not null;
alter table public.holdings alter column avg_cost drop not null;
