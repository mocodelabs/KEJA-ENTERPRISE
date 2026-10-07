-- Owner-direct orgs manage their own property, so there's no commission to
-- take — start them at 0% instead of the manager-oriented table default.
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

  perform seed_default_accounts(new_org_id);

  return new_org_id;
end;
$$;
