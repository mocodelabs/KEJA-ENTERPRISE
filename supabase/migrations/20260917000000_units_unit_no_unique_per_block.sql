alter table public.units drop constraint units_property_id_unit_no_key;

create unique index units_property_unit_no_no_block_key
  on public.units (property_id, unit_no)
  where block_id is null;

create unique index units_property_block_unit_no_key
  on public.units (property_id, block_id, unit_no)
  where block_id is not null;
