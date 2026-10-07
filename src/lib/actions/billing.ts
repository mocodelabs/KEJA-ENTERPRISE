'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { generateInvoicesForPeriod, runBillingAutomation } from '@/lib/services/billingEngine'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

export async function addMeterReading(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const unitId = String(formData.get('unit_id') ?? '')
  if (!unitId) return { error: 'Select a unit.' }

  // Peg the reading to whoever is actively leasing the unit right now, so it
  // bills to the correct tenant even if the unit changes hands before the
  // reading is invoiced.
  const { data: activeLease } = await supabase
    .from('leases')
    .select('id')
    .eq('unit_id', unitId)
    .eq('status', 'active')
    .maybeSingle()

  const { error } = await supabase.from('meter_readings').insert({
    org_id: active.org_id,
    unit_id: unitId,
    lease_id: activeLease?.id ?? null,
    meter_type: String(formData.get('meter_type') ?? 'water') as Enums<'meter_type'>,
    reading_date: String(formData.get('reading_date') ?? new Date().toISOString().slice(0, 10)),
    previous_reading: Number(formData.get('previous_reading') ?? 0),
    current_reading: Number(formData.get('current_reading') ?? 0),
    rate_per_unit: Number(formData.get('rate_per_unit') ?? 0),
  })

  if (error) return { error: error.message }
  revalidatePath('/billing/meter-readings')
  return {
    message: activeLease
      ? 'Meter reading recorded and pegged to the current tenant.'
      : 'Meter reading recorded — no active tenant on this unit, so it will bill whoever moves in next.',
  }
}

export async function generateInvoices(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const periodStart = String(formData.get('period_start') ?? '')
  const periodEnd = String(formData.get('period_end') ?? '')
  if (!periodStart || !periodEnd) return { error: 'Period start and end are required.' }

  const result = await generateInvoicesForPeriod(supabase, active.org_id, periodStart, periodEnd)
  revalidatePath('/billing/invoices')
  return { message: `Created ${result.created} invoice(s), skipped ${result.skipped} already billed for this period.` }
}

export async function runAutomationNow() {
  const { supabase, active } = await requireActiveOrg()
  const result = await runBillingAutomation(supabase, active.org_id)
  revalidatePath('/billing/invoices')
  revalidatePath('/messaging/send')
  return result
}

export async function updatePenaltyRule(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()
  const id = String(formData.get('id') ?? '')

  const { error } = await supabase
    .from('penalty_rules')
    .update({
      grace_period_days: Number(formData.get('grace_period_days') ?? 5),
      penalty_kind: String(formData.get('penalty_kind') ?? 'flat') as Enums<'penalty_kind'>,
      penalty_value: Number(formData.get('penalty_value') ?? 0),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/settings/org')
  return { message: 'Penalty rule updated.' }
}

export async function updateReminderRule(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()
  const id = String(formData.get('id') ?? '')

  const { error } = await supabase
    .from('reminder_rules')
    .update({ repeat_every_days: Number(formData.get('repeat_every_days') ?? 3) })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/settings/org')
  return { message: 'Reminder rule updated.' }
}
