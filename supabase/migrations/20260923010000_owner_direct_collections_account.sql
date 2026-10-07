-- For an owner-direct org there's no separate owner to owe money to — the
-- 2200 liability is really just their own collected funds. Name it
-- accordingly at seed time so the chart of accounts, journal entries, and
-- anywhere else that reads accounts.name are correct without extra UI logic.
drop function if exists seed_default_accounts(uuid);

create or replace function seed_default_accounts(p_org_id uuid, p_org_type org_type)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into accounts (org_id, code, name, type) values
    (p_org_id, '1000', 'Cash and Bank', 'asset'),
    (p_org_id, '2100', 'Security Deposits Held', 'liability'),
    (p_org_id, '2200', case when p_org_type = 'owner_direct' then 'Collections' else 'Due to Property Owners' end, 'liability'),
    (p_org_id, '4900', 'Commission Income', 'income'),
    (p_org_id, '5000', 'Maintenance Expense', 'expense'),
    (p_org_id, '5100', 'Payroll Expense', 'expense'),
    (p_org_id, '5200', 'Stationery Expense', 'expense'),
    (p_org_id, '5900', 'General / Office Expense', 'expense')
  on conflict (org_id, code) do nothing;
end;
$$;

create or replace function create_organization(org_name text, org_kind org_type)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name, org_type, default_commission_rate)
    values (org_name, org_kind, case when org_kind = 'owner_direct' then 0 else 10.00 end)
    returning id into new_org_id;
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

  perform seed_default_accounts(new_org_id, org_kind);

  return new_org_id;
end;
$$;
