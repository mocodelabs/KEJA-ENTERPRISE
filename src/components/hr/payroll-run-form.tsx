'use client'

import { useActionState } from 'react'
import { createPayrollRun } from '@/lib/actions/hr'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

function firstOfMonth() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}
function endOfMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

export function PayrollRunForm() {
  const [state, formAction] = useActionState(createPayrollRun, null)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="period_start">Period start</Label>
        <Input id="period_start" name="period_start" type="date" defaultValue={firstOfMonth()} className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="period_end">Period end</Label>
        <Input id="period_end" name="period_end" type="date" defaultValue={endOfMonth()} className="w-40" />
      </div>
      <SubmitButton pendingText="Creating…">Create payroll run</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
