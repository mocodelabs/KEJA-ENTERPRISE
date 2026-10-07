alter table public.units
  add column block_id uuid references public.property_blocks(id) on delete set null,
  add column floor integer;

alter table public.units
  add constraint units_floor_check check (floor is null or floor >= 1);

create index idx_units_block_id on public.units(block_id);
