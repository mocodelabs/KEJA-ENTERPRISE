alter table public.stationery_items add column unit_cost numeric;
alter table public.stationery_transactions add column expense_id uuid references public.expenses(id) on delete set null;
create index idx_stationery_transactions_expense_id on public.stationery_transactions(expense_id);
