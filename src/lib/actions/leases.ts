'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/session'
import { logMessage } from '@/lib/services/messagingService'
import { formatMoney, formatDate } from '@/lib/utils'
import type { AuthActionState } from '@/lib/actions/auth'

export async function createLease(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const unitId = String(formData.get('unit_id') ?? '')
  const tenantId = String(formData.get('tenant_id') ?? '')
  const startDate = String(formData.get('start_date') ?? '')
  const rentAmount = Number(formData.get('rent_amount') ?? 0)

  if (!unitId || !tenantId || !startDate) return { error: 'Unit, tenant, and start date are required.' }

  const { error } = await supabase.from('leases').insert({
    org_id: active.org_id,
    unit_id: unitId,
    tenant_id: tenantId,
    start_date: startDate,
    rent_amount: rentAmount,
    deposit_amount: Number(formData.get('deposit_amount') ?? 0),
    billing_day: Number(formData.get('billing_day') ?? 1),
    status: 'active',
  })

  if (error) return { error: error.message }

  await supabase.from('units').update({ status: 'occupied' }).eq('id', unitId)

  revalidatePath('/leases')
  revalidatePath('/tenants')
  return { message: 'Lease created and unit marked occupied.' }
}

export async function updateLease(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase } = await requireActiveOrg()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Missing lease.' }

  const rentAmount = Number(formData.get('rent_amount') ?? 0)
  const depositAmount = Number(formData.get('deposit_amount') ?? 0)
  const billingDay = Number(formData.get('billing_day') ?? 1)
  if (!rentAmount || rentAmount <= 0) return { error: 'Enter a valid rent amount.' }
  if (billingDay < 1 || billingDay > 28) return { error: 'Rent due day must be between 1 and 28.' }

  const { error } = await supabase
    .from('leases')
    .update({ rent_amount: rentAmount, deposit_amount: depositAmount, billing_day: billingDay })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/leases')
  return { message: 'Lease updated.' }
}

