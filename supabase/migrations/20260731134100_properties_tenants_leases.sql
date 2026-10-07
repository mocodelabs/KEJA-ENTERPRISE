create type property_type as enum ('residential','commercial','mixed_use');
create type unit_status as enum ('vacant','occupied','maintenance');
create type lease_status as enum ('active','ended','terminated');

create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  name text not null,
  property_type property_type not null default 'residential',
  address text,
  city text,
  commission_rate numeric(5,2),
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  unit_no text not null,
  bedrooms int,
  rent_amount numeric(12,2) not null default 0,
  status unit_status not null default 'vacant',
  created_at timestamptz not null default now(),
  unique (property_id, unit_no)
);

create table tenants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  id_number text,
  emergency_contact text,
  created_at timestamptz not null default now()
);

create table leases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  start_date date not null,
  end_date date,
  rent_amount numeric(12,2) not null,
  deposit_amount numeric(12,2) not null default 0,
  billing_day int not null default 1,
  status lease_status not null default 'active',
  created_at timestamptz not null default now()
);
