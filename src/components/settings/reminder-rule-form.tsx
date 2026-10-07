'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateReminderRule } from '@/lib/actions/billing'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Tables } from '@/lib/types/database'

export function ReminderRuleForm({ rule }: { rule: Tables<'reminder_rules'> }) {
  const [state, formAction] = useActionState(updateReminderRule, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={rule.id} />
      <div className="flex flex-col gap-1.5">
        <Label>{rule.trigger_type === 'rent_due' ? 'Rent due reminders' : 'Partial payment reminders'}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Repeat every</span>
          <Input
            key={rule.repeat_every_days}
            name="repeat_every_days"
            type="number"
            min={1}
            defaultValue={rule.repeat_every_days}
            className="w-20"
          />
          <span className="text-sm text-slate-500">days</span>
        </div>
      </div>
      <SubmitButton pendingText="Saving…" size="sm">
        Save
      </SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
