'use client'

import { useActionState, useState } from 'react'
import { updateWhatsappGatewaySettings } from '@/lib/actions/integrations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Enums } from '@/lib/types/database'

const WHATSAPP_PROVIDERS: { value: Enums<'whatsapp_provider'>; label: string; description: string }[] = [
  { value: 'console', label: 'None (log only)', description: 'Messages are logged, not actually sent. Default until you configure a real provider.' },
  { value: 'whatsapp_cloud_api', label: 'WhatsApp Cloud API', description: "Meta's official WhatsApp Business Platform API." },
  { value: 'twilio_whatsapp', label: 'Twilio for WhatsApp', description: 'Send WhatsApp messages via Twilio.' },
  { value: 'custom', label: 'Custom API', description: 'Any other WhatsApp Business API provider.' },
]

export type SafeWhatsappSettings = {
  provider: Enums<'whatsapp_provider'>
  phone_number_id: string | null
  business_account_id: string | null
  accessTokenMasked: string | null
}

export function WhatsappGatewayForm({ settings }: { settings: SafeWhatsappSettings | null }) {
  const [state, formAction] = useActionState(updateWhatsappGatewaySettings, null)
  const [provider, setProvider] = useState<Enums<'whatsapp_provider'>>(settings?.provider ?? 'console')
  const meta = WHATSAPP_PROVIDERS.find((p) => p.value === provider)!
  const needsKeys = provider !== 'console'

  return (
    <form action={formAction} key={settings?.provider ?? 'console'} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="provider">Provider</Label>
        <Select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Enums<'whatsapp_provider'>)}
        >
          {WHATSAPP_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-400">{meta.description}</p>
      </div>

      {needsKeys && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone_number_id">Phone number ID</Label>
            <Input id="phone_number_id" name="phone_number_id" defaultValue={settings?.phone_number_id ?? ''} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="business_account_id">Business account ID</Label>
            <Input
              id="business_account_id"
              name="business_account_id"
              defaultValue={settings?.business_account_id ?? ''}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="access_token">Access token</Label>
            <Input
              id="access_token"
              name="access_token"
              type="password"
              placeholder={
                settings?.accessTokenMasked ? `Saved (${settings.accessTokenMasked}) — leave blank to keep it` : 'Access token'
              }
            />
          </div>
        </>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Saving…" className="w-fit">
        Save WhatsApp settings
      </SubmitButton>
    </form>
  )
}
