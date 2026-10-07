import { notFound } from 'next/navigation'
import Link from 'next/link'
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
import { PaymentForm } from '@/components/payments/payment-form'
import { DocumentActions } from '@/components/documents/document-actions'
import { formatMoney, formatDate } from '@/lib/utils'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, lease:leases(tenant:tenants(*), unit:units(unit_no, property:properties(name)))')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('created_at'),
    supabase.from('payments').select('*, receipts(receipt_no)').eq('invoice_id', id).order('paid_at', { ascending: false }),
  ])

  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid)
  const currency = active.organization.currency

  const pdfDoc: PdfDocument = {
    docType: 'INVOICE',
    docNumber: invoice.id.slice(0, 8).toUpperCase(),
    statusLabel: invoice.status,
    orgName: active.organization.name,
    currency,
    metaRows: [
      { label: 'Tenant', value: invoice.lease?.tenant?.full_name ?? '—' },
      { label: 'Phone', value: invoice.lease?.tenant?.phone ?? '—' },
      {
        label: 'Property',
        value: `${invoice.lease?.unit?.property?.name ?? ''} · Unit ${invoice.lease?.unit?.unit_no ?? ''}`,
      },
      { label: 'Period', value: `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}` },
      { label: 'Due date', value: formatDate(invoice.due_date) },
    ],
    items: (items ?? []).map((i) => ({ description: i.description, amount: Number(i.amount) })),
    totals: [
      { label: 'Total', value: Number(invoice.total_amount) },
      { label: 'Paid', value: Number(invoice.amount_paid) },
      { label: 'Balance', value: balance, emphasize: true },
    ],
  }

  return (
    <div>
      <PageHeader
        title={`Invoice — ${invoice.lease?.tenant?.full_name ?? 'Unknown tenant'}`}
        description={`${invoice.lease?.unit?.property?.name ?? ''} · Unit ${invoice.lease?.unit?.unit_no ?? ''}`}
        action={<DocumentActions doc={pdfDoc} filename={`Invoice-${pdfDoc.docNumber}.pdf`} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Line items</CardTitle>
            <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}>
              {invoice.status}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items && items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="capitalize">{item.item_type}</TableCell>
                      <TableCell className="text-right">{formatMoney(Number(item.amount), currency)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty colSpan={3}>No line items.</TableEmpty>
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div className="flex w-48 justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-medium">{formatMoney(Number(invoice.total_amount), currency)}</span>
              </div>
              <div className="flex w-48 justify-between">
                <span className="text-slate-500">Paid</span>
                <span className="font-medium">{formatMoney(Number(invoice.amount_paid), currency)}</span>
              </div>
              <div className="flex w-48 justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-500">Balance</span>
                <span className="font-semibold">{formatMoney(balance, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Period</span>
              <span>
                {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due date</span>
              <span>{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tenant phone</span>
              <span>{invoice.lease?.tenant?.phone}</span>
            </div>
            {invoice.lease?.tenant && (
              <Link
                href={`/tenants`}
                className="mt-2 text-sm font-medium text-emerald-700 hover:underline print:hidden"
              >
                View tenant →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {balance > 0 && (
        <Card className="mt-6 print:hidden">
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm invoiceId={invoice.id} />
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments && payments.length > 0 ? (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paid_at)}</TableCell>
                    <TableCell className="uppercase">{p.method}</TableCell>
                    <TableCell>{p.reference ?? '—'}</TableCell>
                    <TableCell>{p.receipts?.[0]?.receipt_no ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(p.amount), currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No payments yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
