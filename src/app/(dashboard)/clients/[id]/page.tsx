import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table'
import { EditClientForm } from '@/components/clients/edit-client-form'
import { AddPropertyToOwnerForm } from '@/components/clients/add-property-to-owner-form'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pagination } from '@/components/dashboard/pagination'
import { removePropertyFromOwner } from '@/lib/actions/clients'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()
  if (!isPropertyManager(active.organization.org_type)) redirect('/dashboard')

  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!client) notFound()

  const [{ data: ownedProperties, count: ownedCount }, { data: unownedProperties }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, name, city, commission_rate, units(id)', { count: 'exact' })
      .eq('org_id', active.org_id)
      .eq('client_id', id)
      .order('name')
      .range(from, to),
    supabase
      .from('properties')
      .select('id, name')
      .eq('org_id', active.org_id)
      .is('client_id', null)
      .order('name'),
  ])

  return (
    <div>
      <PageHeader
        title={client.full_name}
        description="Edit owner details and manage which properties they own."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Owner details</CardTitle>
          </CardHeader>
          <CardContent>
            <EditClientForm client={client} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add a property</CardTitle>
            </CardHeader>
            <CardContent>
              <AddPropertyToOwnerForm clientId={id} availableProperties={unownedProperties ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Properties owned</CardTitle>
              <CardDescription>Commission is set per property — open a property to change its rate.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownedProperties && ownedProperties.length > 0 ? (
                    ownedProperties.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link href={`/properties/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell>{p.city ?? '—'}</TableCell>
                        <TableCell>{p.units?.length ?? 0}</TableCell>
                        <TableCell>
                          {p.commission_rate != null ? (
                            `${p.commission_rate}%`
                          ) : (
                            <span className="text-slate-400">Org default ({active.organization.default_commission_rate}%)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DeleteButton
                            action={removePropertyFromOwner.bind(null, id, p.id)}
                            confirmText="Remove this property from this owner?"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableEmpty colSpan={5}>No properties owned yet — add one above.</TableEmpty>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <Pagination currentPage={page} totalPages={getTotalPages(ownedCount)} basePath={`/clients/${id}`} />
          </Card>
        </div>
      </div>
    </div>
  )
}
