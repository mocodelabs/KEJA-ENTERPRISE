import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { logMessage } from '@/lib/services/messagingService'
import { renderTemplate } from '@/lib/services/templateTokens'
import { meterReadingAmount, meterReadingDescription } from '@/lib/services/meterReadings'

type DB = SupabaseClient<Database>

/**
 * Generates one invoice per active lease for the given billing period,
 * skipping leases that already have an invoice for that exact period.
 * Rolls in any not-yet-billed meter readings for the lease's unit as
 * utility line items.
 */
export async function generateInvoicesForPeriod(
  supabase: DB,
  orgId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: leases } = await supabase
    .from('leases')
    .select('*, tenant:tenants(id, full_name, phone), unit:units(id, unit_no, rent_amount, property:properties(name))')
    .eq('org_id', orgId)
    .eq('status', 'active')

  let created = 0
  let skipped = 0

  for (const lease of leases ?? []) {
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('lease_id', lease.id)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const [year, month] = periodStart.split('-')
    const dueDay = String(Math.min(lease.billing_day, 28)).padStart(2, '0')
    const dueDateStr = `${year}-${month}-${dueDay}`

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        org_id: orgId,
        lease_id: lease.id,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDateStr,
        status: 'sent',
      })
      .select()
      .single()

    if (error || !invoice) continue

    await supabase.from('invoice_items').insert({
      org_id: orgId,
      invoice_id: invoice.id,
      item_type: 'rent',
      description: `Rent – unit ${lease.unit?.unit_no ?? ''}`,
      amount: Number(lease.rent_amount),
    })

    // Scoped to this specific lease (not just the unit) so a reading taken
    // under a previous tenant never bills to whoever moves in next.
    const { data: readings } = await supabase
      .from('meter_readings')
      .select('*')
      .eq('lease_id', lease.id)
      .eq('billed', false)
      .lte('reading_date', periodEnd)

    let utilityTotal = 0
    for (const reading of readings ?? []) {
      const amount = meterReadingAmount(reading)
      if (amount > 0) {
        utilityTotal += amount
        await supabase.from('invoice_items').insert({
          org_id: orgId,
          invoice_id: invoice.id,
          item_type: 'utility',
          description: meterReadingDescription(reading),
          amount,
        })
      }
      await supabase.from('meter_readings').update({ billed: true }).eq('id', reading.id)
    }

    // Maintenance costs the tenant is on the hook for, same idea: only
    // roll in charges recorded under this exact lease.
    const { data: maintenanceCharges } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('lease_id', lease.id)
      .eq('billed_to', 'tenant')
      .eq('billed', false)
      .lte('reported_date', periodEnd)

    for (const record of maintenanceCharges ?? []) {
      const amount = Number(record.cost)
      if (amount > 0) {
        utilityTotal += amount
        await supabase.from('invoice_items').insert({
          org_id: orgId,
          invoice_id: invoice.id,
          item_type: 'other',
          description: `Maintenance – ${record.description}`,
          amount,
        })
      }
      await supabase.from('maintenance_records').update({ billed: true }).eq('id', record.id)
    }

    created++

    if (lease.tenant) {
      await sendTemplatedMessage(
        supabase,
        orgId,
        'invoice_issued',
        lease.tenant,
        lease,
        invoice,
        Number(lease.rent_amount) + utilityTotal,
        { period: `${periodStart} to ${periodEnd}` }
      )
      await supabase.from('invoices').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', invoice.id)
    }
  }

  return { created, skipped }
}

/**
 * Applies late-payment penalties to invoices past their grace period and
 * not yet fully paid, then sends "rent due" / "partial payment" reminders
 * per the org's reminder rules. Safe to call repeatedly (idempotent per day).
 */
