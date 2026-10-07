'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addExpense } from '@/lib/actions/accounting'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type PropertyOption = { id: string; name: string }

export function ExpenseForm({ properties }: { properties: PropertyOption[] }) {
  const [state, formAction] = useActionState(addExpense, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_id">Property</Label>
        <Select id="property_id" name="property_id" defaultValue="">
          <option value="">General / office expense</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" name="category" required placeholder="Repairs, utilities, security…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Amount (KES)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expense_date">Date</Label>
        <Input id="expense_date" name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Optional notes" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
        <SubmitButton pendingText="Saving…">Record expense</SubmitButton>
      </div>
    </form>
  )
}
