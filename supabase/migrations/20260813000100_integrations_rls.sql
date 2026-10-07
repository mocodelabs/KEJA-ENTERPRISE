do $$
declare
  t text;
  tables text[] := array['payment_gateways'];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "select_org_members" on %I for select using (is_org_member(org_id))', t);
    execute format('create policy "insert_org_members" on %I for insert with check (is_org_member(org_id))', t);
    execute format('create policy "update_org_members" on %I for update using (is_org_member(org_id)) with check (is_org_member(org_id))', t);
    execute format('create policy "delete_org_admins" on %I for delete using (has_org_role(org_id, array[''owner'',''admin'']::member_role[]))', t);
    execute format('create index if not exists idx_%s_org_id on %I(org_id)', t, t);
  end loop;
end $$;

alter table sms_gateway_settings enable row level security;
create policy "select_org_members" on sms_gateway_settings for select using (is_org_member(org_id));
create policy "upsert_org_admins_insert" on sms_gateway_settings for insert with check (has_org_role(org_id, array['owner','admin']::member_role[]));
create policy "upsert_org_admins_update" on sms_gateway_settings for update using (has_org_role(org_id, array['owner','admin']::member_role[])) with check (has_org_role(org_id, array['owner','admin']::member_role[]));
create policy "delete_org_admins" on sms_gateway_settings for delete using (has_org_role(org_id, array['owner','admin']::member_role[]));

alter table whatsapp_gateway_settings enable row level security;
create policy "select_org_members" on whatsapp_gateway_settings for select using (is_org_member(org_id));
create policy "upsert_org_admins_insert" on whatsapp_gateway_settings for insert with check (has_org_role(org_id, array['owner','admin']::member_role[]));
create policy "upsert_org_admins_update" on whatsapp_gateway_settings for update using (has_org_role(org_id, array['owner','admin']::member_role[])) with check (has_org_role(org_id, array['owner','admin']::member_role[]));
create policy "delete_org_admins" on whatsapp_gateway_settings for delete using (has_org_role(org_id, array['owner','admin']::member_role[]));
