'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

export async function addMaintenanceRecord(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const unitId = String(formData.get('unit_id') ?? '')
  const description = String(formData.get('description') ?? '').trim()
  const cost = Number(formData.get('cost') ?? 0) || 0
  const billedTo = String(formData.get('billed_to') ?? 'landlord') as Enums<'maintenance_bill_target'>
  if (!unitId || !description) return { error: 'Select a unit and describe the issue.' }

  // Peg the record to whoever is actively leasing the unit right now, so it
  // shows up correctly on that tenant's history even if they later move out.
  const { data: activeLease } = await supabase
    .from('leases')
    .select('id')
    .eq('unit_id', unitId)
    .eq('status', 'active')
    .maybeSingle()

  if (billedTo === 'tenant' && !activeLease) {
    return { error: 'This unit has no active tenant to bill — choose Landlord or Expense instead.' }
  }

  const reportedDate = String(formData.get('reported_date') ?? new Date().toISOString().slice(0, 10))

  // Landlord/expense costs are recorded immediately as an expense —
  // property-scoped for "landlord" so it reduces that owner's net in
  // reconciliation, or property-less for "expense" so it's a general
  // company cost that doesn't touch any owner's payout.
  let expenseId: string | null = null
  if (cost > 0 && billedTo !== 'tenant') {
    let propertyId: string | null = null
    if (billedTo === 'landlord') {
      const { data: unit } = await supabase.from('units').select('property_id').eq('id', unitId).single()
      propertyId = unit?.property_id ?? null
    }

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        org_id: active.org_id,
        property_id: propertyId,
        category: 'Maintenance',
        description,
        amount: cost,
        expense_date: reportedDate,
      })
      .select('id')
      .single()

    if (expenseError) return { error: `Could not record the expense: ${expenseError.message}` }
    expenseId = expense?.id ?? null
  }

  const { error } = await supabase.from('maintenance_records').insert({
    org_id: active.org_id,
    unit_id: unitId,
    lease_id: activeLease?.id ?? null,
    issue_type: String(formData.get('issue_type') ?? 'other') as Enums<'maintenance_issue_type'>,
    description,
    cost,
    billed_to: billedTo,
    billed: billedTo !== 'tenant' || cost <= 0,
    expense_id: expenseId,
    reported_date: reportedDate,
    notes: String(formData.get('notes') ?? '').trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/maintenance')
  revalidatePath('/accounting/expenses')
  return {
    message:
      billedTo === 'tenant'
        ? "Maintenance record added — will be billed on the tenant's next invoice."
        : billedTo === 'landlord'
          ? 'Maintenance record added and logged as an expense against the property owner.'
          : 'Maintenance record added and logged as a general company expense.',
  }
}

export async function updateMaintenanceStatus(id: string, status: Enums<'maintenance_status'>) {
  const { supabase } = await requireActiveOrg()

  const { error } = await supabase
    .from('maintenance_records')
    .update({
      status,
      resolved_date: status === 'resolved' ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)

  revalidatePath('/maintenance')
  if (error) return { error: error.message }
}

export async function deleteMaintenanceRecord(id: string) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('maintenance_records').delete().eq('id', id)
  revalidatePath('/maintenance')
  if (error) return { error: error.message }
}
