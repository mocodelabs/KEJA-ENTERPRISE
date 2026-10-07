'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/lib/actions/integrations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'
import type { OrgMembership } from '@/lib/session'

export function ProfileForm({ member, email }: { member: OrgMembership; email: string }) {
  const [state, formAction] = useActionState(updateProfile, null)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required defaultValue={member.full_name ?? ''} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={member.phone ?? ''} placeholder="0712 345 678" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled className="bg-slate-50 text-slate-500" />
        <p className="text-xs text-slate-400">Your login email can&apos;t be changed here.</p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Saving…" className="w-fit">
        Save profile
      </SubmitButton>
    </form>
  )
}
