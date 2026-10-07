create table public.lease_terminations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  lease_id uuid not null unique references public.leases(id) on delete cascade,
  termination_date date not null default current_date,
  deposit_amount numeric not null default 0,
  arrears numeric not null default 0,
  water_deduction numeric not null default 0,
  electricity_deduction numeric not null default 0,
  notes text,
  total_deductions numeric not null default 0,
  refund_amount numeric not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.lease_termination_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  termination_id uuid not null references public.lease_terminations(id) on delete cascade,
  category text not null check (category in ('maintenance','other')),
  description text not null,
  cost numeric not null default 0
);

create index idx_lease_terminations_org_id on public.lease_terminations(org_id);
create index idx_lease_terminations_lease_id on public.lease_terminations(lease_id);
create index idx_lease_termination_items_org_id on public.lease_termination_items(org_id);
create index idx_lease_termination_items_termination_id on public.lease_termination_items(termination_id);

alter table public.lease_terminations enable row level security;
alter table public.lease_termination_items enable row level security;

create policy "select_org_members" on public.lease_terminations for select using (is_org_member(org_id));
create policy "insert_org_members" on public.lease_terminations for insert with check (is_org_member(org_id));
create policy "update_org_members" on public.lease_terminations for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "delete_org_admins" on public.lease_terminations for delete using (has_org_role(org_id, array['owner','admin','manager']::member_role[]));

create policy "select_org_members" on public.lease_termination_items for select using (is_org_member(org_id));
create policy "insert_org_members" on public.lease_termination_items for insert with check (is_org_member(org_id));
create policy "update_org_members" on public.lease_termination_items for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "delete_org_admins" on public.lease_termination_items for delete using (has_org_role(org_id, array['owner','admin','manager']::member_role[]));
