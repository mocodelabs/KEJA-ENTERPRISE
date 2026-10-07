import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Enums } from '@/lib/types/database'
import { logMessage } from '@/lib/services/messagingService'
import { renderTemplate } from '@/lib/services/templateTokens'

type DB = SupabaseClient<Database>

/**
 * Records a payment against an invoice, then sends the receipt the DB
 * trigger auto-generated (`create_receipt_for_payment`) to the tenant.
 * Shared by the manual "record payment" form and the automated payment
 * webhooks (M-Pesa, bank) — this is the one place that turns "money came
 * in" into "invoice updated + receipt sent."
 */
export async function recordPaymentAndSendReceipt(
  supabase: DB,
  opts: {
    orgId: string
    invoiceId: string
    amount: number
    method: Enums<'payment_method'>
    reference?: string | null
  }
) {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      org_id: opts.orgId,
      invoice_id: opts.invoiceId,
      amount: opts.amount,
      method: opts.method,
      reference: opts.reference ?? null,
    })
    .select()
    .single()

  if (error || !payment) return { error: error?.message ?? 'Could not record payment.' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, lease:leases(tenant:tenants(*), unit:units(unit_no, property:properties(name)))')
    .eq('id', opts.invoiceId)
    .single()

  const { data: receipt } = await supabase.from('receipts').select('*').eq('payment_id', payment.id).single()

  if (invoice?.lease?.tenant && receipt) {
    const { data: template } = await supabase
      .from('message_templates')
      .select('*')
      .eq('org_id', opts.orgId)
      .eq('template_type', 'receipt')
      .limit(1)
      .maybeSingle()

    const body = renderTemplate(
      template?.body ?? 'Hi {{tenant_name}}, we received your payment of {{amount}}. Receipt No: {{receipt_no}}.',
      {
        tenant_name: invoice.lease.tenant.full_name,
        amount: opts.amount.toFixed(2),
        property_name: invoice.lease.unit?.property?.name ?? '',
        unit_no: invoice.lease.unit?.unit_no ?? '',
        receipt_no: receipt.receipt_no,
      }
    )

    const result = await logMessage(supabase, {
      orgId: opts.orgId,
      tenantId: invoice.lease.tenant.id,
      templateId: template?.id ?? null,
      recipient: invoice.lease.tenant.phone,
      body,
    })

    if (result.success) {
      await supabase.from('receipts').update({ sent_at: new Date().toISOString(), channel: 'sms' }).eq('id', receipt.id)
    }
  }

  return { payment, invoice, receipt }
}

/** Last 9 digits of a phone number, so "0712345678", "254712345678", and "+254712345678" all compare equal. */
export function phoneKey(raw: string) {
  return raw.replace(/\D/g, '').slice(-9)
}

export async function findTenantByPhone(supabase: DB, orgId: string, phone: string) {
  const key = phoneKey(phone)
  if (!key) return null
  const { data: tenants } = await supabase.from('tenants').select('id, full_name, phone').eq('org_id', orgId)
  return (tenants ?? []).find((t) => phoneKey(t.phone) === key) ?? null
}

/** The oldest open (sent/partial/overdue) invoice across the tenant's active leases. */
export async function findOldestOpenInvoiceForTenant(supabase: DB, orgId: string, tenantId: string) {
  const { data: leases } = await supabase.from('leases').select('id').eq('org_id', orgId).eq('tenant_id', tenantId)
  const leaseIds = (leases ?? []).map((l) => l.id)
  if (leaseIds.length === 0) return null

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('org_id', orgId)
    .in('lease_id', leaseIds)
    .in('status', ['sent', 'partial', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  return invoice
}
