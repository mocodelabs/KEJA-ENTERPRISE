-- The 4-arg create_organization (with optional National ID / KRA PIN) supersedes the
-- original 2-arg version. Leaving both made PostgREST unable to choose a function
-- when the tax identity is omitted ("Could not choose the best candidate function").
drop function if exists public.create_organization(text, org_type);
