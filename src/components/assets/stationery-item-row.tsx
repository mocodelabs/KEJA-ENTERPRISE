'use client'

import { useActionState, useState } from 'react'
import { updateStationeryItem } from '@/lib/actions/assets'
import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Pencil } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import type { Tables } from '@/lib/types/database'

export function StationeryItemRow({ item, currency }: { item: Tables<'stationery_items'>; currency: string }) {
  const [mode, setMode] = useState<'collapsed' | 'edit'>('collapsed')
  const [state, formAction] = useActionState(updateStationeryItem, null)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setMode('collapsed')
  }

  const low = Number(item.quantity_on_hand) <= Number(item.reorder_level)

  if (mode === 'collapsed') {
    return (
      <TableRow>
        <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
        <TableCell>
          {item.quantity_on_hand} {item.unit}
        </TableCell>
        <TableCell>
          {item.reorder_level} {item.unit}
        </TableCell>
        <TableCell>{item.unit_cost != null ? formatMoney(Number(item.unit_cost), currency) : '—'}</TableCell>
        <TableCell>
          <Badge variant={low ? 'danger' : 'success'}>{low ? 'Reorder soon' : 'OK'}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button type="button" variant="ghost" size="icon" onClick={() => setMode('edit')} title="Edit item">
            <Pencil className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={6}>
        <form action={formAction} className="flex flex-wrap items-end gap-3 py-2">
          <input type="hidden" name="id" value={item.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name_${item.id}`}>Item name</Label>
            <Input id={`name_${item.id}`} name="name" defaultValue={item.name} required className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`unit_${item.id}`}>Unit</Label>
            <Input id={`unit_${item.id}`} name="unit" defaultValue={item.unit} className="w-24" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`reorder_${item.id}`}>Reorder level</Label>
            <Input
              id={`reorder_${item.id}`}
              name="reorder_level"
              type="number"
              defaultValue={item.reorder_level}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`cost_${item.id}`}>Cost per unit (KES)</Label>
            <Input
              id={`cost_${item.id}`}
              name="unit_cost"
              type="number"
              step="0.01"
              defaultValue={item.unit_cost ?? ''}
              className="w-32"
            />
          </div>
          <div className="flex gap-2">
            <SubmitButton pendingText="Saving…" size="sm">
              Save
            </SubmitButton>
            <Button type="button" variant="outline" size="sm" onClick={() => setMode('collapsed')}>
              Cancel
            </Button>
          </div>
          {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        </form>
      </TableCell>
    </TableRow>
  )
}
