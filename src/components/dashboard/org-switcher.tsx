'use client'

import { useTransition } from 'react'
import { switchOrg } from '@/lib/actions/org'
import type { OrgMembership } from '@/lib/session'

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: OrgMembership[]
  activeOrgId: string
}) {
  const [isPending, startTransition] = useTransition()

  if (memberships.length <= 1) {
    return <span className="text-sm font-medium text-slate-700">{memberships[0]?.organization.name}</span>
  }

  return (
    <select
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 disabled:opacity-60"
      defaultValue={activeOrgId}
      disabled={isPending}
      onChange={(e) => {
        const formData = new FormData()
        formData.set('org_id', e.target.value)
        startTransition(() => {
          switchOrg(formData)
        })
      }}
    >
      {memberships.map((m) => (
        <option key={m.org_id} value={m.org_id}>
          {m.organization.name}
        </option>
      ))}
    </select>
  )
}
