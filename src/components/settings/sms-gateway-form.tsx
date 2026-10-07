'use client'

import { useActionState, useState } from 'react'
import { updateSmsGatewaySettings } from '@/lib/actions/integrations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Enums } from '@/lib/types/database'

const SMS_PROVIDERS: { value: Enums<'sms_provider'>; label: string; description: string }[] = [
  { value: 'console', label: 'None (log only)', description: 'Messages are logged, not actually sent. Default until you configure a real provider.' },
  { value: 'africastalking', label: "Africa's Talking", description: 'Popular SMS gateway for Kenya and East Africa.' },
  { value: 'twilio', label: 'Twilio', description: 'Global SMS gateway.' },
  { value: 'custom', label: 'Custom API', description: 'Any other SMS provider with an API key/secret pair.' },
]

export type SafeSmsSettings = {
  provider: Enums<'sms_provider'>
  sender_id: string | null
  apiKeyMasked: string | null
  apiSecretMasked: string | null
}

export function SmsGatewayForm({ settings }: { settings: SafeSmsSettings | null }) {
  const [state, formAction] = useActionState(updateSmsGatewaySettings, null)
  const [provider, setProvider] = useState<Enums<'sms_provider'>>(settings?.provider ?? 'console')
  const meta = SMS_PROVIDERS.find((p) => p.value === provider)!
  const needsKeys = provider !== 'console'

  return (
    <form action={formAction} key={settings?.provider ?? 'console'} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="provider">Provider</Label>
        <Select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Enums<'sms_provider'>)}
        >
          {SMS_PROVIDERS.map((p) => (
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
            <Label htmlFor="sender_id">Sender ID</Label>
            <Input id="sender_id" name="sender_id" defaultValue={settings?.sender_id ?? ''} placeholder="e.g. KEJA" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="api_key">API key</Label>
            <Input
              id="api_key"
              name="api_key"
              type="password"
              placeholder={settings?.apiKeyMasked ? `Saved (${settings.apiKeyMasked}) — leave blank to keep it` : 'API key'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="api_secret">API secret</Label>
            <Input
              id="api_secret"
              name="api_secret"
              type="password"
              placeholder={
                settings?.apiSecretMasked
                  ? `Saved (${settings.apiSecretMasked}) — leave blank to keep it`
                  : 'API secret (if required)'
              }
            />
          </div>
        </>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Saving…" className="w-fit">
        Save SMS settings
      </SubmitButton>
    </form>
  )
}
