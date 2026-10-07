'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_ORG_COOKIE, requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import { isValidNationalId, isValidKraPin, normalizeKraPin } from '@/lib/kenyaId'
import type { AuthActionState } from '@/lib/actions/auth'

export async function createOrganization(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const name = String(formData.get('name') ?? '')
  const orgType = String(formData.get('org_type') ?? 'manager') as 'manager' | 'owner_direct'
  const nationalId = String(formData.get('owner_national_id') ?? '').trim()
  const kraPin = normalizeKraPin(String(formData.get('owner_kra_pin') ?? ''))

  if (!name.trim()) return { error: 'Organization name is required.' }
  if (!isValidNationalId(nationalId)) return { error: 'Enter a valid National ID (6-10 digits).' }
  if (!isValidKraPin(kraPin)) return { error: 'Enter a valid KRA PIN (e.g. A012345678Z).' }

  const supabase = await createClient()
  const { data: orgId, error } = await supabase.rpc('create_organization', {
    org_name: name,
    org_kind: orgType,
    p_owner_national_id: nationalId,
    p_owner_kra_pin: kraPin,
  })

  if (error) return { error: error.message }

  // Clear the values signup stashed on the account now that they've landed on the org record.
  await supabase.auth.updateUser({
    data: {
      pending_org_name: null,
      pending_org_type: null,
      pending_owner_national_id: null,
      pending_owner_kra_pin: null,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId as string, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/dashboard')
}

export async function updateOrgCommission(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  if (!isPropertyManager(active.organization.org_type)) {
    return { error: 'Commission doesn\'t apply to an owner-managed organization.' }
  }

  const rateRaw = String(formData.get('default_commission_rate') ?? '')
  const rate = Number(rateRaw)
  if (rateRaw === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
    return { error: 'Enter a commission rate between 0 and 100.' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ default_commission_rate: rate })
    .eq('id', active.org_id)

  if (error) return { error: error.message }
  revalidatePath('/settings/org')
  return { message: 'Default commission updated.' }
}

export async function updateOwnerTaxIdentity(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const nationalId = String(formData.get('owner_national_id') ?? '').trim()
  const kraPin = normalizeKraPin(String(formData.get('owner_kra_pin') ?? ''))

  if (!isValidNationalId(nationalId)) return { error: 'Enter a valid National ID (6-10 digits).' }
  if (!isValidKraPin(kraPin)) return { error: 'Enter a valid KRA PIN (e.g. A012345678Z).' }

  const { error } = await supabase
    .from('organizations')
    .update({ owner_national_id: nationalId, owner_kra_pin: kraPin })
    .eq('id', active.org_id)

  if (error) return { error: error.message }
  revalidatePath('/settings/org')
  return { message: 'Tax identity updated.' }
}

export async function switchOrg(formData: FormData) {
  const orgId = String(formData.get('org_id') ?? '')
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: 'lax', path: '/' })
  redirect('/dashboard')
}
