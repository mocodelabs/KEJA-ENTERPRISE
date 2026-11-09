-- Public demo account: a shared, sign-in-with-one-click "Demo Property Management" organisation
-- full of realistic sample data, wiped and re-seeded every hour by pg_cron so visitors always
-- start from a clean slate (and anything they break or add disappears).
--
-- The demo user's credentials are intentionally not secret: anyone can become the demo user by
-- clicking "Try the live demo". What protects real data is that the user is a member of the demo
-- organisation only (RLS), and that reset_demo_data() also deletes any other organisation the
-- demo user creates. Keep the email/password in sync with src/lib/demo.ts.

create or replace function public.seed_demo_data(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_today date := current_date;
  m0 date := date_trunc('month', current_date)::date;
  m1 date := (date_trunc('month', current_date) - interval '1 month')::date;
  m2 date := (date_trunc('month', current_date) - interval '2 month')::date;
  c1 uuid; c2 uuid;
  p1 uuid; p2 uuid; p3 uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid;
  u record;
  r record;
  v_idx int := 0;
  v_prop uuid; v_block uuid; v_unit uuid; v_tenant uuid; v_lease uuid; v_inv uuid;
  v_start date; v_due date; v_pay_day date; v_ts timestamptz;
  v_total numeric; v_amt numeric; v_water numeric; v_prev numeric;
  v_method payment_method; v_ref text;
  v_gross numeric; v_exp numeric; v_rate numeric; v_comm numeric;
  mth date;
begin
  drop table if exists _demo_units;
  create temp table _demo_units (unit_no text primary key, unit_id uuid, lease_id uuid) on commit drop;

  -- Owners and properties ------------------------------------------------------------------
  insert into clients (org_id, full_name, email, phone, notes)
    values (p_org_id, 'Grace Njeri', null, '0700000001', 'Owns Riverside Apartments and Kijani Business Centre')
    returning id into c1;
  insert into clients (org_id, full_name, email, phone, notes)
    values (p_org_id, 'Samuel Otieno', null, '0700000002', 'Owns Mwangaza Court')
    returning id into c2;

  insert into properties (org_id, client_id, name, property_type, address, city, commission_rate)
    values (p_org_id, c1, 'Riverside Apartments', 'residential', 'Waiyaki Way, Westlands', 'Nairobi', 10)
    returning id into p1;
  insert into properties (org_id, client_id, name, property_type, address, city, commission_rate)
    values (p_org_id, c2, 'Mwangaza Court', 'residential', 'Argwings Kodhek Road, Kilimani', 'Nairobi', 8)
    returning id into p2;
  insert into properties (org_id, client_id, name, property_type, address, city, commission_rate)
    values (p_org_id, c1, 'Kijani Business Centre', 'commercial', 'Thika Road', 'Nairobi', 12)
    returning id into p3;

  insert into property_blocks (org_id, property_id, name, floor_count) values (p_org_id, p1, 'Block A', 3) returning id into b1;
  insert into property_blocks (org_id, property_id, name, floor_count) values (p_org_id, p1, 'Block B', 3) returning id into b2;
  insert into property_blocks (org_id, property_id, name, floor_count) values (p_org_id, p2, 'Main Block', 4) returning id into b3;
  insert into property_blocks (org_id, property_id, name, floor_count) values (p_org_id, p3, 'Tower', 3) returning id into b4;

  -- Units, tenants, leases, invoices, payments, meter readings ---------------------------------
  for u in
    select * from (values
      ('A1', 'p1', 'A', 1, 'bedsitter',    0, 12000, 'occupied',    'Wanjiru Kamau',   '0712000101'),
      ('A2', 'p1', 'A', 1, 'one_bedroom',  1, 18000, 'occupied',    'Brian Ochieng',   '0712000102'),
      ('A3', 'p1', 'A', 2, 'one_bedroom',  1, 18000, 'vacant',      null,              null),
      ('A4', 'p1', 'A', 2, 'two_bedroom',  2, 28000, 'occupied',    'Mercy Akinyi',    '0712000104'),
      ('B1', 'p1', 'B', 1, 'two_bedroom',  2, 30000, 'occupied',    'Daniel Mutua',    '0712000105'),
      ('B2', 'p1', 'B', 2, 'two_bedroom',  2, 30000, 'occupied',    'Esther Wambui',   '0712000106'),
      ('B3', 'p1', 'B', 3, 'three_bedroom',3, 42000, 'maintenance', null,              null),
      ('M1', 'p2', 'M', 1, 'bedsitter',    0, 10000, 'occupied',    'Kevin Mwangi',    '0712000107'),
      ('M2', 'p2', 'M', 1, 'one_bedroom',  1, 16000, 'occupied',    'Lucy Chebet',     '0712000108'),
      ('M3', 'p2', 'M', 2, 'one_bedroom',  1, 16000, 'occupied',    'Hassan Abdi',     '0712000109'),
      ('M4', 'p2', 'M', 3, 'two_bedroom',  2, 25000, 'occupied',    'Beatrice Naliaka','0712000110'),
      ('M5', 'p2', 'M', 4, 'studio',       0, 14000, 'vacant',      null,              null),
      ('M6', 'p2', 'M', 1, 'single_room',  0,  6500, 'occupied',    'Joseph Kiplagat', '0712000111'),
      ('S1', 'p3', 'T', 1, 'other',        0, 55000, 'occupied',    'Zawadi Pharmacy', '0712000112'),
      ('S2', 'p3', 'T', 2, 'other',        0, 40000, 'occupied',    'Tumaini Law Chambers', '0712000113'),
      ('S3', 'p3', 'T', 2, 'other',        0, 40000, 'occupied',    'Pwani Logistics', '0712000114'),
      ('S4', 'p3', 'T', 3, 'other',        0, 75000, 'occupied',    'Mawingu Telecom Agency', '0712000115')
    ) as t(unit_no, prop, blk, flr, utype, beds, rent, ustatus, tname, tphone)
  loop
    v_idx := v_idx + 1;
    v_prop := case u.prop when 'p1' then p1 when 'p2' then p2 else p3 end;
    v_block := case u.prop || u.blk when 'p1A' then b1 when 'p1B' then b2 when 'p2M' then b3 else b4 end;

    insert into units (org_id, property_id, block_id, floor, unit_no, bedrooms, rent_amount, status, unit_type)
      values (p_org_id, v_prop, v_block, u.flr, u.unit_no, u.beds, u.rent, u.ustatus::unit_status, u.utype::unit_type)
      returning id into v_unit;

    v_lease := null;

    if u.tname is not null then
      insert into tenants (org_id, full_name, phone)
        values (p_org_id, u.tname, u.tphone)
        returning id into v_tenant;

      v_start := (m2 - ((v_idx % 8) * interval '1 month'))::date;
      insert into leases (org_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount, billing_day, status)
        values (p_org_id, v_unit, v_tenant, v_start, (v_start + interval '12 months')::date, u.rent, u.rent, 1, 'active')
        returning id into v_lease;

      foreach mth in array array[m2, m1, m0]
      loop
        v_due := mth + 4;

        insert into invoices (org_id, lease_id, period_start, period_end, due_date, status)
          values (p_org_id, v_lease, mth, (mth + interval '1 month' - interval '1 day')::date, v_due, 'sent')
          returning id into v_inv;

        insert into invoice_items (org_id, invoice_id, item_type, description, amount)
          values (p_org_id, v_inv, 'rent', 'Rent - ' || to_char(mth, 'FMMonth YYYY'), u.rent);

        if u.prop <> 'p3' and v_idx % 2 = 0 then
          v_water := 500 + ((v_idx * 137) % 1100);
          insert into invoice_items (org_id, invoice_id, item_type, description, amount)
            values (p_org_id, v_inv, 'utility', 'Water - ' || to_char(mth, 'FMMonth YYYY'), v_water);
        end if;

        select total_amount into v_total from invoices where id = v_inv;

        v_amt := case
          when mth = m2 then v_total
          when mth = m1 then case when v_idx % 7 = 0 then 0 when v_idx % 5 = 0 then round(v_total / 2) else v_total end
          else case when v_idx % 3 = 0 then v_total when v_idx % 7 = 2 then round(v_total / 2) else 0 end
        end;

        if v_amt > 0 then
          v_pay_day := least(mth + (1 + v_idx % 5), v_today);
          v_ts := least(v_pay_day::timestamp + interval '10 hours 15 minutes', now());
          v_method := (array['mpesa', 'mpesa', 'bank', 'mpesa', 'cash'])[1 + v_idx % 5]::payment_method;
          v_ref := case v_method
            when 'mpesa' then 'S' || upper(substr(md5(random()::text), 1, 9))
            when 'bank' then 'BNK' || upper(substr(md5(random()::text), 1, 8))
            else null
          end;
          insert into payments (org_id, invoice_id, amount, method, reference, paid_at)
            values (p_org_id, v_inv, v_amt, v_method, v_ref, v_ts);
        elsif v_today > v_due then
          update invoices set status = 'overdue' where id = v_inv;
        end if;
      end loop;

      if u.prop <> 'p3' and v_idx % 2 = 0 then
        v_prev := 100 + v_idx * 13;
        insert into meter_readings (org_id, unit_id, lease_id, meter_type, reading_date, previous_reading, current_reading, rate_per_unit, billed)
          values (p_org_id, v_unit, v_lease, 'water', m1 + 24, v_prev, v_prev + 8 + v_idx % 9, 150, true);
        insert into meter_readings (org_id, unit_id, lease_id, meter_type, reading_date, previous_reading, current_reading, rate_per_unit, billed)
          values (p_org_id, v_unit, v_lease, 'water', least(m0 + 9, v_today), v_prev + 8 + v_idx % 9, v_prev + 14 + v_idx % 9 + v_idx % 7, 150, false);
      end if;
    end if;

    insert into _demo_units values (u.unit_no, v_unit, v_lease);
  end loop;

  -- Maintenance -------------------------------------------------------------------------------
  insert into maintenance_records (org_id, unit_id, lease_id, issue_type, description, cost, status, reported_date, resolved_date, billed_to)
  select p_org_id, du.unit_id, du.lease_id, t.itype::maintenance_issue_type, t.descr, t.cost, t.mstatus::maintenance_status,
         t.reported, t.resolved, 'landlord'::maintenance_bill_target
  from (values
    ('A2', 'plumbing',   'Leaking kitchen tap',                     1800,  'resolved', m1 + 3,  m1 + 5),
    ('B2', 'electrical','Socket sparking in the main bedroom',      3500,  'open',     v_today - 3, null::date),
    ('M3', 'painting',   'Repaint after tenant move-out',          12000,  'resolved', m1 + 10, m1 + 16),
    ('S1', 'appliance',  'Office air-conditioner not cooling',      6500,  'open',     v_today - 6, null::date),
    ('B3', 'structural','Ceiling water damage - unit unavailable', 48000,  'open',     v_today - 12, null::date)
  ) as t(unit_no, itype, descr, cost, mstatus, reported, resolved)
  join _demo_units du on du.unit_no = t.unit_no;

  -- Expenses (property-linked draw on owner funds; office ones are the org's own) -------------
  insert into expenses (org_id, property_id, category, description, amount, expense_date)
  select p_org_id,
         case t.prop when 'p1' then p1 when 'p2' then p2 when 'p3' then p3 else null end,
         t.cat, t.descr, t.amt, least(t.dt, v_today)
  from (values
    ('p1', 'Security',    'Night guard services - Riverside',  18000, m2 + 27),
    ('p1', 'Security',    'Night guard services - Riverside',  18000, m1 + 27),
    ('p1', 'Maintenance', 'Plumbing repair - Block A',          1800, m1 + 5),
    ('p2', 'Cleaning',    'Compound and stairwell cleaning',    9500, m2 + 28),
    ('p2', 'Cleaning',    'Compound and stairwell cleaning',    9500, m1 + 28),
    ('p2', 'Maintenance', 'Gate motor service',                 7800, m1 + 12),
    ('p3', 'Utilities',   'Common-area electricity',           14200, m2 + 20),
    ('p3', 'Utilities',   'Common-area electricity',           15100, m1 + 20),
    (null, 'Office',      'Office rent',                       35000, m1 + 1),
    (null, 'Office',      'Office rent',                       35000, m0 + 1),
    (null, 'Internet',    'Fibre internet subscription',        6500, m1 + 8),
    (null, 'Marketing',   'Vacancy listings and signage',       4000, m0 + 3)
  ) as t(prop, cat, descr, amt, dt);

  -- Commission reconciliation: two months back is reconciled, last month is pending review -------
  for r in select unnest(array[p1, p2, p3]) as pid
  loop
    foreach mth in array array[m2, m1]
    loop
      select coalesce(sum(pay.amount), 0) into v_gross
        from payments pay
        join invoices i on i.id = pay.invoice_id
        join leases l on l.id = i.lease_id
        join units un on un.id = l.unit_id
        where un.property_id = r.pid
          and pay.paid_at >= mth and pay.paid_at < (mth + interval '1 month');
      select coalesce(sum(amount), 0) into v_exp
        from expenses
        where property_id = r.pid
          and expense_date >= mth and expense_date < (mth + interval '1 month')::date;
      select commission_rate into v_rate from properties where id = r.pid;
      v_comm := round(v_gross * v_rate / 100, 2);
      insert into commission_ledger (org_id, property_id, period_start, period_end, gross_revenue, commission_rate,
                                     commission_amount, total_expenses, net_to_owner, status)
        values (p_org_id, r.pid, mth, (mth + interval '1 month' - interval '1 day')::date, v_gross, v_rate,
                v_comm, v_exp, v_gross - v_comm - v_exp, 'pending');
    end loop;
  end loop;
  update commission_ledger set status = 'reconciled', reconciled_at = now()
    where org_id = p_org_id and period_start = m2;

  -- Team and assets ---------------------------------------------------------------------------
  insert into employees (org_id, full_name, job_title, phone, salary, hire_date, status) values
    (p_org_id, 'Peter Mwangi',    'Caretaker',           '0700000011', 22000, m2 - 240, 'active'),
    (p_org_id, 'Faith Achieng',   'Accountant',          '0700000012', 55000, m2 - 400, 'active'),
    (p_org_id, 'Joseph Kiprono',  'Security Supervisor', '0700000013', 28000, m2 - 150, 'active');

  insert into equipment (org_id, name, category, purchase_date, value, status, assigned_to) values
    (p_org_id, 'Generator 20kVA',         'Power', m2 - 300, 450000, 'in_use',      'Riverside Apartments'),
    (p_org_id, 'Laptop - Dell Latitude',  'IT',    m2 - 120,  85000, 'in_use',      'Faith Achieng'),
    (p_org_id, 'Borehole water pump',     'Plumbing', m2 - 500, 65000, 'maintenance', 'Mwangaza Court');

  insert into stationery_items (org_id, name, unit, quantity_on_hand, reorder_level, unit_cost) values
    (p_org_id, 'A4 paper (ream)', 'ream', 14, 5, 650),
    (p_org_id, 'Receipt books',   'pcs',   3, 4, 320),
    (p_org_id, 'Pens (box)',      'box',   6, 2, 480);
end;
$fn$;

create or replace function public.reset_demo_data()
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c_email constant text := 'demo@keja-demo.local';
  c_password constant text := 'KejaDemo#2026';
  v_uid uuid;
  v_org uuid;
begin
  select id into v_uid from auth.users where email = c_email;

  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
      values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', c_email,
              extensions.crypt(c_password, extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Visitor"}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_uid, v_uid::text, jsonb_build_object('sub', v_uid::text, 'email', c_email),
              'email', now(), now(), now());
  else
    -- Undo anything a visitor may have changed on the account itself.
    update auth.users
      set email = c_email,
          encrypted_password = extensions.crypt(c_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data = '{"provider":"email","providers":["email"]}',
          raw_user_meta_data = '{"full_name":"Demo Visitor"}',
          banned_until = null,
          updated_at = now()
      where id = v_uid;
    update auth.identities
      set identity_data = jsonb_build_object('sub', v_uid::text, 'email', c_email), provider_id = v_uid::text
      where user_id = v_uid and provider = 'email';
  end if;

  -- Wipe every organisation the demo user belongs to (including any a visitor created).
  delete from organizations where id in (select org_id from org_members where user_id = v_uid);

  -- Rebuild through the real create_organization(), acting as the demo user.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);
  v_org := create_organization('Demo Property Management', 'manager', null, null);
  perform seed_demo_data(v_org);
  perform set_config('request.jwt.claims', '', true);

  return v_org;
end;
$fn$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
revoke execute on function public.reset_demo_data() from public, anon, authenticated;

-- The demo user may not upload files (they'd outlive the hourly reset and could be abused).
drop policy if exists "demo_user_no_uploads" on storage.objects;
create policy "demo_user_no_uploads" on storage.objects
  as restrictive for insert to authenticated
  with check (coalesce(auth.jwt() ->> 'email', '') <> 'demo@keja-demo.local');

-- Reset on the hour, and once now so the demo is ready immediately.
select cron.schedule('keja-demo-reset', '0 * * * *', $$select public.reset_demo_data()$$);
select public.reset_demo_data();
