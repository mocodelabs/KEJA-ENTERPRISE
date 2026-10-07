import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  recordPaymentAndSendReceipt,
  findTenantByPhone,
  findOldestOpenInvoiceForTenant,
} from '@/lib/services/paymentsService'

/**
 * Generic bank payment-notification webhook — unlike M-Pesa's Daraja API,
 * there's no single standard shape here: Equity's Jenga API, KCB's Buni,
 * Co-op's API, etc. all differ in payload and auth. This expects a minimal
 * generic body until a specific bank integration is chosen:
 *   { "transactionId": "...", "amount": 1000, "phone": "2547..." }
 * Swap the parsing below for the real bank's callback shape (and add its
 * signature/auth verification) once you know which bank you're integrating.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const supabase = createServiceClient()

  const body = await request.json().catch(() => null)
  const transactionId = body?.transactionId ? String(body.transactionId) : null
  const amount = body?.amount ? Number(body.amount) : null
  const phone = body?.phone ? String(body.phone) : null

  if (!transactionId || !amount || !phone) {
    return NextResponse.json({ error: 'Unrecognized payload' }, { status: 400 })
  }

  const { data: gateway } = await supabase
    .from('payment_gateways')
    .select('id')
    .eq('org_id', orgId)
    .eq('provider', 'bank_account')
    .eq('is_active', true)
    .maybeSingle()

  if (!gateway) {
    return NextResponse.json({ error: 'No bank gateway configured for this org' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('org_id', orgId)
    .eq('reference', transactionId)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ status: 'already processed' })
  }

  const tenant = await findTenantByPhone(supabase, orgId, phone)
  if (!tenant) {
    console.warn(`[bank webhook] org ${orgId}: no tenant matches phone ${phone} (txn ${transactionId})`)
    return NextResponse.json({ status: 'accepted, no matching tenant' })
  }

  const invoice = await findOldestOpenInvoiceForTenant(supabase, orgId, tenant.id)
  if (!invoice) {
    console.warn(`[bank webhook] org ${orgId}: tenant ${tenant.id} has no open invoice (txn ${transactionId})`)
    return NextResponse.json({ status: 'accepted, no open invoice' })
  }

  const result = await recordPaymentAndSendReceipt(supabase, {
    orgId,
    invoiceId: invoice.id,
    amount,
    method: 'bank',
    reference: transactionId,
  })

  if (result.error) {
    console.error(`[bank webhook] org ${orgId}: failed to record payment for txn ${transactionId}: ${result.error}`)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok' })
}
