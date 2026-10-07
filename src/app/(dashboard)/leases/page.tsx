import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableEmpty } from '@/components/ui/table'
import { LeaseForm } from '@/components/tenants/lease-form'
import { LeaseRow } from '@/components/tenants/lease-row'
import { CollapsibleLeaseForm } from '@/components/tenants/collapsible-lease-form'
import { Pagination } from '@/components/dashboard/pagination'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: leases, count }, { data: vacantUnits }, { data: tenants }] = await Promise.all([
    supabase
      .from('leases')
      .select('*, tenant:tenants(full_name), unit:units(unit_no, unit_type, property:properties(name))', {
        count: 'exact',
      })
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
    supabase.from('tenants').select('id, full_name').eq('org_id', active.org_id).order('full_name'),
  ])

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Manage active and past tenancies — adjust rent and terms, or end a lease."
      />

      <Card>
        <CardHeader>
          <CardTitle>All leases</CardTitle>
          <CardDescription>
            New tenants get their first lease automatically from the{' '}
            <Link href="/tenants" className="text-emerald-700 hover:underline">
              Tenants
            </Link>{' '}
            page. Use the pencil icon below to adjust rent, deposit, or due day on an existing lease.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <CollapsibleLeaseForm>
            <div className="mb-4 rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                New lease for an existing tenant — for renewals, unit transfers, or a second unit
              </p>
              <LeaseForm units={vacantUnits ?? []} tenants={tenants ?? []} />
            </div>
          </CollapsibleLeaseForm>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases && leases.length > 0 ? (
                leases.map((l) => <LeaseRow key={l.id} lease={l} currency={active.organization.currency} />)
              ) : (
                <TableEmpty colSpan={7}>No leases yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/leases" />
      </Card>
    </div>
  )
}
