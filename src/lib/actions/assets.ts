'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

export async function createEquipment(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Equipment name is required.' }

  const { error } = await supabase.from('equipment').insert({
    org_id: active.org_id,
    name,
    category: String(formData.get('category') ?? '') || null,
    purchase_date: String(formData.get('purchase_date') ?? '') || null,
    value: formData.get('value') ? Number(formData.get('value')) : null,
    assigned_to: String(formData.get('assigned_to') ?? '') || null,
    status: String(formData.get('status') ?? 'in_use') as Enums<'equipment_status'>,
  })

  if (error) return { error: error.message }
  revalidatePath('/assets/equipment')
  return { message: 'Equipment added.' }
}

export async function updateEquipment(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing equipment.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Equipment name is required.' }

  const { error } = await supabase
    .from('equipment')
    .update({
      name,
      category: String(formData.get('category') ?? '') || null,
      purchase_date: String(formData.get('purchase_date') ?? '') || null,
      value: formData.get('value') ? Number(formData.get('value')) : null,
      assigned_to: String(formData.get('assigned_to') ?? '') || null,
      status: String(formData.get('status') ?? 'in_use') as Enums<'equipment_status'>,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/assets/equipment')
  return { message: 'Equipment updated.' }
}

export async function updateEquipmentStatus(id: string, status: Enums<'equipment_status'>) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('equipment').update({ status }).eq('id', id)
  revalidatePath('/assets/equipment')
  if (error) return { error: error.message }
}

export async function deleteEquipment(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  revalidatePath('/assets/equipment')
  if (error) return { error: error.message }
}

export async function createStationeryItem(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Item name is required.' }

  const { error } = await supabase.from('stationery_items').insert({
    org_id: active.org_id,
    name,
    unit: String(formData.get('unit') ?? 'pcs'),
    reorder_level: Number(formData.get('reorder_level') ?? 0),
    unit_cost: formData.get('unit_cost') ? Number(formData.get('unit_cost')) : null,
  })

  if (error) return { error: error.message }
  revalidatePath('/assets/stationery')
  return { message: 'Item added.' }
}

export async function updateStationeryItem(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing item.' }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Item name is required.' }

  const { error } = await supabase
    .from('stationery_items')
    .update({
      name,
      unit: String(formData.get('unit') ?? 'pcs'),
      reorder_level: Number(formData.get('reorder_level') ?? 0),
      unit_cost: formData.get('unit_cost') ? Number(formData.get('unit_cost')) : null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/assets/stationery')
  return { message: 'Item updated.' }
}

/** Procuring stock ('in') logs an expense automatically using the item's set unit cost. */
export async function addStationeryTransaction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const itemId = String(formData.get('item_id') ?? '')
  const quantity = Number(formData.get('quantity') ?? 0)
  if (!itemId || quantity <= 0) return { error: 'Select an item and enter a valid quantity.' }

  const txnType = String(formData.get('txn_type') ?? 'in') as Enums<'stationery_txn_type'>

  const { data: transaction, error } = await supabase
    .from('stationery_transactions')
    .insert({
      org_id: active.org_id,
      item_id: itemId,
      txn_type: txnType,
      quantity,
      notes: String(formData.get('notes') ?? '') || null,
    })
    .select('id, txn_date')
    .single()

  if (error || !transaction) return { error: error?.message ?? 'Could not record transaction.' }

  if (txnType !== 'in') {
    revalidatePath('/assets/stationery')
    return { message: 'Transaction recorded.' }
  }

  const { data: item } = await supabase
    .from('stationery_items')
    .select('name, unit, unit_cost')
    .eq('id', itemId)
    .single()

  if (!item?.unit_cost) {
    revalidatePath('/assets/stationery')
    return { message: 'Transaction recorded. Set a cost on this item to auto-log procurement expenses.' }
  }

  const { data: expense } = await supabase
    .from('expenses')
    .insert({
      org_id: active.org_id,
      category: 'Stationery',
      description: `Procured ${quantity} ${item.unit} of ${item.name}`,
      amount: Number(item.unit_cost) * quantity,
      expense_date: transaction.txn_date,
    })
    .select('id')
    .single()

  if (expense) {
    await supabase.from('stationery_transactions').update({ expense_id: expense.id }).eq('id', transaction.id)
  }

  revalidatePath('/assets/stationery')
  revalidatePath('/accounting/expenses')
  return { message: 'Transaction recorded and added to expenses.' }
}
