do $$
declare
  t text;
  tables text[] := array[
    'properties','units','tenants','leases','meter_readings','penalty_rules','reminder_rules',
    'invoices','invoice_items','payments','receipts','quotes','quote_items','credit_notes',
    'message_templates','messages_log','expenses','commission_ledger',
    'employees','payroll_runs','payroll_items','equipment','stationery_items','stationery_transactions'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "select_org_members" on %I for select using (is_org_member(org_id))', t);
    execute format('create policy "insert_org_members" on %I for insert with check (is_org_member(org_id))', t);
    execute format('create policy "update_org_members" on %I for update using (is_org_member(org_id)) with check (is_org_member(org_id))', t);
    execute format('create policy "delete_org_admins" on %I for delete using (has_org_role(org_id, array[''owner'',''admin'',''manager'']::member_role[]))', t);
    execute format('create index if not exists idx_%s_org_id on %I(org_id)', t, t);
  end loop;
end $$;

create index if not exists idx_clients_org_id on clients(org_id);
create index if not exists idx_units_property_id on units(property_id);
create index if not exists idx_leases_unit_id on leases(unit_id);
create index if not exists idx_leases_tenant_id on leases(tenant_id);
create index if not exists idx_invoices_lease_id on invoices(lease_id);
create index if not exists idx_invoice_items_invoice_id on invoice_items(invoice_id);
create index if not exists idx_payments_invoice_id on payments(invoice_id);
create index if not exists idx_org_members_user_id on org_members(user_id);
