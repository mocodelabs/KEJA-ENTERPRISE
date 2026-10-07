create type maintenance_bill_target as enum ('tenant', 'landlord', 'expense');

alter table public.maintenance_records
  add column billed_to maintenance_bill_target not null default 'landlord',
  add column billed boolean not null default false,
  add column expense_id uuid references public.expenses(id) on delete set null;

create index idx_maintenance_records_expense_id on public.maintenance_records(expense_id);
