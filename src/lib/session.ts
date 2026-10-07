import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database'

export const ACTIVE_ORG_COOKIE = 'keja_active_org'

export type OrgMembership = Tables<'org_members'> & {
  organization: Tables<'organizations'>
}

/** Requires a logged-in user; redirects to /login otherwise. */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  return { supabase, user }
}

/**
 * Requires a logged-in user with at least one organization, and resolves
 * which org is "active" (from cookie, falling back to the first membership).
 * Redirects to /onboarding if the user has no organization yet.
 */
export async function requireActiveOrg() {
  const { supabase, user } = await requireUser()

  const { data: memberships } = await supabase
    .from('org_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', user.id)
    .returns<OrgMembership[]>()

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding')
  }

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  const active = memberships.find((m) => m.org_id === activeOrgId) ?? memberships[0]

  return { supabase, user, memberships, active }
}
