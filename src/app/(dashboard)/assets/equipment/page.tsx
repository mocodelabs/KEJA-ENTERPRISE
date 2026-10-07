import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableEmpty } from '@/components/ui/table'
import { EquipmentForm } from '@/components/assets/equipment-form'
import { EquipmentRow } from '@/components/assets/equipment-row'
import { Pagination } from '@/components/dashboard/pagination'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: equipment, count } = await supabase
    .from('equipment')
    .select('*', { count: 'exact' })
    .eq('org_id', active.org_id)
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <div>
      <PageHeader title="Equipment" description="Track your office and field equipment." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Purchased</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment && equipment.length > 0 ? (
                equipment.map((e) => (
                  <EquipmentRow key={e.id} equipment={e} currency={active.organization.currency} />
                ))
              ) : (
                <TableEmpty colSpan={7}>No equipment tracked yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/assets/equipment" />
      </Card>
    </div>
  )
}
