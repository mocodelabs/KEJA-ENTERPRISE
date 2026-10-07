-- Refactor the payment/payroll/reconciliation trigger bodies into plain
-- functions (matching post_expense_entry's shape) so the same posting logic
-- can be reused both by the trigger and by the one-time backfill below, for
-- activity that existed before the ledger did.

create or replace function post_payment_entry(p_payment payments)
returns void
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
  where i.id = p_payment.invoice_id;

  perform post_journal_entry(
    p_payment.org_id,
    p_payment.paid_at::date,
    'Payment received',
    'payment',
    p_payment.id,
    jsonb_build_array(
      jsonb_build_object('account_code', '1000', 'property_id', v_property_id, 'debit', p_payment.amount, 'credit', 0),
      jsonb_build_object('account_code', '2200', 'property_id', v_property_id, 'debit', 0, 'credit', p_payment.amount)
    )
  );
end;
$$;

create or replace function trg_apply_payment_to_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform post_payment_entry(new);
  return new;
end;
$$;

create or replace function post_payroll_entry(p_run payroll_runs)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_run.total_net > 0 then
    perform post_journal_entry(
      p_run.org_id,
      coalesce(p_run.processed_at::date, current_date),
      'Payroll run processed',
      'payroll_run',
      p_run.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '5100', 'property_id', null, 'debit', p_run.total_net, 'credit', 0),
        jsonb_build_object('account_code', '1000', 'property_id', null, 'debit', 0, 'credit', p_run.total_net)
      )
    );
  end if;
end;
$$;

create or replace function trg_apply_payroll_processed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'processed' and old.status is distinct from 'processed' then
    perform post_payroll_entry(new);
  end if;
  return new;
end;
$$;

create or replace function post_commission_reconciliation_entry(p_ledger commission_ledger)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ledger.commission_amount > 0 then
    perform post_journal_entry(
      p_ledger.org_id,
      coalesce(p_ledger.reconciled_at::date, current_date),
      'Commission recognized on reconciliation',
      'reconciliation',
      p_ledger.id,
      jsonb_build_array(
        jsonb_build_object('account_code', '2200', 'property_id', p_ledger.property_id, 'debit', p_ledger.commission_amount, 'credit', 0),
        jsonb_build_object('account_code', '4900', 'property_id', null, 'debit', 0, 'credit', p_ledger.commission_amount)
      )
    );
  end if;
end;
$$;

create or replace function trg_apply_commission_reconciled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'reconciled' and old.status is distinct from 'reconciled' then
    perform post_commission_reconciliation_entry(new);
  end if;
  return new;
end;
$$;

-- One-time backfill for activity recorded before the ledger existed,
-- in chronological order so account balances read correctly afterwards.
do $$
declare
  r_payment payments%rowtype;
  r_expense expenses%rowtype;
  r_payroll payroll_runs%rowtype;
  r_ledger commission_ledger%rowtype;
begin
  for r_payment in select * from payments order by paid_at loop
    perform post_payment_entry(r_payment);
  end loop;

  for r_expense in select * from expenses order by expense_date loop
    perform post_expense_entry(r_expense);
  end loop;

  for r_payroll in select * from payroll_runs where status = 'processed' order by coalesce(processed_at, created_at) loop
    perform post_payroll_entry(r_payroll);
  end loop;

  for r_ledger in select * from commission_ledger where status = 'reconciled' order by coalesce(reconciled_at, created_at) loop
    perform post_commission_reconciliation_entry(r_ledger);
  end loop;
end $$;
