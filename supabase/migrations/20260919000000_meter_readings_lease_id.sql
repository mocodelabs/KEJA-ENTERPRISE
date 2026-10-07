alter table public.meter_readings
  add column lease_id uuid references public.leases(id) on delete set null;

create index idx_meter_readings_lease_id on public.meter_readings(lease_id);

-- Backfill existing unbilled readings against whichever lease is currently
-- active on the unit, on a best-effort basis (can't know who was leasing at
-- the time historically for already-billed rows, so those are left null).
update public.meter_readings mr
set lease_id = l.id
from public.leases l
where mr.lease_id is null
  and mr.billed = false
  and l.unit_id = mr.unit_id
  and l.status = 'active';
