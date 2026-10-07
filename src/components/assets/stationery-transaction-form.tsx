'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addStationeryTransaction } from '@/lib/actions/assets'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type ItemOption = { id: string; name: string; unit: string }

export function StationeryTransactionForm({ items }: { items: ItemOption[] }) {
  const [state, formAction] = useActionState(addStationeryTransaction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item_id">Item</Label>
        <Select id="item_id" name="item_id" required defaultValue="" className="w-56">
          <option value="" disabled>
            Select item
          </option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="txn_type">Type</Label>
        <Select id="txn_type" name="txn_type" defaultValue="in" className="w-32">
          <option value="in">Stock in</option>
          <option value="out">Usage / out</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quantity">Quantity</Label>
        <Input id="quantity" name="quantity" type="number" step="0.01" required className="w-28" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" className="w-48" />
      </div>
      <SubmitButton pendingText="Saving…">Log transaction</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
