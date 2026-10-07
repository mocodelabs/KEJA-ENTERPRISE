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
import { ChevronRight } from 'lucide-react'
import { PropertyForm } from '@/components/properties/property-form'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pagination } from '@/components/dashboard/pagination'
import { deleteProperty } from '@/lib/actions/properties'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: properties, count }, { data: clients }] = await Promise.all([
    supabase
      .from('properties')
      .select('*, client:clients(full_name), units(id, status), property_blocks(id, floor_count)', {
        count: 'exact',
      })
      .eq('org_id', active.org_id)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('clients').select('*').eq('org_id', active.org_id).order('full_name'),
  ])

  const totalPages = getTotalPages(count)

  return (
    <div>
      <PageHeader title="Properties" description="All properties under management. Open one to view its units." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add property</CardTitle>
          </CardHeader>
          <CardContent>
            <PropertyForm clients={clients ?? []} orgType={active.organization.org_type} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-fit">
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties && properties.length > 0 ? (
                  properties.map((p) => {
                    const units = p.units ?? []
                    const occupied = units.filter((u) => u.status === 'occupied').length
                    const blocks = p.property_blocks ?? []
                    return (
                      <TableRow key={p.id} className="cursor-pointer">
                        <TableCell className="p-0">
                          <Link href={`/properties/${p.id}`} className="block px-4 py-3">
                            <p className="font-medium text-emerald-700 hover:underline">{p.name}</p>
                            <p className="text-xs text-slate-400">
                              {[p.address, p.city].filter(Boolean).join(', ') || 'No address on file'}
                              {blocks.length > 0 && (
                                <>
                                  {' · '}
                                  {blocks.length} block{blocks.length === 1 ? '' : 's'}
                                </>
                              )}
                            </p>
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">{p.property_type.replace('_', ' ')}</TableCell>
                        <TableCell>{p.client?.full_name ?? 'Own property'}</TableCell>
                        <TableCell>
                          {units.length > 0 ? `${occupied}/${units.length} occupied` : 'No units yet'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DeleteButton action={deleteProperty.bind(null, p.id)} />
                            <Link href={`/properties/${p.id}`} aria-label={`View ${p.name}`}>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableEmpty colSpan={5}>No properties yet.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} basePath="/properties" />}
        </Card>
      </div>
    </div>
  )
}
