'use client'

import { useActionState, useState } from 'react'
import { upsertPaymentGateway } from '@/lib/actions/integrations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import { PAYMENT_PROVIDERS } from '@/lib/paymentProviders'
import type { Enums } from '@/lib/types/database'

type ExistingSummary = {
  display_name: string | null
  values: Record<string, string>
  secretsMasked: Record<string, string | null>
}

export function PaymentGatewayForm({
  existing,
}: {
  existing: Partial<Record<Enums<'payment_provider'>, ExistingSummary>>
}) {
  const [state, formAction] = useActionState(upsertPaymentGateway, null)
  const [provider, setProvider] = useState<Enums<'payment_provider'>>('bank_account')

  const meta = PAYMENT_PROVIDERS.find((p) => p.value === provider)!
  const existingForProvider = existing[provider]

  return (
    <form action={formAction} key={provider} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="provider">Provider</Label>
        <Select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Enums<'payment_provider'>)}
        >
          {PAYMENT_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
              {existing[p.value] ? ' (configured)' : ''}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-400">{meta.description}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Display name (shown to tenants)</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={existingForProvider?.display_name ?? meta.label}
        />
      </div>

      {meta.fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            name={field.key}
            type={field.secret ? 'password' : 'text'}
            defaultValue={field.secret ? '' : existingForProvider?.values[field.key] ?? ''}
            placeholder={
              field.secret && existingForProvider?.secretsMasked[field.key]
                ? `Saved (${existingForProvider.secretsMasked[field.key]}) — leave blank to keep it`
                : field.placeholder
            }
          />
        </div>
      ))}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Saving…" className="w-fit">
        Save {meta.label} settings
      </SubmitButton>
    </form>
  )
}
