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
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart'
import { Pagination } from '@/components/dashboard/pagination'
import {
  computePropertyPerformance,
  computeTenantPerformance,
  computeMonthlyRevenue,
} from '@/lib/services/reportsService'
import { formatMoney } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

const LEVEL_VARIANT = {
  Excellent: 'success',
  Good: 'info',
  'At risk': 'danger',
  'No history': 'default',
} as const

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ properties_page?: string; tenants_page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const currency = active.organization.currency
  const params = await searchParams

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1)

  const [{ data: ledgerRows }, { data: tenants }, { data: payments }] = await Promise.all([
    supabase
      .from('commission_ledger')
      .select('*, property:properties(name)')
      .eq('org_id', active.org_id),
    supabase
      .from('tenants')
      .select('id, full_name, leases(invoices(status, due_date, total_amount, payments(amount, paid_at)))')
      .eq('org_id', active.org_id),
    supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('org_id', active.org_id)
      .gte('paid_at', sixMonthsAgo.toISOString()),
  ])

  const fullPropertyPerformance = computePropertyPerformance(ledgerRows ?? [])
  const fullTenantPerformance = computeTenantPerformance(tenants ?? [])
  const monthlyRevenue = computeMonthlyRevenue(payments ?? [])

  const propertiesPage = parsePage(params.properties_page)
  const [propertiesFrom, propertiesTo] = getPageRange(propertiesPage)
  const propertyPerformance = fullPropertyPerformance.slice(propertiesFrom, propertiesTo + 1)
  const propertiesTotalPages = getTotalPages(fullPropertyPerformance.length)

  const tenantsPage = parsePage(params.tenants_page)
  const [tenantsFrom, tenantsTo] = getPageRange(tenantsPage)
  const tenantPerformance = fullTenantPerformance.slice(tenantsFrom, tenantsTo + 1)
  const tenantsTotalPages = getTotalPages(fullTenantPerformance.length)

  return (
    <div>
      <PageHeader title="Reports" description="Property performance, tenant trends, and growth over time." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Revenue trend (last 6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={monthlyRevenue} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Property performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertyPerformance.length > 0 ? (
                  propertyPerformance.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                      <TableCell>{formatMoney(p.grossRevenue, currency)}</TableCell>
                      <TableCell>{formatMoney(p.expenses, currency)}</TableCell>
                      <TableCell className={p.net >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {formatMoney(p.net, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty colSpan={4}>No performance data yet.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <Pagination
            currentPage={propertiesPage}
            totalPages={propertiesTotalPages}
            basePath="/reports"
            paramName="properties_page"
            searchParams={params}
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Total invoiced</TableHead>
                  <TableHead>On-time rate</TableHead>
                  <TableHead>Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantPerformance.length > 0 ? (
                  tenantPerformance.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-slate-900">{t.name}</TableCell>
                      <TableCell>{formatMoney(t.totalInvoiced, currency)}</TableCell>
                      <TableCell>{t.onTimeRate !== null ? `${t.onTimeRate}%` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={LEVEL_VARIANT[t.level]}>{t.level}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty colSpan={4}>No tenant data yet.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <Pagination
            currentPage={tenantsPage}
            totalPages={tenantsTotalPages}
            basePath="/reports"
            paramName="tenants_page"
            searchParams={params}
          />
        </Card>
      </div>
    </div>
  )
}
