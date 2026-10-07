create type meter_type as enum ('water','electricity','gas');
create type penalty_kind as enum ('flat','percentage');
create type invoice_status as enum ('draft','sent','partial','paid','overdue','void');
create type invoice_item_type as enum ('rent','utility','penalty','other');
create type payment_method as enum ('mpesa','bank','cash','card','other');
create type quote_status as enum ('draft','sent','accepted','declined','expired');

create table meter_readings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  meter_type meter_type not null,
  reading_date date not null default current_date,
  previous_reading numeric(12,2) not null default 0,
  current_reading numeric(12,2) not null,
  rate_per_unit numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table penalty_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  grace_period_days int not null default 5,
  penalty_kind penalty_kind not null default 'flat',
  penalty_value numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table reminder_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  trigger_type text not null default 'rent_due',
  repeat_every_days int not null default 7,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  status invoice_status not null default 'draft',
  penalty_applied boolean not null default false,
  last_reminder_sent_at timestamptz,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  item_type invoice_item_type not null default 'rent',
  description text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method payment_method not null default 'mpesa',
  reference text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  receipt_no text not null,
  sent_at timestamptz,
  channel text,
  created_at timestamptz not null default now(),
  unique (org_id, receipt_no)
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  property_id uuid references properties(id) on delete set null,
  quote_no text not null,
  status quote_status not null default 'draft',
  valid_until date,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, quote_no)
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null
);

create table credit_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  credit_note_no text not null,
  reason text,
  amount numeric(12,2) not null,
  issued_at timestamptz not null default now(),
  unique (org_id, credit_note_no)
);
