'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrgCommission } from '@/lib/actions/org'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'

export function CommissionForm({ rate }: { rate: number }) {
  const [state, formAction] = useActionState(updateOrgCommission, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Default commission</span>
        <div className="flex items-center gap-2">
          <Input
            key={rate}
            name="default_commission_rate"
            type="number"
            step="0.01"
            min={0}
            max={100}
            defaultValue={rate}
            className="w-20 text-right"
          />
          <span className="text-sm text-slate-500">%</span>
          <SubmitButton size="sm" pendingText="Saving…">
            Save
          </SubmitButton>
        </div>
      </div>
      {state?.error && <p className="text-right text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-right text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
