create extension if not exists "pgcrypto";

create type org_type as enum ('manager','owner_direct');
create type member_role as enum ('owner','admin','manager','accountant','staff');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type org_type not null default 'manager',
  currency text not null default 'KES',
  default_commission_rate numeric(5,2) not null default 10.00,
  created_at timestamptz not null default now()
);

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'staff',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  id_number text,
  commission_rate numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);

create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org_id and user_id = auth.uid()
  );
$$;

create or replace function has_org_role(target_org_id uuid, allowed_roles member_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org_id and user_id = auth.uid() and role = any(allowed_roles)
  );
$$;

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table clients enable row level security;

create policy "org members can view their orgs" on organizations for select using (is_org_member(id));
create policy "owners/admins can update org" on organizations for update using (has_org_role(id, array['owner','admin']::member_role[]));

create policy "members can view org membership" on org_members for select using (is_org_member(org_id));
create policy "admins can add members" on org_members for insert with check (has_org_role(org_id, array['owner','admin']::member_role[]));
create policy "admins can update members" on org_members for update using (has_org_role(org_id, array['owner','admin']::member_role[]));
create policy "admins can remove members" on org_members for delete using (has_org_role(org_id, array['owner','admin']::member_role[]));

create policy "members can view clients" on clients for select using (is_org_member(org_id));
create policy "staff can insert clients" on clients for insert with check (is_org_member(org_id));
create policy "staff can update clients" on clients for update using (is_org_member(org_id));
create policy "admins can delete clients" on clients for delete using (has_org_role(org_id, array['owner','admin','manager']::member_role[]));
