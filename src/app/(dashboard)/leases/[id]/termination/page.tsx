import { notFound } from 'next/navigation'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DocumentActions } from '@/components/documents/document-actions'
import { MarkDepositRefundedButton } from '@/components/tenants/mark-deposit-refunded-button'
import { sendTerminationReportWhatsapp } from '@/lib/actions/leases'
import { formatMoney, formatDate } from '@/lib/utils'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

export default async function LeaseTerminationReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()

  const { data: termination } = await supabase
    .from('lease_terminations')
    .select(
      '*, lease:leases(tenant:tenants(full_name, phone), unit:units(unit_no, property:properties(name, address, city)))'
    )
    .eq('org_id', active.org_id)
    .eq('lease_id', id)
    .maybeSingle()

  if (!termination) notFound()

  const { data: items } = await supabase
    .from('lease_termination_items')
    .select('*')
    .eq('termination_id', termination.id)
    .order('category')

  const currency = active.organization.currency
  const tenant = termination.lease?.tenant
  const unit = termination.lease?.unit

  const lineItems = [
    ...(Number(termination.arrears) > 0 ? [{ description: 'Arrears', amount: Number(termination.arrears) }] : []),
    ...(Number(termination.water_deduction) > 0
      ? [{ description: 'Water deposit deduction', amount: Number(termination.water_deduction) }]
      : []),
    ...(Number(termination.electricity_deduction) > 0
      ? [{ description: 'Electricity deposit deduction', amount: Number(termination.electricity_deduction) }]
      : []),
    ...(items ?? []).map((i) => ({ description: i.description, amount: Number(i.cost) })),
  ]

  const isRefund = Number(termination.refund_amount) >= 0

  const pdfDoc: PdfDocument = {
    docType: 'LEASE TERMINATION REPORT',
    docNumber: termination.id.slice(0, 8).toUpperCase(),
    orgName: active.organization.name,
    currency,
    metaRows: [
      { label: 'Tenant', value: tenant?.full_name ?? '—' },
      { label: 'Phone', value: tenant?.phone ?? '—' },
      { label: 'Property', value: `${unit?.property?.name ?? ''} · Unit ${unit?.unit_no ?? ''}` },
      { label: 'Termination date', value: formatDate(termination.termination_date) },
    ],
    items: lineItems.length > 0 ? lineItems : [{ description: 'No deductions recorded', amount: 0 }],
    totals: [
      { label: 'Deposit held', value: Number(termination.deposit_amount) },
      { label: 'Total deductions', value: Number(termination.total_deductions) },
      {
        label: isRefund ? 'Refund due to tenant' : 'Balance owed by tenant',
        value: Math.abs(Number(termination.refund_amount)),
        emphasize: true,
      },
    ],
    footerNote: termination.notes ?? undefined,
  }

  return (
    <div>
      <PageHeader
        title="Lease Termination Report"
        description={`${tenant?.full_name ?? 'Unknown tenant'} · ${unit?.property?.name ?? ''} Unit ${unit?.unit_no ?? ''}`}
        action={
          <DocumentActions
            doc={pdfDoc}
            filename={`lease-termination-${termination.id.slice(0, 8)}.pdf`}
            onSendWhatsApp={sendTerminationReportWhatsapp.bind(null, termination.id)}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Deductions</CardTitle>
            <Badge variant={termination.sent_at ? 'success' : 'default'}>
              {termination.sent_at ? 'Sent via WhatsApp' : 'Not sent'}
            </Badge>
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
                {lineItems.length > 0 ? (
                  lineItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.amount, currency)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-400">
                      No deductions recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="mt-6 flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Deposit held</span>
                <span>{formatMoney(Number(termination.deposit_amount), currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total deductions</span>
                <span>{formatMoney(Number(termination.total_deductions), currency)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                <span>{isRefund ? 'Refund due to tenant' : 'Balance owed by tenant'}</span>
                <span className={isRefund ? 'text-emerald-700' : 'text-red-600'}>
                  {formatMoney(Math.abs(Number(termination.refund_amount)), currency)}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Badge variant={termination.refunded ? 'success' : 'warning'}>
                {termination.refunded
                  ? `Deposit settled${termination.refunded_at ? ` on ${formatDate(termination.refunded_at)}` : ''}`
                  : 'Deposit not yet settled'}
              </Badge>
              {!termination.refunded && <MarkDepositRefundedButton terminationId={termination.id} />}
            </div>
            {termination.notes && <p className="mt-4 text-sm text-slate-500">Notes: {termination.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lease</CardTitle>
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
              <span className="text-slate-500">Terminated on</span>
              <span>{formatDate(termination.termination_date)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
