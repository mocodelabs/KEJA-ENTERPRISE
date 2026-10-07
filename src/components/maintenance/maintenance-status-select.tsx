'use client'

import { useTransition } from 'react'
import { updateMaintenanceStatus } from '@/lib/actions/maintenance'
import type { Enums } from '@/lib/types/database'

const STATUS_STYLES: Record<Enums<'maintenance_status'>, string> = {
  open: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
}

export function MaintenanceStatusSelect({ id, status }: { id: string; status: Enums<'maintenance_status'> }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => {
          updateMaintenanceStatus(id, e.target.value as Enums<'maintenance_status'>)
        })
      }
      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      <option value="open">Open</option>
      <option value="resolved">Resolved</option>
    </select>
  )
}
