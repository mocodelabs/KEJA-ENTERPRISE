-- Security deposits: capture the deposit as held when a lease starts, and
-- settle it (refund and/or deductions) when the termination is confirmed
-- refunded. Wired the same way as the rest of the ledger — via triggers on
-- the source tables, never inserted directly by app code.

alter table lease_terminations add column refunded boolean not null default false;
alter table lease_terminations add column refunded_at timestamptz;

-- Deposit collected: posts once per lease, for whatever deposit_amount is
-- set at that moment (re-posts the delta if it's edited before termination).
create or replace function post_deposit_entry(p_lease leases)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
begin
  select u.property_id into v_property_id from units u where u.id = p_lease.unit_id;

  perform post_journal_entry(
    p_lease.org_id,
    p_lease.start_date,
    'Security deposit collected',
    'deposit',
    p_lease.id,
    jsonb_build_array(
      jsonb_build_object('account_code', '1000', 'property_id', v_property_id, 'debit', p_lease.deposit_amount, 'credit', 0),
      jsonb_build_object('account_code', '2100', 'property_id', v_property_id, 'debit', 0, 'credit', p_lease.deposit_amount)
    )
  );
end;
$$;

create or replace function trg_apply_lease_deposit_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deposit_amount > 0 then
    perform post_deposit_entry(new);
  end if;
  return new;
end;
$$;

create or replace function trg_apply_lease_deposit_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deposit_amount is distinct from old.deposit_amount then
    perform reverse_latest_entry('deposit', old.id, 'Reversal — deposit amount changed');
    if new.deposit_amount > 0 then
      perform post_deposit_entry(new);
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_lease_deposit_insert after insert on leases
for each row execute function trg_apply_lease_deposit_insert();
create trigger trg_lease_deposit_update after update of deposit_amount on leases
for each row execute function trg_apply_lease_deposit_update();

-- Deposit settled: the moment a termination is confirmed refunded, the held
-- deposit clears — cash goes back to the tenant for whatever's left after
-- deductions, and the owner recovers the deducted portion (arrears, damage,
-- utility shortfalls) exactly as if it were a payment.
create or replace function post_deposit_settlement_entry(p_termination lease_terminations)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_refund numeric(12,2);
  v_recovered numeric(12,2);
  v_lines jsonb;
begin
  if p_termination.deposit_amount <= 0 then
    return;
  end if;

  select u.property_id into v_property_id
  from leases l join units u on u.id = l.unit_id
  where l.id = p_termination.lease_id;

  v_refund := greatest(p_termination.refund_amount, 0);
  v_recovered := p_termination.deposit_amount - v_refund;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '2100', 'property_id', v_property_id, 'debit', p_termination.deposit_amount, 'credit', 0)
  );
  if v_refund > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_code', '1000', 'property_id', v_property_id, 'debit', 0, 'credit', v_refund)
    );
  end if;
  if v_recovered > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_code', '2200', 'property_id', v_property_id, 'debit', 0, 'credit', v_recovered)
    );
  end if;

  perform post_journal_entry(
    p_termination.org_id,
    coalesce(p_termination.refunded_at::date, p_termination.termination_date),
    'Security deposit settled on termination',
    'deposit_settlement',
    p_termination.id,
    v_lines
  );
end;
$$;

create or replace function trg_apply_deposit_refunded()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.refunded = true and old.refunded is distinct from true then
    perform post_deposit_settlement_entry(new);
  end if;
  return new;
end;
$$;

create trigger trg_lease_termination_refunded after update of refunded on lease_terminations
for each row execute function trg_apply_deposit_refunded();

-- Backfill: leases already carrying a deposit didn't post one when this
-- feature didn't exist yet.
do $$
declare
  r_lease leases%rowtype;
begin
  for r_lease in select * from leases where deposit_amount > 0 order by start_date loop
    perform post_deposit_entry(r_lease);
  end loop;
end $$;
