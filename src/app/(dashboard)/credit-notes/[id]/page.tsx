import { notFound } from 'next/navigation'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DocumentActions } from '@/components/documents/document-actions'
import { sendCreditNoteEmail, sendCreditNoteWhatsapp } from '@/lib/actions/creditNotes'
import { formatMoney, formatDate } from '@/lib/utils'
import type { PdfDocument } from '@/lib/pdf/documentPdf'

export default async function CreditNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()

  const { data: creditNote } = await supabase
    .from('credit_notes')
    .select(
      '*, invoice:invoices(id, lease:leases(tenant:tenants(full_name, phone, email), unit:units(unit_no, property:properties(name, address, city))))'
    )
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!creditNote) notFound()

  const currency = active.organization.currency
  const tenant = creditNote.invoice?.lease?.tenant
  const unit = creditNote.invoice?.lease?.unit

  const pdfDoc: PdfDocument = {
    docType: 'CREDIT NOTE',
    docNumber: creditNote.credit_note_no,
    orgName: active.organization.name,
    currency,
    metaRows: [
      { label: 'Tenant', value: tenant?.full_name ?? '—' },
      { label: 'Property', value: `${unit?.property?.name ?? ''} · Unit ${unit?.unit_no ?? ''}` },
      { label: 'Issued', value: formatDate(creditNote.issued_at) },
    ],
    items: [{ description: creditNote.reason ?? 'Credit', amount: Number(creditNote.amount) }],
    totals: [{ label: 'Amount', value: Number(creditNote.amount), emphasize: true }],
  }

  return (
    <div>
      <PageHeader
        title={`Credit Note ${creditNote.credit_note_no}`}
        description={tenant ? `${tenant.full_name} · ${unit?.property?.name ?? ''} Unit ${unit?.unit_no ?? ''}` : 'Standalone credit note'}
        action={
          <DocumentActions
            doc={pdfDoc}
            filename={`${creditNote.credit_note_no}.pdf`}
            onSendEmail={tenant?.email ? sendCreditNoteEmail.bind(null, creditNote.id) : undefined}
            onSendWhatsApp={tenant?.phone ? sendCreditNoteWhatsapp.bind(null, creditNote.id) : undefined}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
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
                <TableRow>
                  <TableCell>{creditNote.reason ?? 'Credit'}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(creditNote.amount), currency)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end">
              <div className="flex w-48 justify-between border-t border-slate-200 pt-1 text-sm">
                <span className="font-medium text-slate-500">Total</span>
                <span className="font-semibold">{formatMoney(Number(creditNote.amount), currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit note details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Tenant</span>
              <span>{tenant?.full_name ?? '— (standalone)'}</span>
            </div>
            {tenant?.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span>{tenant.phone}</span>
              </div>
            )}
            {tenant?.email && (
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span>{tenant.email}</span>
              </div>
            )}
            {unit && (
              <div className="flex justify-between">
                <span className="text-slate-500">Property</span>
                <span className="text-right">
                  {unit.property?.name} · {unit.unit_no}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Issued</span>
              <span>{formatDate(creditNote.issued_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
