import { notFound } from 'next/navigation'
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
import { ApproveProcessButton } from '@/components/hr/approve-process-button'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function PayrollRunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('*')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!run) notFound()

  const { data: items, count } = await supabase
    .from('payroll_items')
    .select('*, employee:employees(full_name, job_title)', { count: 'exact' })
    .eq('payroll_run_id', id)
    .range(from, to)

  return (
    <div>
      <PageHeader
        title={`Payroll — ${formatDate(run.period_start)} to ${formatDate(run.period_end)}`}
        description={`Total net: ${formatMoney(Number(run.total_net), active.organization.currency)}`}
        action={
          run.status === 'draft' ? (
            <ApproveProcessButton id={run.id} />
          ) : (
            <Badge variant="success" className="text-sm">
              {run.status}
            </Badge>
          )
        }
      />

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.employee?.full_name}</div>
                      <div className="text-xs text-slate-400">{item.employee?.job_title}</div>
                    </TableCell>
                    <TableCell>{formatMoney(Number(item.gross_amount), active.organization.currency)}</TableCell>
                    <TableCell>{formatMoney(Number(item.deductions), active.organization.currency)}</TableCell>
                    <TableCell className="font-medium">
                      {formatMoney(Number(item.net_amount), active.organization.currency)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={4}>No line items.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath={`/hr/payroll/${id}`} />
      </Card>
    </div>
  )
}
