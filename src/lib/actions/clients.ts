'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import type { AuthActionState } from '@/lib/actions/auth'

export async function addOwnerClient(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  if (!isPropertyManager(active.organization.org_type)) {
    return { error: 'Owner clients don\'t apply to an owner-managed organization.' }
  }

  const fullName = String(formData.get('full_name') ?? '').trim()
  if (!fullName) return { error: 'Client name is required.' }

  const propertyId = String(formData.get('property_id') ?? '')
  if (!propertyId) return { error: 'Select the property this owner is pegged to.' }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      org_id: active.org_id,
      full_name: fullName,
      email: String(formData.get('email') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
    })
    .select()
    .single()

  if (error || !client) return { error: error?.message ?? 'Could not create client.' }

  const { data: linked, error: linkError } = await supabase
    .from('properties')
    .update({ client_id: client.id })
    .eq('id', propertyId)
    .is('client_id', null)
    .select('id')
    .maybeSingle()

  if (linkError) return { error: `Client created, but failed to link property: ${linkError.message}` }
  if (!linked) {
    return {
      error: 'Client created, but that property already has an owner — use Change ownership on the property page instead.',
    }
  }

  revalidatePath('/clients')
  revalidatePath('/properties')
  return { message: 'Owner added and linked to the property.' }
}

export async function updateOwnerClient(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  if (!id) return { error: 'Missing client.' }
  if (!fullName) return { error: 'Client name is required.' }

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: fullName,
      email: String(formData.get('email') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      id_number: String(formData.get('id_number') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  revalidatePath('/properties')
  return { message: 'Owner details updated.' }
}

export async function deleteOwnerClient(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  revalidatePath('/clients')
  if (error) return { error: error.message }
}

export async function assignPropertyToOwner(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const clientId = String(formData.get('client_id') ?? '')
  const propertyId = String(formData.get('property_id') ?? '')
  if (!clientId || !propertyId) return { error: 'Select a property to add.' }

  const { data: linked, error } = await supabase
    .from('properties')
    .update({ client_id: clientId })
    .eq('id', propertyId)
    .eq('org_id', active.org_id)
    .is('client_id', null)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!linked) {
    return { error: 'That property already has an owner — use Change ownership on the property page instead.' }
  }
  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/properties')
  return { message: 'Property added to this owner.' }
}

export async function removePropertyFromOwner(clientId: string, propertyId: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('properties').update({ client_id: null }).eq('id', propertyId)
  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/properties')
  if (error) return { error: error.message }
}
