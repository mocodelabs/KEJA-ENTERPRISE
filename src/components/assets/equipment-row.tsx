'use client'

import { useActionState, useState } from 'react'
import { updateEquipment, deleteEquipment } from '@/lib/actions/assets'
import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { EquipmentStatusSelect } from '@/components/assets/equipment-status-select'
import { Pencil } from 'lucide-react'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Tables } from '@/lib/types/database'

export function EquipmentRow({ equipment, currency }: { equipment: Tables<'equipment'>; currency: string }) {
  const [mode, setMode] = useState<'collapsed' | 'edit'>('collapsed')
  const [state, formAction] = useActionState(updateEquipment, null)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setMode('collapsed')
  }

  if (mode === 'collapsed') {
    return (
      <TableRow>
        <TableCell className="font-medium text-slate-900">{equipment.name}</TableCell>
        <TableCell>{equipment.category ?? '—'}</TableCell>
        <TableCell>{equipment.value != null ? formatMoney(Number(equipment.value), currency) : '—'}</TableCell>
        <TableCell>{equipment.purchase_date ? formatDate(equipment.purchase_date) : '—'}</TableCell>
        <TableCell>{equipment.assigned_to ?? '—'}</TableCell>
        <TableCell>
          <EquipmentStatusSelect id={equipment.id} status={equipment.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => setMode('edit')} title="Edit equipment">
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteButton action={deleteEquipment.bind(null, equipment.id)} />
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={7}>
        <form action={formAction} className="flex flex-wrap items-end gap-3 py-2">
          <input type="hidden" name="id" value={equipment.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name_${equipment.id}`}>Item name</Label>
            <Input id={`name_${equipment.id}`} name="name" defaultValue={equipment.name} required className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`category_${equipment.id}`}>Category</Label>
            <Input
              id={`category_${equipment.id}`}
              name="category"
              defaultValue={equipment.category ?? ''}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`value_${equipment.id}`}>Value (KES)</Label>
            <Input
              id={`value_${equipment.id}`}
              name="value"
              type="number"
              step="0.01"
              defaultValue={equipment.value ?? ''}
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`purchase_${equipment.id}`}>Purchase date</Label>
            <Input
              id={`purchase_${equipment.id}`}
              name="purchase_date"
              type="date"
              defaultValue={equipment.purchase_date ?? ''}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`assigned_${equipment.id}`}>Assigned to</Label>
            <Input
              id={`assigned_${equipment.id}`}
              name="assigned_to"
              defaultValue={equipment.assigned_to ?? ''}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`status_${equipment.id}`}>Status</Label>
            <Select id={`status_${equipment.id}`} name="status" defaultValue={equipment.status} className="w-36">
              <option value="in_use">In use</option>
              <option value="in_storage">In storage</option>
              <option value="maintenance">Maintenance</option>
              <option value="disposed">Disposed</option>
            </Select>
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
