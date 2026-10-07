'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { changePropertyOwner } from '@/lib/actions/properties'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type ClientOption = { id: string; full_name: string }

const NEW_OWNER_VALUE = '__new__'

export function ChangeOwnerForm({
  propertyId,
  currentClientId,
  clients,
}: {
  propertyId: string
  currentClientId: string | null
  clients: ClientOption[]
}) {
  const [state, formAction] = useActionState(changePropertyOwner, null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [selection, setSelection] = useState(currentClientId ?? '')
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setSelection(currentClientId ?? '')
  }

  useEffect(() => {
    if (state?.message) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state, router])

  const isNewOwner = selection === NEW_OWNER_VALUE

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client_id">Owner</Label>
        <Select
          id="client_id"
          name="client_id"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
        >
          <option value="">This org owns it directly</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
              {c.id === currentClientId ? ' (current owner)' : ''}
            </option>
          ))}
          <option value={NEW_OWNER_VALUE}>Other — new owner…</option>
        </Select>
      </div>

      {isNewOwner && (
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new_owner_full_name">Full name</Label>
            <Input id="new_owner_full_name" name="new_owner_full_name" required placeholder="John Kamau" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new_owner_phone">Phone</Label>
              <Input id="new_owner_phone" name="new_owner_phone" placeholder="0712 345 678" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new_owner_email">Email</Label>
              <Input id="new_owner_email" name="new_owner_email" type="email" placeholder="owner@example.com" />
            </div>
          </div>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Transferring…" className="w-fit">
        Change ownership
      </SubmitButton>
    </form>
  )
}
