-- General ledger: chart of accounts + double-entry journal, wired automatically
-- off the existing money-moving tables (payments, expenses, payroll, reconciliation).
--
-- Model: this is a trust-accounting ledger for a property MANAGEMENT company.
-- Rent collected belongs to the property owner until the org's commission is
-- taken, so payments credit "Due to Property Owners" (a liability), not income,
-- and property-linked expenses debit that same liability (they're paid out of
-- the owner's funds). The org's own revenue is Commission Income, recognized
-- only when a reconciliation is marked "reconciled". Non-property expenses
-- (payroll, stationery, general/office) are the org's own expenses.
--
-- Known limitations (not wired in this pass): security deposits are not
-- tracked as a distinct cash event today (no payment type distinguishes a
-- deposit from rent), so deposit intake/refunds and equipment purchases are
-- not posted. The 2100 account is seeded for future use.

create type account_type as enum ('asset', 'liability', 'equity', 'income', 'expense');

create table accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  code text not null,
  name text not null,
  type account_type not null,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entry_date date not null,
  memo text,
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references accounts(id),
  property_id uuid references properties(id) on delete set null,
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check (not (debit > 0 and credit > 0))
);

create index idx_accounts_org_id on accounts(org_id);
create index idx_journal_entries_org_id on journal_entries(org_id);
create index idx_journal_entries_source on journal_entries(source_type, source_id);
create index idx_journal_lines_org_id on journal_lines(org_id);
create index idx_journal_lines_entry_id on journal_lines(entry_id);
create index idx_journal_lines_account_id on journal_lines(account_id);
create index idx_journal_lines_property_id on journal_lines(property_id);

alter table accounts enable row level security;
alter table journal_entries enable row level security;
alter table journal_lines enable row level security;

create policy "select_org_members" on accounts for select using (is_org_member(org_id));
create policy "select_org_members" on journal_entries for select using (is_org_member(org_id));
create policy "select_org_members" on journal_lines for select using (is_org_member(org_id));

-- Journal rows are only ever written through post_journal_entry()/reverse_latest_entry()
-- below, triggered off the source tables — never inserted/edited directly by clients.

