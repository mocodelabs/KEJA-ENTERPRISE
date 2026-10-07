import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import {
  recordPaymentAndSendReceipt,
  findTenantByPhone,
  findOldestOpenInvoiceForTenant,
} from '@/lib/services/paymentsService'

/**
 * Safaricom Daraja C2B "Confirmation" webhook — register this exact URL
 * (https://<your-domain>/api/webhooks/mpesa/{orgId}) via the C2B Register
 * URL API once you have live Daraja credentials:
 * https://developer.safaricom.co.ke/APIs/CustomerToBusinessRegisterURL
 *
 * Safaricom always POSTs this shape to the confirmation URL:
 * {
 *   "TransactionType": "Pay Bill",
 *   "TransID": "RKTQDM7W6S",
 *   "TransTime": "20191122063845",
 *   "TransAmount": "10",
 *   "BusinessShortCode": "600638",
 *   "BillRefNumber": "invoice008",
 *   "MSISDN": "254708374149",
 *   "FirstName": "John", "MiddleName": "", "LastName": "Doe"
 * }
 * and expects a 200 response with { "ResultCode": 0, "ResultDesc": "..." }
 * no matter what you do with it (returning a non-zero code or erroring
 * causes Safaricom to retry, so we always ack once the payload is parsed).
 *
 * Matching strategy: the payer's phone (MSISDN) is matched against
 * `tenants.phone`, then the payment is applied to that tenant's oldest open
 * invoice. `BillRefNumber` (the "Account Number" the payer types in) is
 * stored as the payment reference for manual reconciliation but isn't used
 * for matching yet — wire that in once tenants are given a stable account
 * reference (e.g. their unit number) to quote.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const supabase = createServiceClient()

  const body = await request.json().catch(() => null)
  const transId = body?.TransID ? String(body.TransID) : null
  const amount = body?.TransAmount ? Number(body.TransAmount) : null
  const msisdn = body?.MSISDN ? String(body.MSISDN) : null
  const shortCode = body?.BusinessShortCode ? String(body.BusinessShortCode) : null

  if (!transId || !amount || !msisdn) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected — unrecognized payload' })
  }

  // Sanity check: only accept for an org with an active Paybill/Till gateway,
  // and (when configured) matching the shortcode that paid in.
  const { data: gateways } = await supabase
    .from('payment_gateways')
    .select('provider, config')
    .eq('org_id', orgId)
    .in('provider', ['mpesa_paybill', 'mpesa_till'])
    .eq('is_active', true)

  const gateway = (gateways ?? []).find((g) => {
    const config = g.config as Record<string, unknown>
    const configuredCode = String(config.paybill_number ?? config.till_number ?? '')
    return !shortCode || !configuredCode || configuredCode === shortCode
  })

  if (!gateway) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected — no matching gateway configured' })
  }

  // Idempotency: Safaricom retries confirmations that don't succeed fast enough.
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('org_id', orgId)
    .eq('reference', transId)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' })
  }

  const tenant = await findTenantByPhone(supabase, orgId, msisdn)
  if (!tenant) {
    console.warn(`[mpesa webhook] org ${orgId}: no tenant matches phone ${msisdn} (txn ${transId})`)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const invoice = await findOldestOpenInvoiceForTenant(supabase, orgId, tenant.id)
  if (!invoice) {
    console.warn(`[mpesa webhook] org ${orgId}: tenant ${tenant.id} has no open invoice (txn ${transId})`)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const result = await recordPaymentAndSendReceipt(supabase, {
    orgId,
    invoiceId: invoice.id,
    amount,
    method: 'mpesa',
    reference: transId,
  })

  if (result.error) {
    console.error(`[mpesa webhook] org ${orgId}: failed to record payment for txn ${transId}: ${result.error}`)
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
