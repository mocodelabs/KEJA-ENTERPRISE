import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type DB = SupabaseClient<Database>

/**
 * Computes gross revenue, commission, expenses, and net-to-owner for a
 * property over a period, then upserts the result into commission_ledger
 * as a "pending" reconciliation for review. If this exact property/period
 * was already marked "reconciled" by a user, it's left untouched — once
 * confirmed, a re-run (automated or manual) must never silently flip it
 * back to pending.
 */
export async function runReconciliationForPeriod(
  supabase: DB,
  orgId: string,
  propertyId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: existing } = await supabase
    .from('commission_ledger')
    .select('status')
    .eq('property_id', propertyId)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
    .maybeSingle()

  if (existing?.status === 'reconciled') {
    return { grossRevenue: 0, commissionAmount: 0, totalExpenses: 0, netToOwner: 0, error: null, skipped: true }
  }

  const [{ data: property }, { data: org }] = await Promise.all([
    supabase.from('properties').select('*').eq('id', propertyId).single(),
    supabase.from('organizations').select('*').eq('id', orgId).single(),
  ])

  const { data: units } = await supabase.from('units').select('id').eq('property_id', propertyId)
  const unitIds = (units ?? []).map((u) => u.id)

  const { data: leases } = unitIds.length
    ? await supabase.from('leases').select('id').in('unit_id', unitIds)
    : { data: [] }
  const leaseIds = (leases ?? []).map((l) => l.id)

  const { data: invoices } = leaseIds.length
    ? await supabase.from('invoices').select('id').in('lease_id', leaseIds)
    : { data: [] }
  const invoiceIds = (invoices ?? []).map((i) => i.id)

  const { data: payments } = invoiceIds.length
    ? await supabase
        .from('payments')
        .select('amount')
        .in('invoice_id', invoiceIds)
        .gte('paid_at', periodStart)
        .lte('paid_at', periodEnd + 'T23:59:59')
    : { data: [] }
  const grossRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('property_id', propertyId)
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd)
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)

  const commissionRate = property?.commission_rate ?? org?.default_commission_rate ?? 10
  const commissionAmount = (grossRevenue * Number(commissionRate)) / 100
  const netToOwner = grossRevenue - commissionAmount - totalExpenses

  const { error } = await supabase.from('commission_ledger').upsert(
    {
      org_id: orgId,
      property_id: propertyId,
      period_start: periodStart,
      period_end: periodEnd,
      gross_revenue: grossRevenue,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      total_expenses: totalExpenses,
      net_to_owner: netToOwner,
      status: 'pending',
    },
    { onConflict: 'property_id,period_start,period_end' }
  )

  return { grossRevenue, commissionAmount, totalExpenses, netToOwner, error, skipped: false }
}

/**
 * Runs reconciliation for every property in the org for the given period.
 * Used by the month-end automation (see daily-cycle) to keep pending
 * reconciliations up to date without ever touching ones a user already
 * confirmed as reconciled.
 */
export async function runReconciliationForAllProperties(
  supabase: DB,
  orgId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: properties } = await supabase.from('properties').select('id').eq('org_id', orgId)

  let reconciled = 0
  let skipped = 0

  for (const property of properties ?? []) {
    const result = await runReconciliationForPeriod(supabase, orgId, property.id, periodStart, periodEnd)
    if (result.skipped) skipped++
    else if (!result.error) reconciled++
  }

  return { reconciled, skipped }
}
