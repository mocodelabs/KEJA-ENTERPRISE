create table public.property_blocks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  floor_count integer not null check (floor_count >= 1),
  created_at timestamptz not null default now(),
  unique (property_id, name)
);

create index idx_property_blocks_org_id on public.property_blocks(org_id);
create index idx_property_blocks_property_id on public.property_blocks(property_id);

alter table public.property_blocks enable row level security;

create policy "select_org_members" on public.property_blocks
  for select using (is_org_member(org_id));
create policy "insert_org_members" on public.property_blocks
  for insert with check (is_org_member(org_id));
create policy "update_org_members" on public.property_blocks
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "delete_org_admins" on public.property_blocks
  for delete using (has_org_role(org_id, array['owner','admin','manager']::member_role[]));

alter table public.properties
  drop column block_count,
  drop column floors_per_block;
