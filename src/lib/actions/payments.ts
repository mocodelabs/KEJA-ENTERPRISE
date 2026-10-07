'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { recordPaymentAndSendReceipt } from '@/lib/services/paymentsService'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'

export async function recordPayment(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()
  const invoiceId = String(formData.get('invoice_id') ?? '')
  const amount = Number(formData.get('amount') ?? 0)
  if (!invoiceId || amount <= 0) return { error: 'Select an invoice and enter a valid amount.' }

  const result = await recordPaymentAndSendReceipt(supabase, {
    orgId: active.org_id,
    invoiceId,
    amount,
    method: String(formData.get('method') ?? 'mpesa') as Enums<'payment_method'>,
    reference: String(formData.get('reference') ?? '') || null,
  })

  if (result.error) return { error: result.error }

  revalidatePath('/billing/invoices')
  revalidatePath(`/billing/invoices/${invoiceId}`)
  revalidatePath('/payments')
  revalidatePath('/receipts')
  return { message: 'Payment recorded — receipt generated and sent.' }
}
