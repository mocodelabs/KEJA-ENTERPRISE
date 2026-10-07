import { headers } from 'next/headers'
import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { PaymentGatewayForm } from '@/components/settings/payment-gateway-form'
import { PaymentGatewayList } from '@/components/settings/payment-gateway-list'
import { CopyableCode } from '@/components/settings/copyable-code'
import { summarizeGatewayConfig } from '@/lib/paymentProviders'
import type { Enums } from '@/lib/types/database'

export default async function PaymentGatewaySettingsPage() {
  const { supabase, active } = await requireActiveOrg()

  const { data: gateways } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('org_id', active.org_id)
    .order('created_at', { ascending: true })

  const headersList = await headers()
  const host = headersList.get('host') ?? 'your-app-domain.com'
  const proto = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const origin = `${proto}://${host}`
  const hasMpesaGateway = (gateways ?? []).some((g) => g.provider === 'mpesa_paybill' || g.provider === 'mpesa_till')
  const hasBankGateway = (gateways ?? []).some((g) => g.provider === 'bank_account')

  const existing: Partial<
    Record<
      Enums<'payment_provider'>,
      { display_name: string | null; values: Record<string, string>; secretsMasked: Record<string, string | null> }
    >
  > = {}
  for (const gw of gateways ?? []) {
    const { values, secretsMasked } = summarizeGatewayConfig(gw.provider, (gw.config as Record<string, unknown>) ?? {})
    existing[gw.provider] = { display_name: gw.display_name, values, secretsMasked }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Payment gateways tenants and owners can pay you through." />
      <SettingsTabs />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add / update a gateway</CardTitle>
            <CardDescription>
              Bank works with just account details. Paybill and Till work the same way, with optional Daraja API
              keys if you want to automate collection later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentGatewayForm existing={existing} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configured gateways</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentGatewayList gateways={gateways ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Automatic payments</CardTitle>
          <CardDescription>
            Register these URLs with your provider so a tenant&apos;s payment automatically records against their
            invoice and sends a receipt — no manual entry needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-700">M-Pesa (Paybill / Till) confirmation URL</p>
            <CopyableCode value={`${origin}/api/webhooks/mpesa/${active.org_id}`} />
            <p className="text-xs text-slate-400">
              {hasMpesaGateway
                ? 'Register this as your C2B Confirmation URL in the Daraja API portal.'
                : 'Configure an M-Pesa Paybill or Till above first — this URL only accepts payments once one is active.'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-700">Bank payment notification URL</p>
            <CopyableCode value={`${origin}/api/webhooks/bank/${active.org_id}`} />
            <p className="text-xs text-slate-400">
              {hasBankGateway
                ? "Generic endpoint — adapt it to your bank's actual callback format before going live (see the code comment in src/app/api/webhooks/bank/[orgId]/route.ts)."
                : 'Configure a bank account above first — this URL only accepts payments once one is active.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
