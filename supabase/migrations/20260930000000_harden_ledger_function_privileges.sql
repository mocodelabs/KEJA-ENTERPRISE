-- SECURITY: the ledger-posting functions are SECURITY DEFINER and had no caller checks, yet
-- EXECUTE was granted to PUBLIC/anon/authenticated (the Postgres default), so anyone holding
-- the public anon key could call them over PostgREST (/rest/v1/rpc/...) to forge or reverse
-- journal entries in ANY organisation. Lock them down:
--
--  * Internal posting helpers and trigger functions are only ever invoked by other
--    SECURITY DEFINER functions / triggers (which run as the function owner), so nobody
--    else needs EXECUTE on them.
--  * post_journal_entry is also called directly by the app (recordOwnerPayout), as the signed-in
--    user, so it stays executable by `authenticated` -- but now refuses anonymous callers and
--    signed-in users who are not members of the organisation being posted to. Calls from
--    triggers fired by a legitimate user, the service role (webhooks, edge function) and
--    direct database sessions (cron, migrations) keep working.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and (
        p.proname in (
          'post_commission_reconciliation_entry',
          'post_deposit_entry',
          'post_deposit_settlement_entry',
          'post_expense_entry',
          'post_payment_entry',
          'post_payroll_entry',
          'reverse_latest_entry',
          'seed_default_accounts'
        )
        or p.proname like 'trg\_apply\_%'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

create or replace function public.post_journal_entry(
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
set search_path to 'public'
as $function$
declare
  v_entry_id uuid;
  v_total_debit numeric(14,2);
  v_total_credit numeric(14,2);
  v_line jsonb;
  v_account_id uuid;
begin
  if auth.role() = 'anon' then
    raise exception 'Not authorised';
  end if;
  if auth.uid() is not null and not is_org_member(p_org_id) then
    raise exception 'Not authorised for this organisation';
  end if;

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
$function$;

revoke execute on function public.post_journal_entry(uuid, date, text, text, uuid, jsonb) from public, anon;
grant execute on function public.post_journal_entry(uuid, date, text, text, uuid, jsonb) to authenticated;

-- Creating an organisation needs a signed-in user (it records auth.uid() as the owner).
revoke execute on function public.create_organization(text, org_type, text, text) from public, anon;
grant execute on function public.create_organization(text, org_type, text, text) to authenticated;
