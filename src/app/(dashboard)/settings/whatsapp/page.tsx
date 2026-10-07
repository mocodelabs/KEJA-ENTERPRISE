import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { WhatsappGatewayForm, type SafeWhatsappSettings } from '@/components/settings/whatsapp-gateway-form'
import { maskSecret } from '@/lib/secrets'

export default async function WhatsappGatewaySettingsPage() {
  const { supabase, active } = await requireActiveOrg()

  const { data: settings } = await supabase
    .from('whatsapp_gateway_settings')
    .select('provider, phone_number_id, business_account_id, access_token')
    .eq('org_id', active.org_id)
    .maybeSingle()

  const safeSettings: SafeWhatsappSettings | null = settings
    ? {
        provider: settings.provider,
        phone_number_id: settings.phone_number_id,
        business_account_id: settings.business_account_id,
        accessTokenMasked: maskSecret(settings.access_token),
      }
    : null

  return (
    <div>
      <PageHeader title="Settings" description="Configure WhatsApp as a messaging channel to tenants." />
      <SettingsTabs />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>WhatsApp Gateway</CardTitle>
          <CardDescription>Send rent reminders, penalty notices, and receipts over WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsappGatewayForm settings={safeSettings} />
        </CardContent>
      </Card>
    </div>
  )
}
