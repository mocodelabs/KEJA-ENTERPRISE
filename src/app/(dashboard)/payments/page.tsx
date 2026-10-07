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
import { PaymentForm } from '@/components/payments/payment-form'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const currency = active.organization.currency
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: openInvoices }, { data: payments, count }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, total_amount, amount_paid, lease:leases(tenant:tenants(full_name), unit:units(unit_no))')
      .eq('org_id', active.org_id)
      .in('status', ['sent', 'partial', 'overdue']),
    supabase
      .from('payments')
      .select('*, invoice:invoices(lease:leases(tenant:tenants(full_name), unit:units(unit_no))), receipts(receipt_no)', {
        count: 'exact',
      })
      .eq('org_id', active.org_id)
      .order('paid_at', { ascending: false })
      .range(from, to),
  ])

  const invoiceOptions = (openInvoices ?? []).map((inv) => ({
    id: inv.id,
    balance: Number(inv.total_amount) - Number(inv.amount_paid),
    label: `${inv.lease?.tenant?.full_name ?? 'Unknown'} · ${inv.lease?.unit?.unit_no ?? ''} · Bal ${formatMoney(
      Number(inv.total_amount) - Number(inv.amount_paid),
      currency
    )}`,
  }))

  return (
    <div>
      <PageHeader title="Payments" description="All payments received across your properties." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record a payment</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm invoices={invoiceOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments && payments.length > 0 ? (
                payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paid_at)}</TableCell>
                    <TableCell>
                      {p.invoice?.lease?.tenant?.full_name} · {p.invoice?.lease?.unit?.unit_no}
                    </TableCell>
                    <TableCell className="uppercase">{p.method}</TableCell>
                    <TableCell>{p.receipts?.[0]?.receipt_no ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatMoney(Number(p.amount), currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No payments recorded yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/payments" />
      </Card>
    </div>
  )
}
