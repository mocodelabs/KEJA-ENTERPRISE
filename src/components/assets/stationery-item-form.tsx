'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createStationeryItem } from '@/lib/actions/assets'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function StationeryItemForm() {
  const [state, formAction] = useActionState(createStationeryItem, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Item name</Label>
        <Input id="name" name="name" required placeholder="A4 paper, ink cartridge…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" name="unit" defaultValue="pcs" className="w-24" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reorder_level">Reorder level</Label>
        <Input id="reorder_level" name="reorder_level" type="number" className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit_cost">Cost per unit (KES)</Label>
        <Input id="unit_cost" name="unit_cost" type="number" step="0.01" className="w-32" />
      </div>
      <SubmitButton pendingText="Adding…">Add item</SubmitButton>
      <p className="w-full text-xs text-slate-400">
        Setting a cost means every &quot;stock in&quot; movement logs a matching expense automatically.
      </p>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
