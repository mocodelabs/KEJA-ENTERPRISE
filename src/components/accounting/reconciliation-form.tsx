'use client'

import { useActionState } from 'react'
import { runReconciliation } from '@/lib/actions/accounting'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type PropertyOption = { id: string; name: string }

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

export function ReconciliationForm({ properties }: { properties: PropertyOption[] }) {
  const [state, formAction] = useActionState(runReconciliation, null)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_id">Property</Label>
        <Select id="property_id" name="property_id" required defaultValue="" className="w-56">
          <option value="" disabled>
            Select a property
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="period_start">Period start</Label>
        <Input id="period_start" name="period_start" type="date" defaultValue={firstOfMonth()} className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="period_end">Period end</Label>
        <Input id="period_end" name="period_end" type="date" defaultValue={endOfMonth()} className="w-40" />
      </div>
      <SubmitButton pendingText="Reconciling…">Run reconciliation</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
