'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePropertyCommission } from '@/lib/actions/properties'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function PropertyCommissionForm({
  propertyId,
  rate,
  orgDefaultRate,
}: {
  propertyId: string
  rate: number | null
  orgDefaultRate: number
}) {
  const [state, formAction] = useActionState(updatePropertyCommission, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Commission on this property</span>
        <div className="flex items-center gap-2">
          <Input
            key={rate}
            name="commission_rate"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={rate ?? ''}
            placeholder={`Org default (${orgDefaultRate}%)`}
            className="w-32 text-right"
          />
          <span className="text-sm text-slate-500">%</span>
          <SubmitButton size="sm" pendingText="Saving…">
            Save
          </SubmitButton>
        </div>
      </div>
      <p className="text-right text-xs text-slate-400">
        Leave blank to use the org default of {orgDefaultRate}%. Owners pegged to this property use this rate.
      </p>
      {state?.error && <p className="text-right text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-right text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
