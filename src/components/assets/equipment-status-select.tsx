'use client'

import { useTransition } from 'react'
import { updateEquipmentStatus } from '@/lib/actions/assets'
import type { Enums } from '@/lib/types/database'

const STATUS_STYLES: Record<Enums<'equipment_status'>, string> = {
  in_use: 'bg-emerald-100 text-emerald-800',
  in_storage: 'bg-slate-100 text-slate-700',
  maintenance: 'bg-amber-100 text-amber-800',
  disposed: 'bg-red-100 text-red-800',
}

export function EquipmentStatusSelect({ id, status }: { id: string; status: Enums<'equipment_status'> }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => {
          void updateEquipmentStatus(id, e.target.value as Enums<'equipment_status'>)
        })
      }
      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      <option value="in_use">In use</option>
      <option value="in_storage">In storage</option>
      <option value="maintenance">Maintenance</option>
      <option value="disposed">Disposed</option>
    </select>
  )
}