export async function endLease(id: string, unitId: string) {
  const { supabase } = await requireActiveOrg()

  const { error } = await supabase
    .from('leases')
    .update({ status: 'ended', end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id)

  if (!error) {
    await supabase.from('units').update({ status: 'vacant' }).eq('id', unitId)
  }

  revalidatePath('/leases')
  revalidatePath('/tenants')
  if (error) return { error: error.message }
}

function parseLineItems(formData: FormData, category: 'maintenance' | 'other', typeField: string, costField: string) {
  const types = formData.getAll(typeField).map(String)
  const costs = formData.getAll(costField).map(String)

  return types
    .map((description, i) => ({ category, description: description.trim(), cost: Number(costs[i]) || 0 }))
    .filter((item) => item.description.length > 0)
}

export async function recordLeaseTermination(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const leaseId = String(formData.get('lease_id') ?? '')
  if (!leaseId) return { error: 'Missing lease.' }

  const { data: lease } = await supabase
    .from('leases')
    .select('id, unit_id, deposit_amount, status')
    .eq('id', leaseId)
    .eq('org_id', active.org_id)
    .single()

  if (!lease) return { error: 'Lease not found.' }
  if (lease.status !== 'active') return { error: 'Only an active lease can be terminated.' }

  const terminationDate = String(formData.get('termination_date') ?? '') || new Date().toISOString().slice(0, 10)
  const arrears = Number(formData.get('arrears') ?? 0) || 0
  const waterDeduction = Number(formData.get('water_deduction') ?? 0) || 0
  const electricityDeduction = Number(formData.get('electricity_deduction') ?? 0) || 0
  const notes = String(formData.get('notes') ?? '').trim() || null

  const maintenanceItems = parseLineItems(formData, 'maintenance', 'maintenance_type', 'maintenance_cost')
  const otherItems = parseLineItems(formData, 'other', 'other_description', 'other_cost')
  const allItems = [...maintenanceItems, ...otherItems]

  const itemsTotal = allItems.reduce((sum, item) => sum + item.cost, 0)
  const totalDeductions = arrears + waterDeduction + electricityDeduction + itemsTotal
  const depositAmount = Number(lease.deposit_amount)
  const refundAmount = depositAmount - totalDeductions

  const { data: termination, error } = await supabase
    .from('lease_terminations')
    .insert({
      org_id: active.org_id,
      lease_id: leaseId,
      termination_date: terminationDate,
      deposit_amount: depositAmount,
      arrears,
      water_deduction: waterDeduction,
      electricity_deduction: electricityDeduction,
      notes,
      total_deductions: totalDeductions,
      refund_amount: refundAmount,
    })
    .select('id')
    .single()

  if (error || !termination) return { error: error?.message ?? 'Could not record termination.' }

  if (allItems.length > 0) {
    const { error: itemsError } = await supabase.from('lease_termination_items').insert(
      allItems.map((item) => ({
        org_id: active.org_id,
        termination_id: termination.id,
        category: item.category,
        description: item.description,
        cost: item.cost,
      }))
    )
    if (itemsError) return { error: `Termination recorded, but items failed: ${itemsError.message}` }
  }

  const { error: leaseError } = await supabase
    .from('leases')
    .update({ status: 'terminated', end_date: terminationDate })
    .eq('id', leaseId)
  if (leaseError) return { error: leaseError.message }

  await supabase.from('units').update({ status: 'vacant' }).eq('id', lease.unit_id)

  revalidatePath('/leases')
  revalidatePath('/tenants')
  redirect(`/leases/${leaseId}/termination`)
}

export async function markDepositRefunded(terminationId: string) {
  const { supabase, active } = await requireActiveOrg()

  const { data: termination } = await supabase
    .from('lease_terminations')
    .select('lease_id')
    .eq('id', terminationId)
    .eq('org_id', active.org_id)
    .single()

  if (!termination) return { error: 'Termination record not found.' }

  const { error } = await supabase
    .from('lease_terminations')
    .update({ refunded: true, refunded_at: new Date().toISOString() })
    .eq('id', terminationId)

  if (error) return { error: error.message }

  revalidatePath(`/leases/${termination.lease_id}/termination`)
  revalidatePath('/accounting')
  revalidatePath('/accounting/ledger')
  return { message: 'Deposit marked as refunded.' }
}

export async function sendTerminationReportWhatsapp(terminationId: string) {
  const { supabase, active } = await requireActiveOrg()

  const { data: termination } = await supabase
    .from('lease_terminations')
    .select(
      '*, lease:leases(id, tenant:tenants(id, full_name, phone), unit:units(unit_no, property:properties(name)))'
    )
    .eq('id', terminationId)
    .eq('org_id', active.org_id)
    .single()

  const tenant = termination?.lease?.tenant
  if (!termination || !tenant) return { error: 'Termination record not found.' }

  const { data: items } = await supabase
    .from('lease_termination_items')
    .select('description, cost')
    .eq('termination_id', terminationId)
    .order('category')

  const currency = active.organization.currency
  const unit = termination.lease?.unit

  const lines = [
    'Lease Termination Report',
    `Tenant: ${tenant.full_name}`,
    `Unit: ${unit?.property?.name ?? ''} · ${unit?.unit_no ?? ''}`,
    `Termination date: ${formatDate(termination.termination_date)}`,
    `Deposit held: ${formatMoney(Number(termination.deposit_amount), currency)}`,
  ]
  if (Number(termination.arrears) > 0) lines.push(`Arrears: ${formatMoney(Number(termination.arrears), currency)}`)
  if (Number(termination.water_deduction) > 0)
    lines.push(`Water deposit deduction: ${formatMoney(Number(termination.water_deduction), currency)}`)
  if (Number(termination.electricity_deduction) > 0)
    lines.push(`Electricity deposit deduction: ${formatMoney(Number(termination.electricity_deduction), currency)}`)
  for (const item of items ?? []) {
    lines.push(`${item.description}: ${formatMoney(Number(item.cost), currency)}`)
  }
  lines.push(`Total deductions: ${formatMoney(Number(termination.total_deductions), currency)}`)
  lines.push(
    Number(termination.refund_amount) >= 0
      ? `Refund due to you: ${formatMoney(Number(termination.refund_amount), currency)}`
      : `Balance owed by you: ${formatMoney(Math.abs(Number(termination.refund_amount)), currency)}`
  )

  const result = await logMessage(supabase, {
    orgId: active.org_id,
    tenantId: tenant.id,
    recipient: tenant.phone,
    body: lines.join('\n'),
    channel: 'whatsapp',
  })

  if (result.success) {
    await supabase.from('lease_terminations').update({ sent_at: new Date().toISOString() }).eq('id', terminationId)
  }

  revalidatePath(`/leases/${termination.lease_id}/termination`)
  return result.success ? { message: 'Sent via WhatsApp.' } : { error: result.error ?? 'Failed to send.' }
}
