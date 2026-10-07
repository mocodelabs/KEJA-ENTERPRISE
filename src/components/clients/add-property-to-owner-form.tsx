'use client'

import { useActionState, useEffect, useRef } from 'react'
import { assignPropertyToOwner } from '@/lib/actions/clients'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type PropertyOption = { id: string; name: string }

export function AddPropertyToOwnerForm({
  clientId,
  availableProperties,
}: {
  clientId: string
  availableProperties: PropertyOption[]
}) {
  const [state, formAction] = useActionState(assignPropertyToOwner, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  if (availableProperties.length === 0) {
    return <p className="text-sm text-slate-400">No unowned properties available to add.</p>
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="client_id" value={clientId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_id">Property</Label>
        <Select id="property_id" name="property_id" required defaultValue="" className="w-64">
          <option value="" disabled>
            Select a property
          </option>
          {availableProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton pendingText="Adding…">Add property</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
