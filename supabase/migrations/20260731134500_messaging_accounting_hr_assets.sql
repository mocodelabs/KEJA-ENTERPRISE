create type template_type as enum ('rent_due','partial_reminder','penalty','notice','receipt','custom');
create type message_channel as enum ('sms','email');
create type message_status as enum ('queued','sent','failed');
create type reconciliation_status as enum ('pending','reconciled');
create type employee_status as enum ('active','inactive','terminated');
create type payroll_status as enum ('draft','approved','processed');
create type equipment_status as enum ('in_use','in_storage','maintenance','disposed');
create type stationery_txn_type as enum ('in','out');

create table message_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  template_type template_type not null default 'custom',
  body text not null,
  created_at timestamptz not null default now()
);

create table messages_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  template_id uuid references message_templates(id) on delete set null,
  channel message_channel not null default 'sms',
  recipient text not null,
  body text not null,
  status message_status not null default 'queued',
  batch_id uuid,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  category text not null,
  description text,
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  receipt_url text,
  created_at timestamptz not null default now()
);

create table commission_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_revenue numeric(12,2) not null default 0,
  commission_rate numeric(5,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  total_expenses numeric(12,2) not null default 0,
  net_to_owner numeric(12,2) not null default 0,
  status reconciliation_status not null default 'pending',
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (property_id, period_start, period_end)
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  job_title text,
  email text,
  phone text,
  salary numeric(12,2) not null default 0,
  hire_date date,
  status employee_status not null default 'active',
  created_at timestamptz not null default now()
);

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status payroll_status not null default 'draft',
  approved_by uuid references org_members(id) on delete set null,
  approved_at timestamptz,
  processed_at timestamptz,
  total_net numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table payroll_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  gross_amount numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text,
  purchase_date date,
  value numeric(12,2),
  status equipment_status not null default 'in_use',
  assigned_to text,
  created_at timestamptz not null default now()
);

create table stationery_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  unit text not null default 'pcs',
  quantity_on_hand numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table stationery_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  item_id uuid not null references stationery_items(id) on delete cascade,
  txn_type stationery_txn_type not null,
  quantity numeric(12,2) not null,
  txn_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
