'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

export async function createUnit(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const propertyId = String(formData.get('property_id') ?? '')
  const unitNo = String(formData.get('unit_no') ?? '').trim()
  if (!propertyId || !unitNo) return { error: 'Unit number is required.' }

  const blockId = String(formData.get('block_id') ?? '') || null
  const floorRaw = String(formData.get('floor') ?? '')
  let floor = floorRaw ? Number(floorRaw) : null

  if (blockId) {
    const { data: block } = await supabase.from('property_blocks').select('floor_count').eq('id', blockId).single()
    if (!block) return { error: 'Selected block no longer exists.' }
    if (floor !== null && (floor < 1 || floor > block.floor_count)) {
      return { error: `Floor must be between 1 and ${block.floor_count} for that block.` }
    }
  } else {
    floor = null
  }

  const { error } = await supabase.from('units').insert({
    org_id: active.org_id,
    property_id: propertyId,
    unit_no: unitNo,
    unit_type: String(formData.get('unit_type') ?? 'single_room') as Enums<'unit_type'>,
    bedrooms: formData.get('bedrooms') ? Number(formData.get('bedrooms')) : null,
    rent_amount: Number(formData.get('rent_amount') ?? 0),
    status: String(formData.get('status') ?? 'vacant') as Enums<'unit_status'>,
    block_id: blockId,
    floor,
  })

  if (error) {
    return {
      error:
        error.code === '23505'
          ? blockId
            ? `Unit "${unitNo}" already exists in this block — pick a different unit number.`
            : `Unit "${unitNo}" already exists on this property — pick a different unit number.`
          : error.message,
    }
  }
  revalidatePath(`/properties/${propertyId}`)
  revalidatePath('/properties')
  return { message: 'Unit added.' }
}

export async function updateUnitStatus(id: string, propertyId: string, status: Enums<'unit_status'>) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('units').update({ status }).eq('id', id)
  revalidatePath(`/properties/${propertyId}`)
  if (error) return { error: error.message }
}

export async function deleteUnit(id: string, propertyId: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('units').delete().eq('id', id)
  revalidatePath(`/properties/${propertyId}`)
  if (error) return { error: error.message }
}
