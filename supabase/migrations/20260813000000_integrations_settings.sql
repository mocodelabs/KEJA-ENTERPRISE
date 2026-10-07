create type payment_provider as enum (
  'bank_account',
  'mpesa_paybill',
  'mpesa_till',
  'kopokopo',
  'paypal',
  'pesapal',
  'paystack'
);

create type sms_provider as enum ('console', 'africastalking', 'twilio', 'custom');
create type whatsapp_provider as enum ('console', 'whatsapp_cloud_api', 'twilio_whatsapp', 'custom');

create table payment_gateways (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider payment_provider not null,
  display_name text,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider)
);

create table sms_gateway_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  provider sms_provider not null default 'console',
  api_key text,
  api_secret text,
  sender_id text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table whatsapp_gateway_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  provider whatsapp_provider not null default 'console',
  phone_number_id text,
  access_token text,
  business_account_id text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table messages_log alter column channel drop default;
alter type message_channel add value 'whatsapp';
alter table messages_log alter column channel set default 'sms';
