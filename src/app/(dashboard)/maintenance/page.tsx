import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { MaintenanceForm } from '@/components/maintenance/maintenance-form'
import { MaintenanceStatusSelect } from '@/components/maintenance/maintenance-status-select'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pagination } from '@/components/dashboard/pagination'
import { deleteMaintenanceRecord } from '@/lib/actions/maintenance'
import { formatMoney, formatDate } from '@/lib/utils'
import { MAINTENANCE_ISSUE_LABELS } from '@/lib/maintenanceTypes'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'
import type { Enums } from '@/lib/types/database'

const BILLED_TO_LABELS: Record<Enums<'maintenance_bill_target'>, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  expense: 'Expense',
}
const BILLED_TO_VARIANT: Record<Enums<'maintenance_bill_target'>, 'info' | 'warning' | 'default'> = {
  tenant: 'info',
  landlord: 'warning',
  expense: 'default',
}

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const currency = active.organization.currency
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: units }, { data: records, count }] = await Promise.all([
    supabase
      .from('units')
      .select('id, unit_no, property_id, property:properties(name), block_id, floor, block:property_blocks(name)')
      .eq('org_id', active.org_id)
      .order('unit_no'),
    supabase
      .from('maintenance_records')
      .select('*, unit:units(unit_no, property:properties(name)), lease:leases(tenant:tenants(full_name))', {
        count: 'exact',
      })
      .eq('org_id', active.org_id)
      .order('reported_date', { ascending: false })
      .range(from, to),
  ])

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Log repairs and issues per unit — pegged to whoever was leasing it at the time."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record maintenance issue</CardTitle>
        </CardHeader>
        <CardContent>
          <MaintenanceForm units={units ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Billed to</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records && records.length > 0 ? (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.unit?.property?.name} · {r.unit?.unit_no}
                    </TableCell>
                    <TableCell>
                      {r.lease?.tenant?.full_name ?? <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>{MAINTENANCE_ISSUE_LABELS[r.issue_type]}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-500">{r.description}</TableCell>
                    <TableCell>{formatMoney(Number(r.cost), currency)}</TableCell>
                    <TableCell>
                      <Badge variant={BILLED_TO_VARIANT[r.billed_to]}>{BILLED_TO_LABELS[r.billed_to]}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(r.reported_date)}</TableCell>
                    <TableCell>
                      <MaintenanceStatusSelect id={r.id} status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton action={deleteMaintenanceRecord.bind(null, r.id)} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={9}>No maintenance records yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/maintenance" />
      </Card>
    </div>
  )
}
