'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createEquipment } from '@/lib/actions/assets'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function EquipmentForm() {
  const [state, formAction] = useActionState(createEquipment, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Item name</Label>
        <Input id="name" name="name" required placeholder="Laptop, printer, mower…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" placeholder="Office, field, IT…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="value">Value (KES)</Label>
        <Input id="value" name="value" type="number" step="0.01" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="purchase_date">Purchase date</Label>
        <Input id="purchase_date" name="purchase_date" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assigned_to">Assigned to</Label>
        <Input id="assigned_to" name="assigned_to" placeholder="Staff name or office" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue="in_use">
          <option value="in_use">In use</option>
          <option value="in_storage">In storage</option>
          <option value="maintenance">Maintenance</option>
          <option value="disposed">Disposed</option>
        </Select>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
        <SubmitButton pendingText="Adding…">Add equipment</SubmitButton>
      </div>
    </form>
  )
}
