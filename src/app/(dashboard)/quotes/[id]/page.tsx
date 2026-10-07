import { notFound } from 'next/navigation'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { QuoteStatusSelect } from '@/components/quotes/quote-status-select'
import { DocumentActions } from '@/components/documents/document-actions'
import { sendQuoteEmail, sendQuoteWhatsapp } from '@/lib/actions/quotes'
import { formatMoney, formatDate } from '@/lib/utils'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(full_name, phone, email), property:properties(name, address, city)')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!quote) notFound()

  const { data: items } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('id')

  const currency = active.organization.currency
  const clientName = quote.client?.full_name ?? quote.client_name
  const isProspectClient = !!quote.client_name && !quote.client_id
  const propertyName = quote.property?.name ?? quote.property_label
  const isProspectProperty = !!quote.property_label && !quote.property_id

  const pdfDoc: PdfDocument = {
    docType: 'QUOTE',
    docNumber: quote.quote_no,
    statusLabel: quote.status,
    orgName: active.organization.name,
    currency,
    metaRows: [
      { label: 'Client', value: clientName ?? '—' },
      { label: 'Property', value: propertyName ?? '—' },
      { label: 'Valid until', value: quote.valid_until ? formatDate(quote.valid_until) : '—' },
      { label: 'Created', value: formatDate(quote.created_at) },
    ],
    items: (items ?? []).map((i) => ({ description: i.description, amount: Number(i.amount) })),
    totals: [{ label: 'Total', value: Number(quote.total_amount), emphasize: true }],
  }

  return (
    <div>
      <PageHeader
        title={`Quote ${quote.quote_no}`}
        description={[clientName, propertyName].filter(Boolean).join(' · ') || 'No client or property on file'}
        action={
          <DocumentActions
            doc={pdfDoc}
            filename={`${quote.quote_no}.pdf`}
            onSendEmail={quote.client?.email ? sendQuoteEmail.bind(null, quote.id) : undefined}
            onSendWhatsApp={quote.client?.phone ? sendQuoteWhatsapp.bind(null, quote.id) : undefined}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <span className="print:hidden">
              <QuoteStatusSelect quoteId={quote.id} status={quote.status} />
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items && items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{formatMoney(Number(item.amount), currency)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty colSpan={2}>No line items.</TableEmpty>
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <div className="flex w-48 justify-between border-t border-slate-200 pt-1 text-sm">
                <span className="font-medium text-slate-500">Total</span>
                <span className="font-semibold">{formatMoney(Number(quote.total_amount), currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Client</span>
              <span className="text-right">
                {clientName ?? '—'}
                {isProspectClient && <Badge variant="info" className="ml-1">Prospect</Badge>}
              </span>
            </div>
            {quote.client?.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span>{quote.client.phone}</span>
              </div>
            )}
            {quote.client?.email && (
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span>{quote.client.email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Property</span>
              <span className="text-right">
                {propertyName ?? '—'}
                {isProspectProperty && <Badge variant="info" className="ml-1">Prospect</Badge>}
              </span>
            </div>
            {quote.property?.address && (
              <div className="flex justify-between">
                <span className="text-slate-500">Address</span>
                <span>{[quote.property.address, quote.property.city].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Valid until</span>
              <span>{quote.valid_until ? formatDate(quote.valid_until) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span>{formatDate(quote.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
