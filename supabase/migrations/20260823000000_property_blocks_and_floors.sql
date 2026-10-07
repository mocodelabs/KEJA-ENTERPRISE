alter table public.properties
  add column block_count integer not null default 1,
  add column floors_per_block integer not null default 1;

alter table public.properties
  add constraint properties_block_count_check check (block_count >= 1),
  add constraint properties_floors_per_block_check check (floors_per_block >= 1);