export async function runBillingAutomation(supabase: DB, orgId: string) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const { data: penaltyRules } = await supabase.from('penalty_rules').select('*').eq('org_id', orgId)
  const { data: reminderRules } = await supabase.from('reminder_rules').select('*').eq('org_id', orgId)
  const orgWidePenalty = penaltyRules?.find((r) => r.property_id === null)
  const rentDueReminder = reminderRules?.find((r) => r.trigger_type === 'rent_due')
  const partialReminder = reminderRules?.find((r) => r.trigger_type === 'partial_payment')

  const { data: openInvoices } = await supabase
    .from('invoices')
    .select('*, lease:leases(*, tenant:tenants(*), unit:units(unit_no, property:properties(name, id)))')
    .eq('org_id', orgId)
    .in('status', ['sent', 'partial', 'overdue'])

  let penaltiesApplied = 0
  let remindersSent = 0

  for (const invoice of openInvoices ?? []) {
    const lease = invoice.lease
    const tenant = lease?.tenant
    if (!lease || !tenant) continue

    const propertyRule = penaltyRules?.find((r) => r.property_id === lease.unit?.property?.id)
    const rule = propertyRule ?? orgWidePenalty
    const dueDate = new Date(invoice.due_date + 'T00:00:00')
    const graceDays = rule?.grace_period_days ?? 5
    const graceDeadline = new Date(dueDate)
    graceDeadline.setDate(graceDeadline.getDate() + graceDays)

    const balance = Number(invoice.total_amount) - Number(invoice.amount_paid)
    const isPastDue = today > dueDate
    const isPastGrace = today > graceDeadline

    // Mark overdue
    if (isPastDue && invoice.status === 'sent') {
      await supabase.from('invoices').update({ status: 'overdue' }).eq('id', invoice.id)
    }

    // Apply penalty once, after grace period, if balance remains
    if (isPastGrace && !invoice.penalty_applied && balance > 0 && rule) {
      const penaltyAmount =
        rule.penalty_kind === 'percentage' ? (balance * Number(rule.penalty_value)) / 100 : Number(rule.penalty_value)

      await supabase.from('invoice_items').insert({
        org_id: orgId,
        invoice_id: invoice.id,
        item_type: 'penalty',
        description: 'Late payment penalty',
        amount: penaltyAmount,
      })
      await supabase.from('invoices').update({ penalty_applied: true }).eq('id', invoice.id)
      penaltiesApplied++

      await sendTemplatedMessage(supabase, orgId, 'penalty', tenant, lease, invoice, balance + penaltyAmount)
    }

    if (balance <= 0) continue

    // Reminder cadence: rent_due (from due date) or partial_payment (after a part payment)
    const hasPartialPayment = Number(invoice.amount_paid) > 0
    const activeRule = hasPartialPayment ? partialReminder : rentDueReminder
    const repeatDays = activeRule?.repeat_every_days ?? 3

    const lastSent = invoice.last_reminder_sent_at ? new Date(invoice.last_reminder_sent_at) : null
    const daysSinceLast = lastSent ? (today.getTime() - lastSent.getTime()) / 86_400_000 : Infinity

    if (isPastDue && daysSinceLast >= repeatDays) {
      await sendTemplatedMessage(
        supabase,
        orgId,
        hasPartialPayment ? 'partial_reminder' : 'rent_due',
        tenant,
        lease,
        invoice,
        balance
      )
      await supabase.from('invoices').update({ last_reminder_sent_at: today.toISOString() }).eq('id', invoice.id)
      remindersSent++
    }
  }

  return { penaltiesApplied, remindersSent, checkedAt: todayStr }
}

async function sendTemplatedMessage(
  supabase: DB,
  orgId: string,
  templateType: 'invoice_issued' | 'rent_due' | 'partial_reminder' | 'penalty',
  tenant: { id: string; full_name: string; phone: string },
  lease: { unit?: { unit_no: string; property?: { name: string } | null } | null },
  invoice: { due_date: string },
  balance: number,
  extraTokens: Record<string, string> = {}
) {
  const { data: template } = await supabase
    .from('message_templates')
    .select('*')
    .eq('org_id', orgId)
    .eq('template_type', templateType)
    .limit(1)
    .maybeSingle()

  const body = renderTemplate(template?.body ?? '{{tenant_name}}: balance {{balance}} due {{due_date}}.', {
    tenant_name: tenant.full_name,
    amount: balance.toFixed(2),
    balance: balance.toFixed(2),
    due_date: invoice.due_date,
    property_name: lease.unit?.property?.name ?? '',
    unit_no: lease.unit?.unit_no ?? '',
    ...extraTokens,
  })

  await logMessage(supabase, {
    orgId,
    tenantId: tenant.id,
    templateId: template?.id ?? null,
    recipient: tenant.phone,
    body,
  })
}
