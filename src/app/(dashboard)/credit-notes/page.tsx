import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { CreditNoteForm } from '@/components/quotes/credit-note-form'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function CreditNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: creditNotes, count }, { data: invoices }] = await Promise.all([
    supabase
      .from('credit_notes')
      .select('*, invoice:invoices(lease:leases(tenant:tenants(full_name)))', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('issued_at', { ascending: false })
      .range(from, to),
    supabase
      .from('invoices')
      .select('id, lease:leases(tenant:tenants(full_name), unit:units(unit_no))')
      .eq('org_id', active.org_id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const invoiceOptions = (invoices ?? []).map((inv) => ({
    id: inv.id,
    label: `${inv.lease?.tenant?.full_name ?? 'Unknown'} · ${inv.lease?.unit?.unit_no ?? ''}`,
  }))

  return (
    <div>
      <PageHeader title="Credit Notes" description="Issue credit notes against invoices or standalone." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New credit note</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditNoteForm invoices={invoiceOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credit Note No.</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes && creditNotes.length > 0 ? (
                creditNotes.map((cn) => (
                  <TableRow key={cn.id}>
                    <TableCell className="font-medium text-slate-900">
                      <Link href={`/credit-notes/${cn.id}`} className="text-emerald-700 hover:underline">
                        {cn.credit_note_no}
                      </Link>
                    </TableCell>
                    <TableCell>{cn.invoice?.lease?.tenant?.full_name ?? '—'}</TableCell>
                    <TableCell>{cn.reason ?? '—'}</TableCell>
                    <TableCell>{formatDate(cn.issued_at)}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(cn.amount), active.organization.currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No credit notes yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/credit-notes" />
      </Card>
    </div>
  )
}
