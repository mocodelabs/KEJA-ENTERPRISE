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
import { GenerateInvoicesForm } from '@/components/billing/generate-invoices-form'
import { RunAutomationButton } from '@/components/billing/run-automation-button'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

const STATUS_VARIANT = {
  draft: 'default',
  sent: 'info',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'default',
} as const

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: invoices, count } = await supabase
    .from('invoices')
    .select('*, lease:leases(tenant:tenants(full_name), unit:units(unit_no, property:properties(name)))', {
      count: 'exact',
    })
    .eq('org_id', active.org_id)
    .order('due_date', { ascending: false })
    .range(from, to)

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Generate rent invoices and let the system apply penalties & reminders."
        action={<RunAutomationButton />}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateInvoicesForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices && invoices.length > 0 ? (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/billing/invoices/${inv.id}`} className="font-medium text-emerald-700 hover:underline">
                        {inv.lease?.tenant?.full_name ?? 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {inv.lease?.unit?.property?.name} · {inv.lease?.unit?.unit_no}
                    </TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                    <TableCell>{formatMoney(Number(inv.total_amount), active.organization.currency)}</TableCell>
                    <TableCell>
                      {formatMoney(Number(inv.total_amount) - Number(inv.amount_paid), active.organization.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[inv.status]}>{inv.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={6}>No invoices yet. Generate some above.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/billing/invoices" />
      </Card>
    </div>
  )
}
