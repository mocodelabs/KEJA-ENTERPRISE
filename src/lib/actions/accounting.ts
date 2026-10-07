'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { runReconciliationForPeriod } from '@/lib/services/commissionEngine'
import type { AuthActionState } from '@/lib/actions/auth'

export async function addExpense(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const amount = Number(formData.get('amount') ?? 0)
  const category = String(formData.get('category') ?? '').trim()
  if (!category || amount <= 0) return { error: 'Category and a valid amount are required.' }

  const { error } = await supabase.from('expenses').insert({
    org_id: active.org_id,
    property_id: String(formData.get('property_id') ?? '') || null,
    category,
    description: String(formData.get('description') ?? '') || null,
    amount,
    expense_date: String(formData.get('expense_date') ?? new Date().toISOString().slice(0, 10)),
  })

  if (error) return { error: error.message }
  revalidatePath('/accounting/expenses')
  return { message: 'Expense recorded.' }
}

export async function updateExpense(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing expense.' }

  const amount = Number(formData.get('amount') ?? 0)
  const category = String(formData.get('category') ?? '').trim()
  if (!category || amount <= 0) return { error: 'Category and a valid amount are required.' }

  const { error } = await supabase
    .from('expenses')
    .update({
      property_id: String(formData.get('property_id') ?? '') || null,
      category,
      description: String(formData.get('description') ?? '') || null,
      amount,
      expense_date: String(formData.get('expense_date') ?? new Date().toISOString().slice(0, 10)),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting/reconciliation')
  return { message: 'Expense updated.' }
}

export async function deleteExpense(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  revalidatePath('/accounting/expenses')
  revalidatePath('/accounting/reconciliation')
  if (error) return { error: error.message }
}

export async function runReconciliation(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const propertyId = String(formData.get('property_id') ?? '')
  const periodStart = String(formData.get('period_start') ?? '')
  const periodEnd = String(formData.get('period_end') ?? '')
  if (!propertyId || !periodStart || !periodEnd) return { error: 'Select a property and period.' }

  const result = await runReconciliationForPeriod(supabase, active.org_id, propertyId, periodStart, periodEnd)
  if (result.error) return { error: result.error.message }

  revalidatePath('/accounting/reconciliation')

  if (result.skipped) {
    return { message: 'This property/period was already marked reconciled — left untouched.' }
  }
  return {
    message: `Reconciled: gross ${result.grossRevenue.toFixed(2)}, commission ${result.commissionAmount.toFixed(2)}, net to owner ${result.netToOwner.toFixed(2)}.`,
  }
}

export async function markReconciled(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase
    .from('commission_ledger')
    .update({ status: 'reconciled', reconciled_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/accounting/reconciliation')
  if (error) return { error: error.message }
}
