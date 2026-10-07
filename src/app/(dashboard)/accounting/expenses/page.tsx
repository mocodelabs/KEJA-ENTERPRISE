import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableEmpty } from '@/components/ui/table'
import { ExpenseForm } from '@/components/accounting/expense-form'
import { ExpenseRow } from '@/components/accounting/expense-row'
import { Pagination } from '@/components/dashboard/pagination'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: expenses, count }, { data: properties }] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, property:properties(name)', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('expense_date', { ascending: false })
      .range(from, to),
    supabase.from('properties').select('id, name').eq('org_id', active.org_id).order('name'),
  ])

  return (
    <div>
      <PageHeader title="Expenses" description="Track spending for loss & profit and reconciliation." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record expense</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm properties={properties ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses && expenses.length > 0 ? (
                expenses.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    properties={properties ?? []}
                    currency={active.organization.currency}
                  />
                ))
              ) : (
                <TableEmpty colSpan={6}>No expenses recorded yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/accounting/expenses" />
      </Card>
    </div>
  )
}
