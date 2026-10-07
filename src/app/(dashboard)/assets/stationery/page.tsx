import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableEmpty } from '@/components/ui/table'
import { StationeryItemForm } from '@/components/assets/stationery-item-form'
import { StationeryTransactionForm } from '@/components/assets/stationery-transaction-form'
import { StationeryItemRow } from '@/components/assets/stationery-item-row'
import { Pagination } from '@/components/dashboard/pagination'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function StationeryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: allItems }, { data: items, count }] = await Promise.all([
    supabase.from('stationery_items').select('id, name, unit').eq('org_id', active.org_id).order('name'),
    supabase
      .from('stationery_items')
      .select('*', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('name')
      .range(from, to),
  ])

  return (
    <div>
      <PageHeader title="Stationery" description="Track office stationery usage and stock levels." />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add item</CardTitle>
          </CardHeader>
          <CardContent>
            <StationeryItemForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Log stock movement</CardTitle>
          </CardHeader>
          <CardContent>
            <StationeryTransactionForm items={allItems ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>Reorder level</TableHead>
                <TableHead>Cost/unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.length > 0 ? (
                items.map((i) => (
                  <StationeryItemRow key={i.id} item={i} currency={active.organization.currency} />
                ))
              ) : (
                <TableEmpty colSpan={6}>No stationery items tracked yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/assets/stationery" />
      </Card>
    </div>
  )
}
