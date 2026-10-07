import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
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
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: receipts, count } = await supabase
    .from('receipts')
    .select(
      '*, payment:payments(amount, invoice:invoices(lease:leases(tenant:tenants(full_name), unit:units(unit_no))))',
      { count: 'exact' }
    )
    .eq('org_id', active.org_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <div>
      <PageHeader title="Receipts" description="Auto-generated the moment a payment is recorded." />
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No.</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts && receipts.length > 0 ? (
                receipts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-slate-900">
                      <Link href={`/receipts/${r.id}`} className="text-emerald-700 hover:underline">
                        {r.receipt_no}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.payment?.invoice?.lease?.tenant?.full_name} · {r.payment?.invoice?.lease?.unit?.unit_no}
                    </TableCell>
                    <TableCell>{formatMoney(Number(r.payment?.amount ?? 0), active.organization.currency)}</TableCell>
                    <TableCell>{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={r.sent_at ? 'success' : 'default'}>{r.sent_at ? 'Sent' : 'Not sent'}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No receipts yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/receipts" />
      </Card>
    </div>
  )
}
