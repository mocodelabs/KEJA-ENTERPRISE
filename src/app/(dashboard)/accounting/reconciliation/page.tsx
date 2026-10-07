import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ReconciliationForm } from '@/components/accounting/reconciliation-form'
import { MarkReconciledButton } from '@/components/accounting/mark-reconciled-button'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  if (!isPropertyManager(active.organization.org_type)) redirect('/dashboard')

  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: ledger, count }, { data: properties }] = await Promise.all([
    supabase
      .from('commission_ledger')
      .select('*, property:properties(name)', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('period_start', { ascending: false })
      .range(from, to),
    supabase.from('properties').select('id, name').eq('org_id', active.org_id).order('name'),
  ])

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        description="Revenue, commission, and expenses reconciled per property and period."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Run reconciliation manually</CardTitle>
          <CardDescription>
            Every property is also reconciled automatically on the last day of each month for the period that just
            ended — this just shows up below as &quot;pending&quot;. Use this form for an ad-hoc period, or to
            re-check a property before you mark it reconciled. A period you&apos;ve already marked reconciled is
            never recalculated automatically or here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReconciliationForm properties={properties ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Gross revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net to owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger && ledger.length > 0 ? (
                ledger.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-slate-900">{row.property?.name}</TableCell>
                    <TableCell>
                      {formatDate(row.period_start)} – {formatDate(row.period_end)}
                    </TableCell>
                    <TableCell>{formatMoney(Number(row.gross_revenue), active.organization.currency)}</TableCell>
                    <TableCell>
                      {formatMoney(Number(row.commission_amount), active.organization.currency)} ({row.commission_rate}%)
                    </TableCell>
                    <TableCell>{formatMoney(Number(row.total_expenses), active.organization.currency)}</TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(Number(row.net_to_owner), active.organization.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'reconciled' ? 'success' : 'warning'}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === 'pending' && <MarkReconciledButton id={row.id} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={8}>No reconciliations yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/accounting/reconciliation" />
      </Card>
    </div>
  )
}
