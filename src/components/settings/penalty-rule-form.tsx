'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePenaltyRule } from '@/lib/actions/billing'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Tables } from '@/lib/types/database'

export function PenaltyRuleForm({ rule }: { rule: Tables<'penalty_rules'> }) {
  const [state, formAction] = useActionState(updatePenaltyRule, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={rule.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="grace_period_days">Grace period (days)</Label>
        <Input
          key={rule.grace_period_days}
          id="grace_period_days"
          name="grace_period_days"
          type="number"
          min={0}
          defaultValue={rule.grace_period_days}
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="penalty_kind">Penalty type</Label>
        <Select
          key={rule.penalty_kind}
          id="penalty_kind"
          name="penalty_kind"
          defaultValue={rule.penalty_kind}
          className="w-36"
        >
          <option value="flat">Flat amount</option>
          <option value="percentage">% of balance</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="penalty_value">Value</Label>
        <Input
          key={rule.penalty_value}
          id="penalty_value"
          name="penalty_value"
          type="number"
          step="0.01"
          defaultValue={rule.penalty_value}
          className="w-32"
        />
      </div>
      <SubmitButton pendingText="Saving…">Save</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
