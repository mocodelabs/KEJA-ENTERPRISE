-- Keep invoice totals in sync with their line items
create or replace function recompute_invoice_total()
returns trigger
language plpgsql
as $$
declare
  target_invoice uuid;
begin
  target_invoice := coalesce(new.invoice_id, old.invoice_id);
  update invoices set total_amount = (
    select coalesce(sum(amount), 0) from invoice_items where invoice_id = target_invoice
  ) where id = target_invoice;
  return null;
end;
$$;

create trigger trg_invoice_items_totals
after insert or update or delete on invoice_items
for each row execute function recompute_invoice_total();

-- Apply a payment to its invoice (updates amount_paid / status automatically)
create or replace function apply_payment_to_invoice()
returns trigger
language plpgsql
as $$
begin
  update invoices
    set amount_paid = amount_paid + new.amount,
        status = case
          when amount_paid + new.amount >= total_amount and total_amount > 0 then 'paid'
          when amount_paid + new.amount > 0 then 'partial'
          else status
        end
    where id = new.invoice_id;
  return new;
end;
$$;

create trigger trg_payment_apply
after insert on payments
for each row execute function apply_payment_to_invoice();

-- Auto-generate a receipt the moment a payment is recorded
create or replace function create_receipt_for_payment()
returns trigger
language plpgsql
as $$
declare
  seq_no int;
  rno text;
begin
  select count(*) + 1 into seq_no from receipts where org_id = new.org_id;
  rno := 'RCT-' || to_char(now(), 'YYYY') || '-' || lpad(seq_no::text, 5, '0');
  insert into receipts (org_id, payment_id, receipt_no) values (new.org_id, new.id, rno);
  return new;
end;
$$;

create trigger trg_payment_receipt
after insert on payments
for each row execute function create_receipt_for_payment();

-- Keep stationery stock levels in sync with transactions
create or replace function apply_stationery_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.txn_type = 'in' then
    update stationery_items set quantity_on_hand = quantity_on_hand + new.quantity where id = new.item_id;
  else
    update stationery_items set quantity_on_hand = quantity_on_hand - new.quantity where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger trg_stationery_txn
after insert on stationery_transactions
for each row execute function apply_stationery_transaction();

-- Bootstrap a new organization: creates it, makes the caller its owner,
-- and seeds sensible defaults (message templates, penalty/reminder rules).
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

  return new_org_id;
end;
$$;
