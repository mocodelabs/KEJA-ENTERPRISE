'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'
import { getPaymentProviderMeta } from '@/lib/paymentProviders'

export async function upsertPaymentGateway(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const provider = String(formData.get('provider') ?? '') as Enums<'payment_provider'>
  const meta = getPaymentProviderMeta(provider)
  if (!meta) return { error: 'Unknown payment provider.' }

  const displayName = String(formData.get('display_name') ?? '').trim() || meta.label

  const { data: existing } = await supabase
    .from('payment_gateways')
    .select('config')
    .eq('org_id', active.org_id)
    .eq('provider', provider)
    .maybeSingle()

  const existingConfig = (existing?.config as Record<string, string>) ?? {}
  const newConfig: Record<string, string> = { ...existingConfig }

  for (const field of meta.fields) {
    const raw = formData.get(field.key)
    if (raw === null) continue
    const value = String(raw).trim()
    // Leaving a secret field blank keeps whatever was already saved.
    if (field.secret && !value) continue
    newConfig[field.key] = value
  }

  const { error } = await supabase.from('payment_gateways').upsert(
    {
      org_id: active.org_id,
      provider,
      display_name: displayName,
      config: newConfig,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,provider' }
  )

  if (error) return { error: error.message }
  revalidatePath('/settings/payments')
  return { message: `${meta.label} details saved.` }
}

export async function togglePaymentGatewayActive(id: string, isActive: boolean) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('payment_gateways').update({ is_active: isActive }).eq('id', id)
  revalidatePath('/settings/payments')
  if (error) return { error: error.message }
}

export async function deletePaymentGateway(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('payment_gateways').delete().eq('id', id)
  revalidatePath('/settings/payments')
  if (error) return { error: error.message }
}

export async function updateSmsGatewaySettings(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const provider = String(formData.get('provider') ?? 'console') as Enums<'sms_provider'>
  const apiKeyRaw = String(formData.get('api_key') ?? '').trim()
  const apiSecretRaw = String(formData.get('api_secret') ?? '').trim()
  const senderId = String(formData.get('sender_id') ?? '').trim() || null

  const { data: existing } = await supabase
    .from('sms_gateway_settings')
    .select('api_key, api_secret')
    .eq('org_id', active.org_id)
    .maybeSingle()

  const { error } = await supabase.from('sms_gateway_settings').upsert(
    {
      org_id: active.org_id,
      provider,
      api_key: apiKeyRaw || existing?.api_key || null,
      api_secret: apiSecretRaw || existing?.api_secret || null,
      sender_id: senderId,
      is_active: provider !== 'console',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  )

  if (error) return { error: error.message }
  revalidatePath('/settings/sms')
  return { message: 'SMS gateway settings saved.' }
}

export async function updateWhatsappGatewaySettings(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const provider = String(formData.get('provider') ?? 'console') as Enums<'whatsapp_provider'>
  const phoneNumberId = String(formData.get('phone_number_id') ?? '').trim() || null
  const businessAccountId = String(formData.get('business_account_id') ?? '').trim() || null
  const accessTokenRaw = String(formData.get('access_token') ?? '').trim()

  const { data: existing } = await supabase
    .from('whatsapp_gateway_settings')
    .select('access_token')
    .eq('org_id', active.org_id)
    .maybeSingle()

  const { error } = await supabase.from('whatsapp_gateway_settings').upsert(
    {
      org_id: active.org_id,
      provider,
      phone_number_id: phoneNumberId,
      business_account_id: businessAccountId,
      access_token: accessTokenRaw || existing?.access_token || null,
      is_active: provider !== 'console',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  )

  if (error) return { error: error.message }
  revalidatePath('/settings/whatsapp')
  return { message: 'WhatsApp gateway settings saved.' }
}

export async function updateProfile(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (!fullName) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('org_members')
    .update({ full_name: fullName, phone: phone || null })
    .eq('id', active.id)

  if (error) return { error: error.message }
  revalidatePath('/settings/profile')
  return { message: 'Profile updated.' }
}
