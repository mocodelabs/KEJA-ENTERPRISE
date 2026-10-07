'use client'

import { useActionState } from 'react'
import { updateOwnerClient } from '@/lib/actions/clients'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Tables } from '@/lib/types/database'

export function EditClientForm({ client }: { client: Tables<'clients'> }) {
  const [state, formAction] = useActionState(updateOwnerClient, null)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={client.id} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required defaultValue={client.full_name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={client.phone ?? ''} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={client.email ?? ''} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="id_number">ID number</Label>
        <Input id="id_number" name="id_number" defaultValue={client.id_number ?? ''} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={client.notes ?? ''} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Saving…" className="w-fit">
        Save changes
      </SubmitButton>
    </form>
  )
}
