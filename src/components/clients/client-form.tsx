'use client'

import { useActionState, useEffect, useRef } from 'react'
import { addOwnerClient } from '@/lib/actions/clients'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type PropertyOption = { id: string; name: string }

export function ClientForm({ properties }: { properties: PropertyOption[] }) {
  const [state, formAction] = useActionState(addOwnerClient, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  if (properties.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No unowned properties available — add a new property, or use Change ownership on an existing
        property&apos;s page to reassign it.
      </p>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required placeholder="John Kamau" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_id">Property</Label>
        <Select id="property_id" name="property_id" required defaultValue="">
          <option value="" disabled>
            Select a property
          </option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-400">Only unowned properties are listed.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="0712 345 678" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="owner@example.com" />
      </div>
      <p className="text-xs text-slate-400">
        Commission is set on the property, not the owner — edit it from the property page after adding this owner.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Adding…">Add owner</SubmitButton>
    </form>
  )
}
