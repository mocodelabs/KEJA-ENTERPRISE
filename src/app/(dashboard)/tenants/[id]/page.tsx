import { notFound } from 'next/navigation'
import Link from 'next/link'
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
import { Pagination } from '@/components/dashboard/pagination'
import { formatMoney, formatDate } from '@/lib/utils'
import { isFlatFeeMeterType, meterReadingAmount } from '@/lib/services/meterReadings'
import { MAINTENANCE_ISSUE_LABELS } from '@/lib/maintenanceTypes'
import { parsePage, getPageRange, getTotalPages } from '@/lib/pagination'
import { FileText } from 'lucide-react'

export default async function TenantProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ invoices_page?: string; meters_page?: string; maintenance_page?: string }>
}) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()
  const resolvedSearchParams = await searchParams
  const invoicesPage = parsePage(resolvedSearchParams.invoices_page)
  const [invoicesFrom, invoicesTo] = getPageRange(invoicesPage)
  const metersPage = parsePage(resolvedSearchParams.meters_page)
  const [metersFrom, metersTo] = getPageRange(metersPage)
  const maintenancePage = parsePage(resolvedSearchParams.maintenance_page)
  const [maintenanceFrom, maintenanceTo] = getPageRange(maintenancePage)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, leases(*, unit:units(unit_no, property:properties(name)))')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!tenant) notFound()

  const leaseIds = (tenant.leases ?? []).map((l) => l.id)

  const contractUrls = new Map<string, string>()
  for (const lease of tenant.leases ?? []) {
    if (!lease.contract_url) continue
    const { data: signed } = await supabase.storage
      .from('lease-contracts')
      .createSignedUrl(lease.contract_url, 60 * 10)
    if (signed?.signedUrl) contractUrls.set(lease.id, signed.signedUrl)
  }

  // Unpaginated, minimal-column fetch so the summary stats above always
  // reflect the tenant's whole history, independent of the invoice table's page.
  const { data: allInvoicesForStats } = leaseIds.length
    ? await supabase
        .from('invoices')
        .select('total_amount, amount_paid, due_date, status, payments(amount, paid_at)')
        .in('lease_id', leaseIds)
    : { data: [] }

  const { data: invoices, count: invoicesCount } = leaseIds.length
    ? await supabase
        .from('invoices')
        .select('*, payments(amount, paid_at)', { count: 'exact' })
        .in('lease_id', leaseIds)
        .order('due_date', { ascending: false })
        .range(invoicesFrom, invoicesTo)
    : { data: [], count: 0 }

  const { data: meterReadings, count: meterReadingsCount } = leaseIds.length
    ? await supabase
        .from('meter_readings')
        .select('*, unit:units(unit_no, property:properties(name))', { count: 'exact' })
        .in('lease_id', leaseIds)
        .order('reading_date', { ascending: false })
        .range(metersFrom, metersTo)
    : { data: [], count: 0 }

  const { data: terminations } = leaseIds.length
    ? await supabase
        .from('lease_terminations')
        .select('lease_id, refund_amount, refunded, refunded_at')
        .in('lease_id', leaseIds)
    : { data: [] }
  const terminationByLease = new Map((terminations ?? []).map((t) => [t.lease_id, t]))

  const { data: maintenanceRecords, count: maintenanceCount } = leaseIds.length
    ? await supabase
        .from('maintenance_records')
        .select('*, unit:units(unit_no, property:properties(name))', { count: 'exact' })
        .in('lease_id', leaseIds)
        .order('reported_date', { ascending: false })
        .range(maintenanceFrom, maintenanceTo)
    : { data: [], count: 0 }

  const totalInvoiced = (allInvoicesForStats ?? []).reduce((s, i) => s + Number(i.total_amount), 0)
  const totalPaid = (allInvoicesForStats ?? []).reduce((s, i) => s + Number(i.amount_paid), 0)
  const onTimeCount = (allInvoicesForStats ?? []).filter((i) =>
    i.payments?.some((p) => new Date(p.paid_at) <= new Date(i.due_date))
  ).length
  const paidInvoiceCount = (allInvoicesForStats ?? []).filter((i) => i.status === 'paid').length
  const onTimeRate = paidInvoiceCount > 0 ? Math.round((onTimeCount / paidInvoiceCount) * 100) : null

  return (
    <div>
      <PageHeader title={tenant.full_name} description={tenant.phone} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total invoiced</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-slate-900">
            {formatMoney(totalInvoiced, active.organization.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total paid</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-slate-900">
            {formatMoney(totalPaid, active.organization.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>On-time payment rate</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-slate-900">
            {onTimeRate !== null ? `${onTimeRate}%` : '—'}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lease history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deposit held</TableHead>
                <TableHead>Deposit status</TableHead>
                <TableHead>Contract</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.leases && tenant.leases.length > 0 ? (
                tenant.leases.map((l) => {
                  const termination = terminationByLease.get(l.id)
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        {l.unit?.property?.name} · {l.unit?.unit_no}
                      </TableCell>
                      <TableCell>{formatMoney(Number(l.rent_amount), active.organization.currency)}</TableCell>
                      <TableCell>{formatDate(l.start_date)}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'active' ? 'success' : 'default'}>{l.status}</Badge>
                      </TableCell>
                      <TableCell>{formatMoney(Number(l.deposit_amount), active.organization.currency)}</TableCell>
                      <TableCell>
                        {termination ? (
                          <Link href={`/leases/${l.id}/termination`} className="hover:underline">
                            <Badge variant={termination.refunded ? 'success' : 'warning'}>
                              {termination.refunded ? 'Refunded' : 'Pending refund'}
                            </Badge>
                          </Link>
                        ) : Number(l.deposit_amount) > 0 ? (
                          <Badge variant="info">Held</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contractUrls.has(l.id) ? (
                          <a
                            href={contractUrls.get(l.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <FileText className="h-4 w-4" /> View
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableEmpty colSpan={7}>No leases.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invoice & payment history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices && invoices.length > 0 ? (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                    </TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                    <TableCell>{formatMoney(Number(inv.total_amount), active.organization.currency)}</TableCell>
                    <TableCell>{formatMoney(Number(inv.amount_paid), active.organization.currency)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === 'paid'
                            ? 'success'
                            : inv.status === 'overdue'
                              ? 'danger'
                              : inv.status === 'partial'
                                ? 'warning'
                                : 'default'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No invoices yet.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          currentPage={invoicesPage}
          totalPages={getTotalPages(invoicesCount)}
          basePath={`/tenants/${id}`}
          paramName="invoices_page"
          searchParams={resolvedSearchParams}
        />
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Meter reading history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Meter</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meterReadings && meterReadings.length > 0 ? (
                meterReadings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.unit?.property?.name} · {r.unit?.unit_no}
                    </TableCell>
                    <TableCell className="capitalize">{r.meter_type}</TableCell>
                    <TableCell>{formatDate(r.reading_date)}</TableCell>
                    <TableCell>
                      {isFlatFeeMeterType(r.meter_type)
                        ? formatMoney(meterReadingAmount(r), active.organization.currency)
                        : `${(Number(r.current_reading) - Number(r.previous_reading)).toFixed(2)} units`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.billed ? 'success' : 'default'}>{r.billed ? 'Billed' : 'Pending'}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No meter readings recorded for this tenant.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          currentPage={metersPage}
          totalPages={getTotalPages(meterReadingsCount)}
          basePath={`/tenants/${id}`}
          paramName="meters_page"
          searchParams={resolvedSearchParams}
        />
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Maintenance history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Billed to</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceRecords && maintenanceRecords.length > 0 ? (
                maintenanceRecords.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {m.unit?.property?.name} · {m.unit?.unit_no}
                    </TableCell>
                    <TableCell>{MAINTENANCE_ISSUE_LABELS[m.issue_type]}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-500">{m.description}</TableCell>
                    <TableCell>{formatMoney(Number(m.cost), active.organization.currency)}</TableCell>
                    <TableCell className="capitalize">{m.billed_to}</TableCell>
                    <TableCell>{formatDate(m.reported_date)}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'resolved' ? 'success' : 'warning'}>{m.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={7}>No maintenance records for this tenant.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <Pagination
          currentPage={maintenancePage}
          totalPages={getTotalPages(maintenanceCount)}
          basePath={`/tenants/${id}`}
          paramName="maintenance_page"
          searchParams={resolvedSearchParams}
        />
      </Card>
    </div>
  )
}
