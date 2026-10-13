'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateOwnerTaxIdentity } from '@/lib/actions/org'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function TaxIdentityForm({
  nationalId,
  kraPin,
}: {
  nationalId: string | null
  kraPin: string | null
}) {
  const [state, formAction] = useActionState(updateOwnerTaxIdentity, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_national_id">Owner National ID (optional)</Label>
        <Input
          key={nationalId}
          id="owner_national_id"
          name="owner_national_id"
          inputMode="numeric"
          defaultValue={nationalId ?? ''}
          placeholder="e.g. 12345678"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_kra_pin">Owner KRA PIN (optional)</Label>
        <Input
          key={kraPin}
          id="owner_kra_pin"
          name="owner_kra_pin"
          defaultValue={kraPin ?? ''}
          placeholder="e.g. A012345678Z"
          className="uppercase"
          maxLength={11}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Used to verify your account and for tax reporting we&apos;re adding soon.</p>
        <SubmitButton size="sm" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
