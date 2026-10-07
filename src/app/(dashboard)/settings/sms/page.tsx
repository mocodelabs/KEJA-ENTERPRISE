import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { SmsGatewayForm, type SafeSmsSettings } from '@/components/settings/sms-gateway-form'
import { maskSecret } from '@/lib/secrets'

export default async function SmsGatewaySettingsPage() {
  const { supabase, active } = await requireActiveOrg()

  const { data: settings } = await supabase
    .from('sms_gateway_settings')
    .select('provider, sender_id, api_key, api_secret')
    .eq('org_id', active.org_id)
    .maybeSingle()

  const safeSettings: SafeSmsSettings | null = settings
    ? {
        provider: settings.provider,
        sender_id: settings.sender_id,
        apiKeyMasked: maskSecret(settings.api_key),
        apiSecretMasked: maskSecret(settings.api_secret),
      }
    : null

  return (
    <div>
      <PageHeader title="Settings" description="Configure the SMS gateway used for tenant reminders and notices." />
      <SettingsTabs />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>SMS Gateway</CardTitle>
          <CardDescription>Used for rent reminders, penalty notices, and receipts sent by SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          <SmsGatewayForm settings={safeSettings} />
        </CardContent>
      </Card>
    </div>
  )
}
