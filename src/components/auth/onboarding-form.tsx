'use client'

import { useActionState } from 'react'
import { createOrganization } from '@/lib/actions/org'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function OnboardingForm({
  defaultName = '',
  defaultOrgType = 'manager',
  defaultNationalId = '',
  defaultKraPin = '',
}: {
  defaultName?: string
  defaultOrgType?: 'manager' | 'owner_direct'
  defaultNationalId?: string
  defaultKraPin?: string
}) {
  const [state, formAction] = useActionState(createOrganization, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Company / property name</Label>
        <Input id="name" name="name" required defaultValue={defaultName} placeholder="e.g. Keja Properties Ltd" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org_type">What best describes you?</Label>
        <Select id="org_type" name="org_type" defaultValue={defaultOrgType}>
          <option value="manager">I manage properties for other owners</option>
          <option value="owner_direct">I manage my own property directly</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_national_id">Owner National ID</Label>
        <Input
          id="owner_national_id"
          name="owner_national_id"
          required
          inputMode="numeric"
          defaultValue={defaultNationalId}
          placeholder="e.g. 12345678"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_kra_pin">Owner KRA PIN</Label>
        <Input
          id="owner_kra_pin"
          name="owner_kra_pin"
          required
          defaultValue={defaultKraPin}
          placeholder="e.g. A012345678Z"
          className="uppercase"
          maxLength={11}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton className="mt-2 w-full" pendingText="Setting up…">
        Continue to dashboard
      </SubmitButton>
    </form>
  )
}
