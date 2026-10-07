import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentActions } from '@/components/documents/document-actions'
import { formatMoney, formatDate } from '@/lib/utils'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()

  const { data: receipt } = await supabase
    .from('receipts')
    .select(
      '*, payment:payments(*, invoice:invoices(id, period_start, period_end, lease:leases(tenant:tenants(full_name, phone), unit:units(unit_no, property:properties(name, address, city)))))'
    )
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!receipt) notFound()

  const currency = active.organization.currency
  const tenant = receipt.payment?.invoice?.lease?.tenant
  const unit = receipt.payment?.invoice?.lease?.unit
  const invoiceId = receipt.payment?.invoice?.id

  const pdfDoc: PdfDocument = {
    docType: 'RECEIPT',
    docNumber: receipt.receipt_no,
    orgName: active.organization.name,
    currency,
    metaRows: [
      { label: 'Tenant', value: tenant?.full_name ?? '—' },
      { label: 'Phone', value: tenant?.phone ?? '—' },
      { label: 'Property', value: `${unit?.property?.name ?? ''} · Unit ${unit?.unit_no ?? ''}` },
      { label: 'Paid on', value: formatDate(receipt.payment?.paid_at ?? receipt.created_at) },
      { label: 'Method', value: (receipt.payment?.method ?? '—').toUpperCase() },
      { label: 'Reference', value: receipt.payment?.reference ?? '—' },
    ],
    items: [{ description: 'Payment received', amount: Number(receipt.payment?.amount ?? 0) }],
    totals: [{ label: 'Amount received', value: Number(receipt.payment?.amount ?? 0), emphasize: true }],
    footerNote: 'Thank you for your payment.',
  }

  return (
    <div>
      <PageHeader
        title={`Receipt ${receipt.receipt_no}`}
        description={`${tenant?.full_name ?? 'Unknown tenant'} · ${unit?.property?.name ?? ''} Unit ${unit?.unit_no ?? ''}`}
        action={<DocumentActions doc={pdfDoc} filename={`${receipt.receipt_no}.pdf`} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Payment received</CardTitle>
            <Badge variant={receipt.sent_at ? 'success' : 'default'}>{receipt.sent_at ? 'Sent to tenant' : 'Not sent'}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-md border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">Amount received</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {formatMoney(Number(receipt.payment?.amount ?? 0), currency)}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Paid via {(receipt.payment?.method ?? '—').toUpperCase()}
                {receipt.payment?.reference ? ` · Ref: ${receipt.payment.reference}` : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Tenant</span>
              <span>{tenant?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone</span>
              <span>{tenant?.phone ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Property</span>
              <span className="text-right">
                {unit?.property?.name} · {unit?.unit_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid on</span>
              <span>{formatDate(receipt.payment?.paid_at ?? receipt.created_at)}</span>
            </div>
            {invoiceId && (
              <Link
                href={`/billing/invoices/${invoiceId}`}
                className="mt-2 text-sm font-medium text-emerald-700 hover:underline print:hidden"
              >
                View invoice →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
