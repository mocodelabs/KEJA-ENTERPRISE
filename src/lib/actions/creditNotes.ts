'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { sendDocumentByEmail } from '@/lib/services/emailService'
import { logMessage } from '@/lib/services/messagingService'
import { formatMoney, formatDate } from '@/lib/utils'
import type { AuthActionState } from '@/lib/actions/auth'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

export async function createCreditNote(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  const amount = Number(formData.get('amount') ?? 0)
  if (amount <= 0) return { error: 'Enter a valid amount.' }

  const { count } = await supabase
    .from('credit_notes')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', active.org_id)
  const creditNoteNo = `CN-${String((count ?? 0) + 1).padStart(4, '0')}`

  const invoiceId = String(formData.get('invoice_id') ?? '') || null

  const { error } = await supabase.from('credit_notes').insert({
    org_id: active.org_id,
    invoice_id: invoiceId,
    credit_note_no: creditNoteNo,
    reason: String(formData.get('reason') ?? '') || null,
    amount,
  })

  if (error) return { error: error.message }
  revalidatePath('/credit-notes')
  return { message: `Credit note ${creditNoteNo} created.` }
}

async function loadCreditNoteForSend(
  supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase'],
  orgId: string,
  id: string
) {
  const { data: creditNote } = await supabase
    .from('credit_notes')
    .select(
      '*, invoice:invoices(lease:leases(tenant:tenants(id, full_name, phone, email), unit:units(unit_no, property:properties(name))))'
    )
    .eq('org_id', orgId)
    .eq('id', id)
    .single()

  return creditNote
}

export async function sendCreditNoteEmail(id: string) {
  const { supabase, active } = await requireActiveOrg()

  const creditNote = await loadCreditNoteForSend(supabase, active.org_id, id)
  if (!creditNote) return { error: 'Credit note not found.' }

  const tenant = creditNote.invoice?.lease?.tenant
  if (!tenant?.email) return { error: 'This tenant has no email on file.' }

  const unit = creditNote.invoice?.lease?.unit
  const pdfDoc: PdfDocument = {
    docType: 'CREDIT NOTE',
    docNumber: creditNote.credit_note_no,
    orgName: active.organization.name,
    currency: active.organization.currency,
    metaRows: [
      { label: 'Tenant', value: tenant.full_name },
      { label: 'Property', value: `${unit?.property?.name ?? ''} · Unit ${unit?.unit_no ?? ''}` },
      { label: 'Issued', value: formatDate(creditNote.issued_at) },
    ],
    items: [{ description: creditNote.reason ?? 'Credit', amount: Number(creditNote.amount) }],
    totals: [{ label: 'Amount', value: Number(creditNote.amount), emphasize: true }],
  }

  const result = await sendDocumentByEmail({
    to: tenant.email,
    subject: `Credit Note ${creditNote.credit_note_no} from ${active.organization.name}`,
    text: `Hi ${tenant.full_name}, please find attached credit note ${creditNote.credit_note_no}.`,
    doc: pdfDoc,
    filename: `${creditNote.credit_note_no}.pdf`,
  })

  return result.success ? { message: 'Credit note emailed.' } : { error: result.error ?? 'Could not send email.' }
}

export async function sendCreditNoteWhatsapp(id: string) {
  const { supabase, active } = await requireActiveOrg()

  const creditNote = await loadCreditNoteForSend(supabase, active.org_id, id)
  if (!creditNote) return { error: 'Credit note not found.' }

  const tenant = creditNote.invoice?.lease?.tenant
  if (!tenant?.phone) return { error: 'This tenant has no phone number on file.' }

  const unit = creditNote.invoice?.lease?.unit
  const currency = active.organization.currency
  const lines = [
    `Credit Note ${creditNote.credit_note_no} from ${active.organization.name}`,
    `Unit: ${unit?.property?.name ?? ''} · ${unit?.unit_no ?? ''}`,
    creditNote.reason ? `Reason: ${creditNote.reason}` : null,
    `Amount: ${formatMoney(Number(creditNote.amount), currency)}`,
    `Issued: ${formatDate(creditNote.issued_at)}`,
  ].filter((line): line is string => Boolean(line))

  const result = await logMessage(supabase, {
    orgId: active.org_id,
    tenantId: tenant.id,
    recipient: tenant.phone,
    body: lines.join('\n'),
    channel: 'whatsapp',
  })

  return result.success ? { message: 'Credit note sent via WhatsApp.' } : { error: result.error ?? 'Failed to send.' }
}
