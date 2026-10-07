alter table public.employees add column contract_url text;

insert into storage.buckets (id, name, public)
values ('employee-contracts', 'employee-contracts', false)
on conflict (id) do nothing;

create policy "org_members_select_employee_contracts" on storage.objects
  for select using (
    bucket_id = 'employee-contracts'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "org_members_insert_employee_contracts" on storage.objects
  for insert with check (
    bucket_id = 'employee-contracts'
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "org_admins_delete_employee_contracts" on storage.objects
  for delete using (
    bucket_id = 'employee-contracts'
    and has_org_role((storage.foldername(name))[1]::uuid, array['owner','admin','manager']::member_role[])
  );
