'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_ORG_COOKIE } from '@/lib/session'
import { isValidNationalId, isValidKraPin, normalizeKraPin } from '@/lib/kenyaId'

export type AuthActionState = { error?: string; message?: string } | null

export async function signUp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const fullName = String(formData.get('full_name') ?? '')
  const orgName = String(formData.get('org_name') ?? '').trim()
  const orgType = String(formData.get('org_type') ?? 'manager') as 'manager' | 'owner_direct'
  const nationalId = String(formData.get('owner_national_id') ?? '').trim()
  const kraPin = normalizeKraPin(String(formData.get('owner_kra_pin') ?? ''))

  if (!orgName) return { error: 'Company / property name is required.' }
  if (!isValidNationalId(nationalId)) return { error: 'Enter a valid National ID (6-10 digits).' }
  if (!isValidKraPin(kraPin)) return { error: 'Enter a valid KRA PIN (e.g. A012345678Z).' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Kept on the user record (not a cookie) so the org gets created with
      // these exact choices whenever the account is next signed into —
      // email confirmation links are often opened on a different device or
      // browser than the one used to sign up, where a cookie wouldn't survive.
      data: {
        full_name: fullName,
        pending_org_name: orgName,
        pending_org_type: orgType,
        pending_owner_national_id: nationalId,
        pending_owner_kra_pin: kraPin,
      },
    },
  })

  if (error) return { error: error.message }

  if (!data.session) {
    return { message: 'Account created. Check your email to confirm it, then sign in.' }
  }

  const { data: orgId, error: orgError } = await supabase.rpc('create_organization', {
    org_name: orgName,
    org_kind: orgType,
    p_owner_national_id: nationalId,
    p_owner_kra_pin: kraPin,
  })

  if (orgError) return { error: orgError.message }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId as string, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/dashboard')
}

export async function signIn(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
