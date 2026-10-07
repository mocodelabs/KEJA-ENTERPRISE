alter function recompute_invoice_total() set search_path = public;
alter function apply_payment_to_invoice() set search_path = public;
alter function create_receipt_for_payment() set search_path = public;
alter function apply_stationery_transaction() set search_path = public;

revoke execute on function is_org_member(uuid) from public, anon;
revoke execute on function has_org_role(uuid, member_role[]) from public, anon;
revoke execute on function create_organization(text, org_type) from public, anon;

grant execute on function is_org_member(uuid) to authenticated;
grant execute on function has_org_role(uuid, member_role[]) to authenticated;
grant execute on function create_organization(text, org_type) to authenticated;