-- Seeds the standard chart of accounts for one org (called on org creation and once for existing orgs).
create or replace function seed_default_accounts(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into accounts (org_id, code, name, type) values
    (p_org_id, '1000', 'Cash and Bank', 'asset'),
    (p_org_id, '2100', 'Security Deposits Held', 'liability'),
    (p_org_id, '2200', 'Due to Property Owners', 'liability'),
    (p_org_id, '4900', 'Commission Income', 'income'),
    (p_org_id, '5000', 'Maintenance Expense', 'expense'),
    (p_org_id, '5100', 'Payroll Expense', 'expense'),
    (p_org_id, '5200', 'Stationery Expense', 'expense'),
    (p_org_id, '5900', 'General / Office Expense', 'expense')
  on conflict (org_id, code) do nothing;
end;
$$;

select seed_default_accounts(id) from organizations;

-- Posts one balanced journal entry. p_lines is a jsonb array of
-- {account_code, property_id, debit, credit}. Raises if debits <> credits
-- or an account_code doesn't exist for the org.
create or replace function post_journal_entry(
  p_org_id uuid,
  p_entry_date date,
  p_memo text,
  p_source_type text,
  p_source_id uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_total_debit numeric(14,2);
  v_total_credit numeric(14,2);
  v_line jsonb;
  v_account_id uuid;
begin
  select coalesce(sum((l->>'debit')::numeric), 0), coalesce(sum((l->>'credit')::numeric), 0)
    into v_total_debit, v_total_credit
    from jsonb_array_elements(p_lines) l;

  if round(v_total_debit, 2) <> round(v_total_credit, 2) then
    raise exception 'Journal entry not balanced: debit % <> credit % (source %/%)', v_total_debit, v_total_credit, p_source_type, p_source_id;
  end if;

  if v_total_debit = 0 then
    return null;
  end if;

  insert into journal_entries (org_id, entry_date, memo, source_type, source_id)
    values (p_org_id, p_entry_date, p_memo, p_source_type, p_source_id)
    returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select id into v_account_id from accounts where org_id = p_org_id and code = (v_line->>'account_code');
    if v_account_id is null then
      raise exception 'Unknown account code % for org %', (v_line->>'account_code'), p_org_id;
    end if;

    insert into journal_lines (org_id, entry_id, account_id, property_id, debit, credit)
      values (
        p_org_id,
        v_entry_id,
        v_account_id,
        nullif(v_line->>'property_id', '')::uuid,
        coalesce((v_line->>'debit')::numeric, 0),
        coalesce((v_line->>'credit')::numeric, 0)
      );
  end loop;

  return v_entry_id;
end;
$$;

-- Reverses the most recent not-yet-reversed entry for a given source (used
-- when an expense is edited or deleted, so the ledger never goes stale).
create or replace function reverse_latest_entry(p_source_type text, p_source_id uuid, p_memo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry journal_entries%rowtype;
  v_new_entry_id uuid;
begin
  select * into v_entry from journal_entries
    where source_type = p_source_type and source_id = p_source_id
    order by created_at desc
    limit 1;

  if v_entry.id is null then
    return;
  end if;

  insert into journal_entries (org_id, entry_date, memo, source_type, source_id)
    values (v_entry.org_id, current_date, coalesce(p_memo, 'Reversal'), p_source_type || '_reversal', p_source_id)
    returning id into v_new_entry_id;

  insert into journal_lines (org_id, entry_id, account_id, property_id, debit, credit)
    select org_id, v_new_entry_id, account_id, property_id, credit, debit
    from journal_lines where entry_id = v_entry.id;
end;
$$;

-- Payments: full amount collected is held for the owner until reconciled.
create or replace function trg_apply_payment_to_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
begin
  select u.property_id into v_property_id
  from invoices i
  join leases l on l.id = i.lease_id
  join units u on u.id = l.unit_id
  where i.id = new.invoice_id;

  perform post_journal_entry(
    new.org_id,
    new.paid_at::date,
    'Payment received',
    'payment',
    new.id,
    jsonb_build_array(
      jsonb_build_object('account_code', '1000', 'property_id', v_property_id, 'debit', new.amount, 'credit', 0),
      jsonb_build_object('account_code', '2200', 'property_id', v_property_id, 'debit', 0, 'credit', new.amount)
    )
  );
  return new;
end;
$$;

create trigger trg_payment_ledger after insert on payments
for each row execute function trg_apply_payment_to_ledger();

-- Expenses: property-linked expenses draw down what's owed to that owner;
-- expenses with no property are the org's own (mapped to an expense account by category).
create or replace function post_expense_entry(p_expense expenses)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_account text;
begin
  if p_expense.amount <= 0 then
    return;
  end if;

  if p_expense.property_id is not null then
    perform post_journal_entry(
      p_expense.org_id,
      p_expense.expense_date,
      coalesce(p_expense.description, p_expense.category),
      'expense',
      p_expense.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '2200', 'property_id', p_expense.property_id, 'debit', p_expense.amount, 'credit', 0),
        jsonb_build_object('account_code', '1000', 'property_id', p_expense.property_id, 'debit', 0, 'credit', p_expense.amount)
      )
    );
  else
    v_expense_account := case
      when p_expense.category ilike '%stationery%' then '5200'
      when p_expense.category ilike '%maintenance%' then '5000'
      else '5900'
    end;
    perform post_journal_entry(
      p_expense.org_id,
      p_expense.expense_date,
      coalesce(p_expense.description, p_expense.category),
      'expense',
      p_expense.id,
      jsonb_build_array(
        jsonb_build_object('account_code', v_expense_account, 'property_id', null, 'debit', p_expense.amount, 'credit', 0),
        jsonb_build_object('account_code', '1000', 'property_id', null, 'debit', 0, 'credit', p_expense.amount)
      )
    );
  end if;
end;
$$;

create or replace function trg_apply_expense_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform post_expense_entry(new);
  return new;
end;
$$;

create or replace function trg_apply_expense_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform reverse_latest_entry('expense', old.id, 'Reversal — expense updated');
  perform post_expense_entry(new);
  return new;
end;
$$;

create or replace function trg_apply_expense_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform reverse_latest_entry('expense', old.id, 'Reversal — expense deleted');
  return old;
end;
$$;

create trigger trg_expense_ledger_insert after insert on expenses
for each row execute function trg_apply_expense_insert();
create trigger trg_expense_ledger_update after update on expenses
for each row execute function trg_apply_expense_update();
create trigger trg_expense_ledger_delete after delete on expenses
for each row execute function trg_apply_expense_delete();

-- Payroll: posts once, the moment a run flips to 'processed'.
create or replace function trg_apply_payroll_processed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'processed' and old.status is distinct from 'processed' and new.total_net > 0 then
    perform post_journal_entry(
      new.org_id,
      coalesce(new.processed_at::date, current_date),
      'Payroll run processed',
      'payroll_run',
      new.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '5100', 'property_id', null, 'debit', new.total_net, 'credit', 0),
        jsonb_build_object('account_code', '1000', 'property_id', null, 'debit', 0, 'credit', new.total_net)
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_payroll_ledger after update on payroll_runs
for each row execute function trg_apply_payroll_processed();

-- Reconciliation: the moment a property/period is confirmed reconciled, the
-- org's commission is recognized as its own income out of what it owes the owner.
create or replace function trg_apply_commission_reconciled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'reconciled' and old.status is distinct from 'reconciled' and new.commission_amount > 0 then
    perform post_journal_entry(
      new.org_id,
      coalesce(new.reconciled_at::date, current_date),
      'Commission recognized on reconciliation',
      'reconciliation',
      new.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '2200', 'property_id', new.property_id, 'debit', new.commission_amount, 'credit', 0),
        jsonb_build_object('account_code', '4900', 'property_id', null, 'debit', 0, 'credit', new.commission_amount)
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_commission_ledger_reconciled after update on commission_ledger
for each row execute function trg_apply_commission_reconciled();

-- Seed new orgs going forward.
create or replace function create_organization(org_name text, org_kind org_type)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name, org_type) values (org_name, org_kind) returning id into new_org_id;
  insert into org_members (org_id, user_id, role, full_name)
    values (new_org_id, auth.uid(), 'owner', (select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid()));

  insert into message_templates (org_id, name, template_type, body) values
    (new_org_id, 'Rent Due', 'rent_due', 'Hi {{tenant_name}}, your rent of {{amount}} for {{property_name}} unit {{unit_no}} was due on {{due_date}}. Balance: {{balance}}. Pay via M-Pesa Paybill.'),
    (new_org_id, 'Partial Payment Reminder', 'partial_reminder', 'Hi {{tenant_name}}, thank you for your part payment. Outstanding balance of {{balance}} for {{property_name}} unit {{unit_no}} is still pending. Kindly clear soon.'),
    (new_org_id, 'Penalty Applied', 'penalty', 'Hi {{tenant_name}}, a late payment penalty of {{amount}} has been applied to your account for {{property_name}} unit {{unit_no}}. New balance: {{balance}}.'),
    (new_org_id, 'General Notice', 'notice', 'Notice from {{property_name}} management: {{message}}'),
    (new_org_id, 'Payment Receipt', 'receipt', 'Hi {{tenant_name}}, we have received your payment of {{amount}} for {{property_name}} unit {{unit_no}}. Receipt No: {{receipt_no}}. Thank you!');

  insert into penalty_rules (org_id, grace_period_days, penalty_kind, penalty_value)
    values (new_org_id, 5, 'flat', 500);

  insert into reminder_rules (org_id, trigger_type, repeat_every_days) values
    (new_org_id, 'rent_due', 3),
    (new_org_id, 'partial_payment', 7);

  perform seed_default_accounts(new_org_id);

  return new_org_id;
end;
$$;
