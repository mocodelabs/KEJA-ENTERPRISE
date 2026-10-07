import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LeaseTerminationForm } from '@/components/tenants/lease-termination-form'
import { formatMoney } from '@/lib/utils'
import { UNIT_TYPE_LABELS } from '@/lib/unitTypes'

export default async function TerminateLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, active } = await requireActiveOrg()

  const { data: lease } = await supabase
    .from('leases')
    .select('*, tenant:tenants(full_name, phone), unit:units(unit_no, unit_type, property:properties(name))')
    .eq('org_id', active.org_id)
    .eq('id', id)
    .single()

  if (!lease) notFound()

  const currency = active.organization.currency

  return (
    <div>
      <PageHeader
        title="Terminate lease"
        description={`${lease.tenant?.full_name ?? 'Unknown tenant'} · ${lease.unit?.property?.name ?? ''} Unit ${lease.unit?.unit_no ?? ''}`}
      />

      {lease.status !== 'active' ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            This lease is {lease.status} and can no longer be terminated.{' '}
            <Link href="/leases" className="text-emerald-700 hover:underline">
              Back to leases
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Termination details</CardTitle>
            <CardDescription>
              Record arrears, deposit deductions, and maintenance/other charges. Everything below is deducted from
              the {formatMoney(Number(lease.deposit_amount), currency)} deposit automatically to compute the
              refund or balance due, and a termination report is generated once submitted.
              {lease.unit?.unit_type && ` Unit type: ${UNIT_TYPE_LABELS[lease.unit.unit_type]}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaseTerminationForm leaseId={lease.id} depositAmount={Number(lease.deposit_amount)} currency={currency} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
