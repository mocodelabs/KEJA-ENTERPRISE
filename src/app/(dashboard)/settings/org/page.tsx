import { requireActiveOrg } from '@/lib/session'
import { isPropertyManager } from '@/lib/orgAccess'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PenaltyRuleForm } from '@/components/settings/penalty-rule-form'
import { ReminderRuleForm } from '@/components/settings/reminder-rule-form'
import { CommissionForm } from '@/components/settings/commission-form'
import { TaxIdentityForm } from '@/components/settings/tax-identity-form'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default async function OrgSettingsPage() {
  const { supabase, active } = await requireActiveOrg()

  const [{ data: penaltyRules }, { data: reminderRules }, { data: members }] = await Promise.all([
    supabase.from('penalty_rules').select('*').eq('org_id', active.org_id).is('property_id', null),
    supabase.from('reminder_rules').select('*').eq('org_id', active.org_id).is('property_id', null),
    supabase.from('org_members').select('*').eq('org_id', active.org_id),
  ])

  return (
    <div>
      <PageHeader title="Settings" description={active.organization.name} />
      <SettingsTabs />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Basic info — used across invoices and reports.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Type</span>
              <span className="capitalize">{active.organization.org_type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Currency</span>
              <span>{active.organization.currency}</span>
            </div>
            {isPropertyManager(active.organization.org_type) && (
              <CommissionForm rate={active.organization.default_commission_rate} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team members</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-0">
            {(members ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.full_name ?? 'Member'}</span>
                <Badge className="capitalize">{m.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax identity</CardTitle>
            <CardDescription>Verifies this account and will be used once tax reporting ships.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TaxIdentityForm
              nationalId={active.organization.owner_national_id}
              kraPin={active.organization.owner_kra_pin}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Default penalty rule</CardTitle>
          <CardDescription>Applied org-wide after the grace period unless a property overrides it.</CardDescription>
        </CardHeader>
        <CardContent>
          {penaltyRules && penaltyRules[0] ? (
            <PenaltyRuleForm rule={penaltyRules[0]} />
          ) : (
            <p className="text-sm text-slate-400">No default rule found.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reminder cadence</CardTitle>
          <CardDescription>How often tenants get nudged while a balance is outstanding.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(reminderRules ?? []).map((r) => (
            <ReminderRuleForm key={r.id} rule={r} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
