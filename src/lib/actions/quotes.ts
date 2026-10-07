'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/session'
import { sendDocumentByEmail } from '@/lib/services/emailService'
import { logMessage } from '@/lib/services/messagingService'
import { formatMoney, formatDate } from '@/lib/utils'
import type { AuthActionState } from '@/lib/actions/auth'
import type { Enums } from '@/lib/types/database'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

type LineItem = { description: string; amount: number }

export async function createQuote(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { supabase, active } = await requireActiveOrg()

  let items: LineItem[] = []
  try {
    items = JSON.parse(String(formData.get('items_json') ?? '[]'))
  } catch {
    return { error: 'Invalid line items.' }
  }
  items = items.filter((i) => i.description?.trim() && i.amount > 0)
  if (items.length === 0) return { error: 'Add at least one line item.' }

  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', active.org_id)
  const quoteNo = `QT-${String((count ?? 0) + 1).padStart(4, '0')}`

  const total = items.reduce((s, i) => s + i.amount, 0)
  const validUntil = String(formData.get('valid_until') ?? '') || null

  const clientIdRaw = String(formData.get('client_id') ?? '')
  const clientId = clientIdRaw && clientIdRaw !== '__new__' ? clientIdRaw : null
  const clientName = clientIdRaw === '__new__' ? String(formData.get('client_name') ?? '').trim() || null : null

  const propertyIdRaw = String(formData.get('property_id') ?? '')
  const propertyId = propertyIdRaw && propertyIdRaw !== '__new__' ? propertyIdRaw : null
  const propertyLabel =
    propertyIdRaw === '__new__' ? String(formData.get('property_label') ?? '').trim() || null : null

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      org_id: active.org_id,
      client_id: clientId,
      client_name: clientName,
      property_id: propertyId,
      property_label: propertyLabel,
      quote_no: quoteNo,
      valid_until: validUntil,
      total_amount: total,
    })
    .select()
    .single()

  if (error || !quote) return { error: error?.message ?? 'Could not create quote.' }

  await supabase
    .from('quote_items')
    .insert(items.map((i) => ({ org_id: active.org_id, quote_id: quote.id, description: i.description, amount: i.amount })))

  revalidatePath('/quotes')
  return { message: `Quote ${quoteNo} created.` }
}

export async function updateQuoteStatus(id: string, status: Enums<'quote_status'>) {
  const { supabase } = await requireActiveOrg()
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
  revalidatePath('/quotes')
  if (error) return { error: error.message }
}

export async function sendQuoteEmail(id: string) {
  const { supabase, active } = await requireActiveOrg()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(full_name, email)')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!quote) return { error: 'Quote not found.' }
  const recipientEmail = quote.client?.email
  if (!recipientEmail) return { error: 'This client has no email on file.' }

  const { data: items } = await supabase.from('quote_items').select('description, amount').eq('quote_id', id).order('id')
  const clientName = quote.client?.full_name ?? quote.client_name ?? 'there'

  const pdfDoc: PdfDocument = {
    docType: 'QUOTE',
    docNumber: quote.quote_no,
    statusLabel: quote.status,
    orgName: active.organization.name,
    currency: active.organization.currency,
    metaRows: [
      { label: 'Client', value: clientName },
      { label: 'Valid until', value: quote.valid_until ? formatDate(quote.valid_until) : '—' },
    ],
    items: (items ?? []).map((i) => ({ description: i.description, amount: Number(i.amount) })),
    totals: [{ label: 'Total', value: Number(quote.total_amount), emphasize: true }],
  }

  const result = await sendDocumentByEmail({
    to: recipientEmail,
    subject: `Quote ${quote.quote_no} from ${active.organization.name}`,
    text: `Hi ${clientName}, please find attached quote ${quote.quote_no} for your review.`,
    doc: pdfDoc,
    filename: `${quote.quote_no}.pdf`,
  })

  return result.success ? { message: 'Quote emailed.' } : { error: result.error ?? 'Could not send email.' }
}

export async function sendQuoteWhatsapp(id: string) {
  const { supabase, active } = await requireActiveOrg()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(full_name, phone)')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!quote) return { error: 'Quote not found.' }
  const phone = quote.client?.phone
  if (!phone) return { error: 'This client has no phone number on file.' }

  const { data: items } = await supabase.from('quote_items').select('description, amount').eq('quote_id', id).order('id')
  const currency = active.organization.currency

  const lines = [
    `Quote ${quote.quote_no} from ${active.organization.name}`,
    ...(items ?? []).map((i) => `${i.description}: ${formatMoney(Number(i.amount), currency)}`),
    `Total: ${formatMoney(Number(quote.total_amount), currency)}`,
    quote.valid_until ? `Valid until: ${formatDate(quote.valid_until)}` : null,
  ].filter((line): line is string => Boolean(line))

  const result = await logMessage(supabase, {
    orgId: active.org_id,
    recipient: phone,
    body: lines.join('\n'),
    channel: 'whatsapp',
  })

  return result.success ? { message: 'Quote sent via WhatsApp.' } : { error: result.error ?? 'Failed to send.' }
}
