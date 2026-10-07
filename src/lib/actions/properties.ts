'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

function parseBlocks(formData: FormData) {
  const names = formData.getAll('block_name').map(String)
  const floorCounts = formData.getAll('block_floor_count').map(String)

  return names
    .map((name, i) => ({ name: name.trim(), floorCount: Math.max(1, Number(floorCounts[i]) || 1) }))
    .filter((b) => b.name.length > 0)
}

export async function createProperty(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Property name is required.' }

  const isPM = isPropertyManager(active.organization.org_type)

  const clientId = isPM ? String(formData.get('client_id') ?? '') : ''
  const commissionRaw = isPM ? String(formData.get('commission_rate') ?? '').trim() : ''
  let commissionRate: number | null = null
  if (commissionRaw) {
    commissionRate = Number(commissionRaw)
    if (Number.isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      return { error: 'Enter a commission rate between 0 and 100, or leave blank for the org default.' }
    }
  }
  const blocks = parseBlocks(formData)

  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      org_id: active.org_id,
      name,
      property_type: String(formData.get('property_type') ?? 'residential') as Enums<'property_type'>,
      address: String(formData.get('address') ?? '') || null,
      city: String(formData.get('city') ?? '') || null,
      client_id: clientId || null,
      commission_rate: commissionRate,
    })
    .select('id')
    .single()

  if (error || !property) return { error: error?.message ?? 'Could not create property.' }

  if (blocks.length > 0) {
    const { error: blocksError } = await supabase.from('property_blocks').insert(
      blocks.map((b) => ({
        org_id: active.org_id,
        property_id: property.id,
        name: b.name,
        floor_count: b.floorCount,
      }))
    )
    if (blocksError) return { error: `Property created, but blocks failed: ${blocksError.message}` }
  }

  revalidatePath('/properties')
  return { message: 'Property added.' }
}

export async function deleteProperty(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('properties').delete().eq('id', id)
  revalidatePath('/properties')
  if (error) return { error: error.message }
}

export async function addPropertyBlock(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const propertyId = String(formData.get('property_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const floorCount = Math.max(1, Number(formData.get('floor_count') ?? 1) || 1)
  if (!propertyId || !name) return { error: 'Block name is required.' }

  const { error } = await supabase.from('property_blocks').insert({
    org_id: active.org_id,
    property_id: propertyId,
    name,
    floor_count: floorCount,
  })

  if (error) return { error: error.code === '23505' ? 'A block with that name already exists.' : error.message }
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/properties')
  return { message: 'Block added.' }
}

export async function updatePropertyBlock(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const blockId = String(formData.get('block_id') ?? '')
  const propertyId = String(formData.get('property_id') ?? '')
  if (!blockId) return { error: 'Missing block.' }

  const floorCount = Math.max(1, Number(formData.get('floor_count') ?? 1) || 1)

  const { count: unitsAboveFloor } = await supabase
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('block_id', blockId)
    .gt('floor', floorCount)

  if ((unitsAboveFloor ?? 0) > 0) {
    return { error: `This block has units above floor ${floorCount} — move or update them first.` }
  }

  const { error } = await supabase.from('property_blocks').update({ floor_count: floorCount }).eq('id', blockId)

  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/properties')
  return { message: 'Block floors updated.' }
}

export async function deletePropertyBlock(id: string, propertyId: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('property_blocks').delete().eq('id', id)
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/properties')
  if (error) return { error: error.message }
}

export async function updatePropertyCommission(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  if (!isPropertyManager(active.organization.org_type)) {
    return { error: 'Commission doesn\'t apply to an owner-managed organization.' }
  }

  const propertyId = String(formData.get('property_id') ?? '')
  if (!propertyId) return { error: 'Missing property.' }

  const rateRaw = String(formData.get('commission_rate') ?? '').trim()
  let rate: number | null = null
  if (rateRaw) {
    rate = Number(rateRaw)
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      return { error: 'Enter a commission rate between 0 and 100, or leave blank for the org default.' }
    }
  }

  const { error } = await supabase.from('properties').update({ commission_rate: rate }).eq('id', propertyId)

  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/properties')
  return { message: 'Commission updated.' }
}

export async function changePropertyOwner(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const propertyId = String(formData.get('property_id') ?? '')
  if (!propertyId) return { error: 'Missing property.' }

  const selection = String(formData.get('client_id') ?? '')
  let clientId: string | null = selection || null

  if (selection === '__new__') {
    const newOwnerName = String(formData.get('new_owner_full_name') ?? '').trim()
    if (!newOwnerName) return { error: 'Enter the new owner\'s full name.' }

    const { data: newClient, error: createError } = await supabase
      .from('clients')
      .insert({
        org_id: active.org_id,
        full_name: newOwnerName,
        phone: String(formData.get('new_owner_phone') ?? '').trim() || null,
        email: String(formData.get('new_owner_email') ?? '').trim() || null,
      })
      .select('id')
      .single()
    if (createError || !newClient) return { error: createError?.message ?? 'Could not create the new owner.' }
    clientId = newClient.id
  }

  const { error } = await supabase
    .from('properties')
    .update({ client_id: clientId })
    .eq('id', propertyId)
    .eq('org_id', active.org_id)

  if (error) return { error: error.message }
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/properties')
  revalidatePath('/clients')
  return { message: clientId ? 'Ownership transferred.' : 'Property is now owned directly by the org.' }
}
