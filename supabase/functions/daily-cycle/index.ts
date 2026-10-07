// Scheduled automation: generates this month's rent invoices, applies late
// penalties past the grace period, and sends due/partial-payment SMS
// reminders. Triggered daily by pg_cron (see the `keja-daily-cycle` cron
// job) and can also be run on demand from Settings > "Run billing
// automation now" in the app (which calls the equivalent
// lib/services/billingEngine.ts logic directly instead of this function).
import { createClient } from 'jsr:@supabase/supabase-js@2'

function renderTemplate(body: string, tokens: Record<string, string>) {
  return body.replace(/{{\s*(\w+)\s*}}/g, (match, key) => tokens[key] ?? match)
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const today = new Date()
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()

  // Invoices are issued on the last day of the month, for the month ahead —
  // e.g. on 30/31 Jan, generate and send February's invoices so tenants get
  // notice before the new period's due date rolls around. Computed via Date
  // objects (not raw month-number arithmetic) so a December 31 run correctly
  // rolls over into January of next year.
  const isLastDayOfMonth = today.getUTCDate() === new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const nextMonthFirstDay = new Date(Date.UTC(y, m + 1, 1))
  const nextY = nextMonthFirstDay.getUTCFullYear()
  const nextM = nextMonthFirstDay.getUTCMonth()
  const nextMonthLastDay = new Date(Date.UTC(nextY, nextM + 1, 0)).getUTCDate()
  const periodStart = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`
  const periodEnd = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(nextMonthLastDay).padStart(2, '0')}`

  // Reconciliation covers the month that's ending today (not the month
  // ahead, unlike invoicing above) — by the last day of the month, that
  // period's rent payments should mostly be in.
  const currentMonthLastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const currentPeriodStart = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const currentPeriodEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(currentMonthLastDay).padStart(2, '0')}`

  const summary = {
    orgsProcessed: 0,
    invoicesCreated: 0,
    invoicesSent: 0,
    penaltiesApplied: 0,
    remindersSent: 0,
    reconciliationsPending: 0,
  }

  const { data: orgs } = await supabase.from('organizations').select('id, default_commission_rate')

  for (const org of orgs ?? []) {
    // 1. Generate next month's invoices for active leases, once a month,
    // on the last day of the current month (idempotent either way).
    if (isLastDayOfMonth) {
      const { data: leases } = await supabase
        .from('leases')
        .select('*, tenant:tenants(id, full_name, phone), unit:units(unit_no, rent_amount, property:properties(name))')
        .eq('org_id', org.id)
        .eq('status', 'active')

      for (const lease of leases ?? []) {
        const { data: existing } = await supabase
          .from('invoices')
          .select('id')
          .eq('lease_id', lease.id)
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .maybeSingle()
        if (existing) continue

        const [year, month] = periodStart.split('-')
        const dueDay = String(Math.min(lease.billing_day, 28)).padStart(2, '0')
        const dueDateStr = `${year}-${month}-${dueDay}`

        const { data: invoice } = await supabase
          .from('invoices')
          .insert({
            org_id: org.id,
            lease_id: lease.id,
            period_start: periodStart,
            period_end: periodEnd,
            due_date: dueDateStr,
            status: 'sent',
          })
          .select()
          .single()

        if (invoice) {
          await supabase.from('invoice_items').insert({
            org_id: org.id,
            invoice_id: invoice.id,
            item_type: 'rent',
            description: `Rent – unit ${lease.unit?.unit_no ?? ''}`,
            amount: Number(lease.rent_amount),
          })

          // Scoped to this specific lease (not just the unit) so a reading
          // taken under a previous tenant never bills to whoever moves in next.
          const { data: readings } = await supabase
            .from('meter_readings')
            .select('*')
            .eq('lease_id', lease.id)
            .eq('billed', false)
            .lte('reading_date', periodEnd)

          let utilityTotal = 0
          for (const reading of readings ?? []) {
            const units = Number(reading.current_reading) - Number(reading.previous_reading)
            const amount = Math.max(units, 0) * Number(reading.rate_per_unit)
            if (amount > 0) {
              utilityTotal += amount
              await supabase.from('invoice_items').insert({
                org_id: org.id,
                invoice_id: invoice.id,
                item_type: 'utility',
                description:
                  reading.meter_type === 'garbage'
                    ? 'Garbage collection fee'
                    : `${reading.meter_type} – ${units.toFixed(2)} units @ ${reading.rate_per_unit}`,
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
                org_id: org.id,
                invoice_id: invoice.id,
                item_type: 'other',
                description: `Maintenance – ${record.description}`,
                amount,
              })
            }
            await supabase.from('maintenance_records').update({ billed: true }).eq('id', record.id)
          }

          summary.invoicesCreated++

          if (lease.tenant) {
            await sendTemplated(
              supabase,
              org.id,
              'invoice_issued',
              lease.tenant,
              lease,
              invoice,
              Number(lease.rent_amount) + utilityTotal,
              { period: `${periodStart} to ${periodEnd}` }
            )
            await supabase
              .from('invoices')
              .update({ last_reminder_sent_at: new Date().toISOString() })
              .eq('id', invoice.id)
            summary.invoicesSent++
          }
        }
      }
    }

    // 1b. Auto-reconciliation: compute (but don't finalize) each property's
    // commission_ledger for the month that just ended, once a month, on the
    // last day of the current month. Never touches a property/period a user
    // already marked "reconciled" — that confirmation is always left to a
    // human, never overwritten by automation.
    if (isLastDayOfMonth) {
      const { data: properties } = await supabase.from('properties').select('*').eq('org_id', org.id)

      for (const property of properties ?? []) {
        const { data: existingLedger } = await supabase
          .from('commission_ledger')
          .select('status')
          .eq('property_id', property.id)
          .eq('period_start', currentPeriodStart)
          .eq('period_end', currentPeriodEnd)
          .maybeSingle()

        if (existingLedger?.status === 'reconciled') continue

        const { data: units } = await supabase.from('units').select('id').eq('property_id', property.id)
        const unitIds = (units ?? []).map((u: { id: string }) => u.id)

        const { data: propLeases } = unitIds.length
          ? await supabase.from('leases').select('id').in('unit_id', unitIds)
          : { data: [] }
        const leaseIds = (propLeases ?? []).map((l: { id: string }) => l.id)

        const { data: propInvoices } = leaseIds.length
          ? await supabase.from('invoices').select('id').in('lease_id', leaseIds)
          : { data: [] }
        const invoiceIds = (propInvoices ?? []).map((i: { id: string }) => i.id)

        const { data: propPayments } = invoiceIds.length
          ? await supabase
              .from('payments')
              .select('amount')
              .in('invoice_id', invoiceIds)
              .gte('paid_at', currentPeriodStart)
              .lte('paid_at', currentPeriodEnd + 'T23:59:59')
          : { data: [] }
        const grossRevenue = (propPayments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)

        const { data: propExpenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('property_id', property.id)
          .gte('expense_date', currentPeriodStart)
          .lte('expense_date', currentPeriodEnd)
        const totalExpenses = (propExpenses ?? []).reduce((s: number, e: { amount: number }) => s + Number(e.amount), 0)

        const commissionRate = property.commission_rate ?? org.default_commission_rate ?? 10
        const commissionAmount = (grossRevenue * Number(commissionRate)) / 100
        const netToOwner = grossRevenue - commissionAmount - totalExpenses

        await supabase.from('commission_ledger').upsert(
          {
            org_id: org.id,
            property_id: property.id,
            period_start: currentPeriodStart,
            period_end: currentPeriodEnd,
            gross_revenue: grossRevenue,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            total_expenses: totalExpenses,
            net_to_owner: netToOwner,
            status: 'pending',
          },
          { onConflict: 'property_id,period_start,period_end' }
        )
        summary.reconciliationsPending++
      }
    }

    // 2. Penalties + reminders on open invoices.
    const { data: penaltyRules } = await supabase.from('penalty_rules').select('*').eq('org_id', org.id)
    const { data: reminderRules } = await supabase.from('reminder_rules').select('*').eq('org_id', org.id)
    const orgWidePenalty = penaltyRules?.find((r) => r.property_id === null)
    const rentDueReminder = reminderRules?.find((r) => r.trigger_type === 'rent_due')
    const partialReminder = reminderRules?.find((r) => r.trigger_type === 'partial_payment')

    const { data: openInvoices } = await supabase
      .from('invoices')
      .select('*, lease:leases(*, tenant:tenants(*), unit:units(unit_no, property:properties(id, name)))')
      .eq('org_id', org.id)
      .in('status', ['sent', 'partial', 'overdue'])

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

      if (isPastDue && invoice.status === 'sent') {
        await supabase.from('invoices').update({ status: 'overdue' }).eq('id', invoice.id)
      }

      if (isPastGrace && !invoice.penalty_applied && balance > 0 && rule) {
        const penaltyAmount =
          rule.penalty_kind === 'percentage' ? (balance * Number(rule.penalty_value)) / 100 : Number(rule.penalty_value)

        await supabase.from('invoice_items').insert({
          org_id: org.id,
          invoice_id: invoice.id,
          item_type: 'penalty',
          description: 'Late payment penalty',
          amount: penaltyAmount,
        })
        await supabase.from('invoices').update({ penalty_applied: true }).eq('id', invoice.id)
        summary.penaltiesApplied++

        await sendTemplated(supabase, org.id, 'penalty', tenant, lease, invoice, balance + penaltyAmount)
      }

      if (balance <= 0) continue

      const hasPartialPayment = Number(invoice.amount_paid) > 0
      const activeRule = hasPartialPayment ? partialReminder : rentDueReminder
      const repeatDays = activeRule?.repeat_every_days ?? 3
      const lastSent = invoice.last_reminder_sent_at ? new Date(invoice.last_reminder_sent_at) : null
      const daysSinceLast = lastSent ? (today.getTime() - lastSent.getTime()) / 86_400_000 : Infinity

      if (isPastDue && daysSinceLast >= repeatDays) {
        await sendTemplated(
          supabase,
          org.id,
          hasPartialPayment ? 'partial_reminder' : 'rent_due',
          tenant,
          lease,
          invoice,
          balance
        )
        await supabase.from('invoices').update({ last_reminder_sent_at: today.toISOString() }).eq('id', invoice.id)
        summary.remindersSent++
      }
    }

    summary.orgsProcessed++
  }

  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
})

// deno-lint-ignore no-explicit-any
async function sendTemplated(
  supabase: any,
  orgId: string,
  templateType: string,
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

  const { data: logRow } = await supabase
    .from('messages_log')
    .insert({
      org_id: orgId,
      tenant_id: tenant.id,
      template_id: template?.id ?? null,
      recipient: tenant.phone,
      body,
      status: 'queued',
    })
    .select()
    .single()

  // Same provider-stub pattern as lib/services/messagingService.ts: logs
  // unless Africa's Talking credentials are set as function secrets.
  const apiKey = Deno.env.get('AFRICASTALKING_API_KEY')
  let success = true
  if (apiKey) {
    // TODO: wire the real Africa's Talking request here (see
    // src/lib/services/messagingService.ts for the request shape).
    success = false
  } else {
    console.log(`[SMS stub -> ${tenant.phone}] ${body}`)
  }

  if (logRow) {
    await supabase
      .from('messages_log')
      .update({ status: success ? 'sent' : 'failed', sent_at: success ? new Date().toISOString() : null })
      .eq('id', logRow.id)
  }
}
