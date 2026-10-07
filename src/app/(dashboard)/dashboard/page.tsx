import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { RevenueTrendChart } from '@/components/reports/revenue-trend-chart'
import { UnitStatusPieChart } from '@/components/dashboard/unit-status-pie-chart'
import { computeMonthlyRevenue } from '@/lib/services/reportsService'
import { formatMoney, cn } from '@/lib/utils'
import { Building2, Users, FileWarning, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const STAT_TINT = {
  emerald: { chip: 'bg-emerald-50 text-emerald-600', sub: 'text-emerald-700' },
  blue: { chip: 'bg-sky-50 text-sky-600', sub: 'text-sky-700' },
  amber: { chip: 'bg-amber-50 text-amber-600', sub: 'text-amber-700' },
} as const

export default async function DashboardPage() {
  const { supabase, active } = await requireActiveOrg()
  const orgId = active.org_id
  const currency = active.organization.currency
  const isPM = isPropertyManager(active.organization.org_type)

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1)

  const [{ count: propertyCount }, { data: unitStatuses }, { count: tenantCount }, { data: outstandingInvoices }, { data: sixMonthPayments }, { count: pendingReconciliations }] =
    await Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase.from('units').select('status').eq('org_id', orgId),
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
      supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .eq('org_id', orgId)
        .in('status', ['sent', 'partial', 'overdue']),
      supabase
        .from('payments')
        .select('amount, paid_at')
        .eq('org_id', orgId)
        .gte('paid_at', sixMonthsAgo.toISOString()),
      supabase
        .from('commission_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending'),
    ])

  const unitCount = unitStatuses?.length ?? 0
  const occupiedCount = unitStatuses?.filter((u) => u.status === 'occupied').length ?? 0
  const vacantCount = unitStatuses?.filter((u) => u.status === 'vacant').length ?? 0
  const maintenanceCount = unitStatuses?.filter((u) => u.status === 'maintenance').length ?? 0

  const outstandingBalance = (outstandingInvoices ?? []).reduce(
    (sum, inv) => sum + (Number(inv.total_amount) - Number(inv.amount_paid)),
    0
  )
  const monthlyRevenue = computeMonthlyRevenue(sixMonthPayments ?? [])
  const monthRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.total ?? 0
  const occupancyRate = unitCount ? Math.round((occupiedCount / unitCount) * 100) : 0

  const stats = [
    { label: 'Properties', value: propertyCount ?? 0, icon: Building2, sub: `${unitCount ?? 0} units`, tint: 'emerald' },
    { label: 'Tenants', value: tenantCount ?? 0, icon: Users, sub: `${occupancyRate}% occupancy`, tint: 'blue' },
    {
      label: 'Collected this month',
      value: formatMoney(monthRevenue, currency),
      icon: TrendingUp,
      sub: 'across all properties',
      tint: 'emerald',
    },
    {
      label: 'Outstanding balance',
      value: formatMoney(outstandingBalance, currency),
      icon: FileWarning,
      sub: isPM ? `${pendingReconciliations ?? 0} pending reconciliations` : 'across all tenants',
      tint: 'amber',
    },
  ] as const

  return (
    <div>
      <PageHeader
        title={`Welcome back to ${active.organization.name}`}
        description="Here's how your portfolio is performing."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const tint = STAT_TINT[s.tint]
          return (
            <Card key={s.label}>
              <CardContent className="flex items-start justify-between pt-4">
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{s.value}</p>
                  <p className={cn('mt-1 text-xs font-medium', tint.sub)}>{s.sub}</p>
                </div>
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tint.chip)}>
                  <s.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue trend (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueTrendChart data={monthlyRevenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unit occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <UnitStatusPieChart occupied={occupiedCount} vacant={vacantCount} maintenance={maintenanceCount} />
          </CardContent>
        </Card>
      </div>

      {(propertyCount ?? 0) === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Building2 className="h-8 w-8 text-emerald-700" />
            <div>
              <p className="font-medium text-slate-900">Add your first property to get started</p>
              <p className="text-sm text-slate-500">
                Then add units, move in tenants, and start billing automatically.
              </p>
            </div>
            <Link href="/properties" className="text-sm font-medium text-emerald-700 hover:underline">
              Go to Properties →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
