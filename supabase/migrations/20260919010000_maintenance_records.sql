create type maintenance_issue_type as enum ('plumbing', 'electrical', 'structural', 'appliance', 'painting', 'pest_control', 'other');
create type maintenance_status as enum ('open', 'resolved');

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete set null,
  issue_type maintenance_issue_type not null default 'other',
  description text not null,
  cost numeric not null default 0,
  status maintenance_status not null default 'open',
  reported_date date not null default current_date,
  resolved_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_maintenance_records_org_id on public.maintenance_records(org_id);
create index idx_maintenance_records_unit_id on public.maintenance_records(unit_id);
create index idx_maintenance_records_lease_id on public.maintenance_records(lease_id);

alter table public.maintenance_records enable row level security;

create policy "select_org_members" on public.maintenance_records
  for select using (is_org_member(org_id));
create policy "insert_org_members" on public.maintenance_records
  for insert with check (is_org_member(org_id));
create policy "update_org_members" on public.maintenance_records
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "delete_org_admins" on public.maintenance_records
  for delete using (has_org_role(org_id, array['owner','admin','manager']::member_role[]));
