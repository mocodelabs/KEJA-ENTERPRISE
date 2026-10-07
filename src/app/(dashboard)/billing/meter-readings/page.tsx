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
import { MeterReadingForm } from '@/components/billing/meter-reading-form'
import { Pagination } from '@/components/dashboard/pagination'
import { formatDate, formatMoney } from '@/lib/utils'
import { isFlatFeeMeterType, meterReadingAmount } from '@/lib/services/meterReadings'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'

export default async function MeterReadingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, active } = await requireActiveOrg()
  const currency = active.organization.currency
  const page = parsePage((await searchParams).page)
  const [from, to] = getPageRange(page)

  const [{ data: units }, { data: readings, count }, { data: allReadings }] = await Promise.all([
    supabase
      .from('units')
      .select('id, unit_no, property_id, property:properties(name), block_id, floor, block:property_blocks(name)')
      .eq('org_id', active.org_id)
      .order('unit_no'),
    supabase
      .from('meter_readings')
      .select('*, unit:units(unit_no, property:properties(name)), lease:leases(tenant:tenants(full_name))', {
        count: 'exact',
      })
      .eq('org_id', active.org_id)
      .order('reading_date', { ascending: false })
      .range(from, to),
    supabase
      .from('meter_readings')
      .select('unit_id, meter_type, current_reading, previous_reading, rate_per_unit, billed, unit:units(unit_no, property:properties(name))')
      .eq('org_id', active.org_id),
  ])

  const totalsMap = new Map<
    string,
    { unitLabel: string; meterType: string; total: number; pending: number }
  >()
  for (const r of allReadings ?? []) {
    const key = `${r.unit_id}-${r.meter_type}`
    const amount = meterReadingAmount(r)
    const row = totalsMap.get(key) ?? {
      unitLabel: `${r.unit?.property?.name ?? ''} · ${r.unit?.unit_no ?? ''}`,
      meterType: r.meter_type,
      total: 0,
      pending: 0,
    }
    row.total += amount
    if (!r.billed) row.pending += amount
    totalsMap.set(key, row)
  }
  const totals = Array.from(totalsMap.values()).sort((a, b) => a.unitLabel.localeCompare(b.unitLabel))

  return (
    <div>
      <PageHeader
        title="Meter Readings"
        description="Water, electricity, gas readings, and garbage fees — all auto-billed to the tenant's next invoice."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record reading / fee</CardTitle>
        </CardHeader>
        <CardContent>
          <MeterReadingForm units={units ?? []} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Totals per house</CardTitle>
          <CardDescription>Lifetime total charged per unit, per utility — pending amounts have not been invoiced yet.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total charged</TableHead>
                <TableHead>Pending (not yet invoiced)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.length > 0 ? (
                totals.map((t) => (
                  <TableRow key={`${t.unitLabel}-${t.meterType}`}>
                    <TableCell className="font-medium text-slate-900">{t.unitLabel}</TableCell>
                    <TableCell className="capitalize">{t.meterType}</TableCell>
                    <TableCell>{formatMoney(t.total, currency)}</TableCell>
                    <TableCell>
                      {t.pending > 0 ? (
                        <Badge variant="warning">{formatMoney(t.pending, currency)}</Badge>
                      ) : (
                        formatMoney(0, currency)
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={4}>No readings recorded yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Meter</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings && readings.length > 0 ? (
                readings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.unit?.property?.name} · {r.unit?.unit_no}
                    </TableCell>
                    <TableCell>
                      {r.lease?.tenant?.full_name ?? <span className="text-slate-400">No tenant at the time</span>}
                    </TableCell>
                    <TableCell className="capitalize">{r.meter_type}</TableCell>
                    <TableCell>{formatDate(r.reading_date)}</TableCell>
                    <TableCell>
                      {isFlatFeeMeterType(r.meter_type)
                        ? formatMoney(meterReadingAmount(r), currency)
                        : `${(Number(r.current_reading) - Number(r.previous_reading)).toFixed(2)} units`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.billed ? 'success' : 'default'}>{r.billed ? 'Billed' : 'Pending'}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={6}>No readings recorded yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination currentPage={page} totalPages={getTotalPages(count)} basePath="/billing/meter-readings" />
      </Card>
    </div>
  )
}
