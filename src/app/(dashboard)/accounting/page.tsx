import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { PropertyBreakdownRow } from '@/components/accounting/property-breakdown-row'
import { Pagination } from '@/components/dashboard/pagination'
import { isPropertyManager } from '@/lib/orgAccess'
import {
  getChartOfAccountsWithBalances,
  getPropertyLedgerBreakdown,
  getDepositBreakdown,
  getOrgIncomeStatement,
} from '@/lib/services/ledgerService'
import { formatMoney } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

function firstOfMonth() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}
function endOfMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

export default async function AccountingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period_start?: string; period_end?: string; properties_page?: string; deposits_page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const isPM = isPropertyManager(active.organization.org_type)
  const params = await searchParams
  const periodStart = params.period_start || firstOfMonth()
  const periodEnd = params.period_end || endOfMonth()
  const currency = active.organization.currency

  const [accounts, fullPropertyBreakdown, fullDepositBreakdown, incomeStatement] = await Promise.all([
    getChartOfAccountsWithBalances(supabase, active.org_id),
    getPropertyLedgerBreakdown(supabase, active.org_id, periodStart, periodEnd),
    getDepositBreakdown(supabase, active.org_id, periodStart, periodEnd),
    getOrgIncomeStatement(supabase, active.org_id, periodStart, periodEnd),
  ])

  const cashBalance = accounts.find((a) => a.code === '1000')?.balance ?? 0
  const collectionsAccount = accounts.find((a) => a.code === '2200')
  const totalCollections = collectionsAccount?.balance ?? 0
  const collectionsLabel = collectionsAccount?.name ?? 'Collections'
  const totalDepositsHeld = accounts.find((a) => a.code === '2100')?.balance ?? 0
  const netCollectedPeriod = fullPropertyBreakdown.reduce((s, row) => s + row.collections - row.expenses, 0)

  const propertiesPage = parsePage(params.properties_page)
  const [propertiesFrom, propertiesTo] = getPageRange(propertiesPage)
  const propertyBreakdown = fullPropertyBreakdown.slice(propertiesFrom, propertiesTo + 1)
  const propertiesTotalPages = getTotalPages(fullPropertyBreakdown.length)

  const depositsPage = parsePage(params.deposits_page)
  const [depositsFrom, depositsTo] = getPageRange(depositsPage)
  const depositBreakdown = fullDepositBreakdown.slice(depositsFrom, depositsTo + 1)
  const depositsTotalPages = getTotalPages(fullDepositBreakdown.length)

  return (
    <div>
      <PageHeader
        title="Accounting"
        description={
          isPM
            ? 'Every rent collection, expense, payroll run, and commission recognized, wired into one ledger.'
            : 'Every rent collection, expense, and payroll run, wired into one ledger.'
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period_start">Period start</Label>
              <Input id="period_start" name="period_start" type="date" defaultValue={periodStart} className="w-40" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period_end">Period end</Label>
              <Input id="period_end" name="period_end" type="date" defaultValue={periodEnd} className="w-40" />
            </div>
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cash and Bank (all-time)</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(cashBalance, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deposits held (all-time)</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(totalDepositsHeld, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{collectionsLabel} (all-time)</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(totalCollections, currency)}</CardTitle>
          </CardHeader>
        </Card>
        {isPM ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Commission income (period)</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(incomeStatement.commissionIncome, currency)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net profit (period)</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(incomeStatement.netProfit, currency)}</CardTitle>
              </CardHeader>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net collected (period)</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(netCollectedPeriod, currency)}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>By property</CardTitle>
          <CardDescription>
            {isPM
              ? 'Rent collected, property expenses, commission recognized, and payouts for the selected period, plus the running balance owed to each owner right now.'
              : 'Rent collected, property expenses, and withdrawals for the selected period, plus what’s currently held for each property.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Collections</TableHead>
                <TableHead>Expenses</TableHead>
                {isPM && <TableHead>Commission</TableHead>}
                <TableHead>{isPM ? 'Paid out' : 'Withdrawn'}</TableHead>
                <TableHead>{isPM ? 'Due to owner' : 'Held'}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {propertyBreakdown.length > 0 ? (
                propertyBreakdown.map((row) => (
                  <PropertyBreakdownRow key={row.id} row={row} currency={currency} isPM={isPM} />
                ))
              ) : (
                <TableEmpty colSpan={isPM ? 7 : 6}>No properties yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          currentPage={propertiesPage}
          totalPages={propertiesTotalPages}
          basePath="/accounting"
          paramName="properties_page"
          searchParams={params}
        />
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Security deposits</CardTitle>
          <CardDescription>
            Deposits collected at lease start (added) and settled on termination (deducted) for the selected period,
            plus what&apos;s held right now for each property.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Deducted</TableHead>
                <TableHead>Held (all-time)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depositBreakdown.length > 0 ? (
                depositBreakdown.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                    <TableCell>{formatMoney(row.added, currency)}</TableCell>
                    <TableCell>{formatMoney(row.deducted, currency)}</TableCell>
                    <TableCell className="font-medium">{formatMoney(row.held, currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={4}>No deposits recorded yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          currentPage={depositsPage}
          totalPages={depositsTotalPages}
          basePath="/accounting"
          paramName="deposits_page"
          searchParams={params}
        />
      </Card>

      {isPM && (
        <Card>
          <CardHeader>
            <CardTitle>Company profit &amp; loss</CardTitle>
            <CardDescription>The organization&apos;s own income and expenses for the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Commission Income</TableCell>
                  <TableCell className="text-right">{formatMoney(incomeStatement.commissionIncome, currency)}</TableCell>
                </TableRow>
                {incomeStatement.expenseRows.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="text-slate-500">{row.name}</TableCell>
                    <TableCell className="text-right text-slate-500">
                      ({formatMoney(row.amount, currency)})
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium text-slate-900">Net profit</TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    {formatMoney(incomeStatement.netProfit, currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
