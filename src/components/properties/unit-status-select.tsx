'use client'

import { useTransition } from 'react'
import { updateUnitStatus } from '@/lib/actions/units'
import type { Enums } from '@/lib/types/database'

const STATUS_STYLES: Record<Enums<'unit_status'>, string> = {
  vacant: 'bg-slate-100 text-slate-700',
  occupied: 'bg-emerald-100 text-emerald-800',
  maintenance: 'bg-amber-100 text-amber-800',
}

export function UnitStatusSelect({
  unitId,
  propertyId,
  status,
}: {
  unitId: string
  propertyId: string
  status: Enums<'unit_status'>
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => {
          updateUnitStatus(unitId, propertyId, e.target.value as Enums<'unit_status'>)
        })
      }
      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      <option value="vacant">Vacant</option>
      <option value="occupied">Occupied</option>
      <option value="maintenance">Maintenance</option>
    </select>
  )
}
