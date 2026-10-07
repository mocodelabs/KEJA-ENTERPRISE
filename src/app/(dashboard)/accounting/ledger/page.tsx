import { requireActiveOrg } from '@/lib/session'
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
import { Pagination } from '@/components/dashboard/pagination'
import { getChartOfAccountsWithBalances } from '@/lib/services/ledgerService'
import { formatMoney, formatDate } from '@/lib/utils'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

const ACCOUNT_TYPE_VARIANT = {
  asset: 'info',
  liability: 'warning',
  equity: 'default',
  income: 'success',
  expense: 'danger',
} as const

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page, 15)
  const currency = active.organization.currency

  const [accounts, { data: entries, count }] = await Promise.all([
    getChartOfAccountsWithBalances(supabase, active.org_id),
    supabase
      .from('journal_entries')
      .select(
        '*, journal_lines(debit, credit, account:accounts(code, name), property:properties(name))',
        { count: 'exact' }
      )
      .eq('org_id', active.org_id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
  ])

  return (
    <div>
      <PageHeader title="Ledger" description="Chart of accounts and the full journal behind every number." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Chart of accounts</CardTitle>
          <CardDescription>Running balances across the whole life of the organization.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length > 0 ? (
                accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs text-slate-500">{a.code}</TableCell>
                    <TableCell className="font-medium text-slate-900">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant={ACCOUNT_TYPE_VARIANT[a.type]} className="capitalize">
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(a.balance, currency)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={4}>No accounts yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal</CardTitle>
          <CardDescription>Every entry ever posted, most recent first — each one balances to zero.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          {entries && entries.length > 0 ? (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-md border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-slate-900">{entry.memo ?? entry.source_type}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatDate(entry.entry_date)}</span>
                  </div>
                  <Badge variant="default" className="capitalize">
                    {entry.source_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {(entry.journal_lines ?? []).map((line, i) => (
                      <tr key={i} className="border-t border-slate-100 first:border-t-0">
                        <td className="py-1 text-slate-600">
                          {line.account?.code} {line.account?.name}
                          {line.property?.name && <span className="text-slate-400"> — {line.property.name}</span>}
                        </td>
                        <td className="py-1 text-right text-slate-900">
                          {Number(line.debit) > 0 ? formatMoney(Number(line.debit), currency) : ''}
                        </td>
                        <td className="py-1 text-right text-slate-900">
                          {Number(line.credit) > 0 ? formatMoney(Number(line.credit), currency) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No journal entries yet.</p>
          )}
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count, 15)} basePath="/accounting/ledger" />
      </Card>
    </div>
  )
}
