import { notFound } from 'next/navigation'
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
import { UnitForm } from '@/components/properties/unit-form'
import { UnitStatusSelect } from '@/components/properties/unit-status-select'
import { PropertyBlockForm } from '@/components/properties/property-block-form'
import { PropertyBlockRow } from '@/components/properties/property-block-row'
import { PropertyCommissionForm } from '@/components/properties/property-commission-form'
import { ChangeOwnerForm } from '@/components/properties/change-owner-form'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pagination } from '@/components/dashboard/pagination'
import { deleteUnit } from '@/lib/actions/units'
import { formatMoney } from '@/lib/utils'
import { UNIT_TYPE_LABELS } from '@/lib/unitTypes'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ units_page?: string }>
}) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()
  const resolvedSearchParams = await searchParams
  const unitsPage = parsePage(resolvedSearchParams.units_page)
  const [unitsFrom, unitsTo] = getPageRange(unitsPage)

  const { data: property } = await supabase
    .from('properties')
    .select('*, client:clients(full_name)')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!property) notFound()

  const isPM = isPropertyManager(active.organization.org_type)

  const [{ data: units, count: unitsCount }, { data: blocks }, { data: clients }] = await Promise.all([
    supabase
      .from('units')
      .select('*, block:property_blocks(name)', { count: 'exact' })
      .eq('property_id', id)
      .order('unit_no')
      .range(unitsFrom, unitsTo),
    supabase.from('property_blocks').select('*').eq('property_id', id).order('name'),
    supabase.from('clients').select('id, full_name').eq('org_id', active.org_id).order('full_name'),
  ])

  const totalFloors = (blocks ?? []).reduce((sum, b) => sum + b.floor_count, 0)

  return (
    <div>
      <PageHeader
        title={property.name}
        description={
          [property.address, property.city].filter(Boolean).join(', ') || 'No address on file'
        }
      />

      {isPM && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Owner &amp; commission</CardTitle>
              <CardDescription>{property.client?.full_name ?? 'This org owns the property directly.'}</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyCommissionForm
                propertyId={id}
                rate={property.commission_rate}
                orgDefaultRate={active.organization.default_commission_rate}
              />
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Change of ownership</CardTitle>
              <CardDescription>
                Transfer this property to a different owner. A property with an existing owner can only be reassigned
                here — not by adding a new owner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangeOwnerForm propertyId={id} currentClientId={property.client_id} clients={clients ?? []} />
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Blocks</CardTitle>
          <CardDescription>
            {blocks && blocks.length > 0
              ? `${blocks.length} block${blocks.length === 1 ? '' : 's'} · ${totalFloors} floors total`
              : 'No blocks defined — treated as a single block.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {blocks && blocks.length > 0 && (
            <div className="flex flex-col divide-y divide-slate-100">
              {blocks.map((b) => (
                <PropertyBlockRow key={b.id} block={b} propertyId={id} />
              ))}
            </div>
          )}
          <PropertyBlockForm propertyId={id} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add unit</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitForm propertyId={id} blocks={blocks ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bedrooms</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {units && units.length > 0 ? (
                units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-slate-900">{u.unit_no}</TableCell>
                    <TableCell>{u.block?.name ?? '—'}</TableCell>
                    <TableCell>{u.floor ?? '—'}</TableCell>
                    <TableCell>{UNIT_TYPE_LABELS[u.unit_type]}</TableCell>
                    <TableCell>{u.bedrooms ?? '—'}</TableCell>
                    <TableCell>{formatMoney(Number(u.rent_amount), active.organization.currency)}</TableCell>
                    <TableCell>
                      <UnitStatusSelect unitId={u.id} propertyId={id} status={u.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton action={deleteUnit.bind(null, u.id, id)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={8}>No units yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          currentPage={unitsPage}
          totalPages={getTotalPages(unitsCount)}
          basePath={`/properties/${id}`}
          paramName="units_page"
          searchParams={resolvedSearchParams}
        />
      </Card>
    </div>
  )
}
