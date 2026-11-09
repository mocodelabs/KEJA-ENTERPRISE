-- Identify the demo user by a fixed id rather than by email. The first version looked the user up by
-- email, so a visitor who changed the account's email (via the Auth API) made the next reset create a
-- second user and leave the first one's data behind. Now the reset always repairs the same user, and
-- removes any other account that has ended up holding the demo email (including the random-id user
-- the first version created). Keep the id/email/password in sync with src/lib/demo.ts.

create or replace function public.reset_demo_data()
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c_uid constant uuid := 'd3000000-0000-4000-8000-000000000001';
  c_email constant text := 'demo@keja-demo.local';
  c_password constant text := 'KejaDemo#2026';
  v_org uuid;
begin
  delete from organizations where id in (
    select m.org_id from org_members m join auth.users u on u.id = m.user_id
    where u.email = c_email and u.id <> c_uid);
  delete from auth.users where email = c_email and id <> c_uid;

  if not exists (select 1 from auth.users where id = c_uid) then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
      values ('00000000-0000-0000-0000-000000000000', c_uid, 'authenticated', 'authenticated', c_email,
              extensions.crypt(c_password, extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Visitor"}', now(), now(), '', '', '', '');
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
      where id = c_uid;
  end if;

  delete from auth.identities where user_id = c_uid;
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), c_uid, c_uid::text, jsonb_build_object('sub', c_uid::text, 'email', c_email),
            'email', now(), now(), now());

  -- Wipe every organisation the demo user belongs to (including any a visitor created).
  delete from organizations where id in (select org_id from org_members where user_id = c_uid);

  -- Rebuild through the real create_organization(), acting as the demo user.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', c_uid::text, 'role', 'authenticated')::text, true);
  v_org := create_organization('Demo Property Management', 'manager', null, null);
  perform seed_demo_data(v_org);
  perform set_config('request.jwt.claims', '', true);

  return v_org;
end;
$fn$;

revoke execute on function public.reset_demo_data() from public, anon, authenticated;

select public.reset_demo_data();
