import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { TenantForm } from '@/components/tenants/tenant-form'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pagination } from '@/components/dashboard/pagination'
import { deleteTenant } from '@/lib/actions/tenants'
import { Badge } from '@/components/ui/badge'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: tenants, count }, { data: vacantUnits }] = await Promise.all([
    supabase
      .from('tenants')
      .select('*, leases(id, status, unit:units(unit_no, property:properties(name)))', { count: 'exact' })
      .eq('org_id', active.org_id)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('units')
      .select(
        'id, unit_no, unit_type, rent_amount, property_id, property:properties(name), block_id, floor, block:property_blocks(name)'
      )
      .eq('org_id', active.org_id)
      .eq('status', 'vacant')
      .order('unit_no'),
  ])

  return (
    <div>
      <PageHeader title="Tenants" description="Everyone currently or previously renting from you." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <TenantForm units={vacantUnits ?? []} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 h-fit">
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Current unit</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants && tenants.length > 0 ? (
                  tenants.map((t) => {
                    const activeLease = t.leases?.find((l) => l.status === 'active')
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Link href={`/tenants/${t.id}`} className="font-medium text-emerald-700 hover:underline">
                            {t.full_name}
                          </Link>
                        </TableCell>
                        <TableCell>{t.phone}</TableCell>
                        <TableCell>
                          {activeLease?.unit ? (
                            `${activeLease.unit.property?.name} · ${activeLease.unit.unit_no}`
                          ) : (
                            <Badge variant="default">No active lease</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DeleteButton action={deleteTenant.bind(null, t.id)} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableEmpty colSpan={4}>No tenants yet.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/tenants" />
        </Card>
      </div>
    </div>
  )
}
