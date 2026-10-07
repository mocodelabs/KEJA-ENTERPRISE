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
import { PayrollRunForm } from '@/components/hr/payroll-run-form'
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

const STATUS_VARIANT = { draft: 'default', approved: 'warning', processed: 'success' } as const

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: runs, count } = await supabase
    .from('payroll_runs')
    .select('*', { count: 'exact' })
    .eq('org_id', active.org_id)
    .order('period_start', { ascending: false })
    .range(from, to)

  return (
    <div>
      <PageHeader title="Payroll" description="Build a payroll run, then approve to process automatically." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New payroll run</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollRunForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Total net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs && runs.length > 0 ? (
                runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/hr/payroll/${r.id}`} className="font-medium text-emerald-700 hover:underline">
                        {formatDate(r.period_start)} – {formatDate(r.period_end)}
                      </Link>
                    </TableCell>
                    <TableCell>{formatMoney(Number(r.total_net), active.organization.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={3}>No payroll runs yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/hr/payroll" />
      </Card>
    </div>
  )
}
