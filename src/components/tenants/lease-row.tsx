'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { updateLease, endLease } from '@/lib/actions/leases'
import { TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pencil, FileText } from 'lucide-react'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { UNIT_TYPE_LABELS } from '@/lib/unitTypes'
import type { Enums, Tables } from '@/lib/types/database'

const STATUS_VARIANT = { active: 'success', ended: 'default', terminated: 'danger' } as const

type LeaseWithRelations = Tables<'leases'> & {
  tenant: { full_name: string } | null
  unit: { unit_no: string; unit_type: Enums<'unit_type'>; property: { name: string } | null } | null
}

export function LeaseRow({ lease, currency }: { lease: LeaseWithRelations; currency: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [state, formAction] = useActionState(updateLease, null)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="font-medium text-slate-900">{lease.tenant?.full_name}</TableCell>
        <TableCell>
          {lease.unit?.property?.name} · {lease.unit?.unit_no}
          {lease.unit?.unit_type && (
            <span className="text-slate-400"> ({UNIT_TYPE_LABELS[lease.unit.unit_type]})</span>
          )}
        </TableCell>
        <TableCell>{formatMoney(Number(lease.rent_amount), currency)}</TableCell>
        <TableCell>{formatMoney(Number(lease.deposit_amount), currency)}</TableCell>
        <TableCell>{formatDate(lease.start_date)}</TableCell>
        <TableCell>
          <Badge variant={STATUS_VARIANT[lease.status]}>{lease.status}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {lease.status === 'terminated' && (
              <Link
                href={`/leases/${lease.id}/termination`}
                title="View termination report"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
              >
                <FileText className="h-4 w-4" />
              </Link>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)} title="Edit lease terms">
              <Pencil className="h-4 w-4" />
            </Button>
            {lease.status === 'active' && (
              <DeleteButton
                action={endLease.bind(null, lease.id, lease.unit_id)}
                confirmText="End this lease and mark the unit vacant?"
              />
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={7}>
        <form action={formAction} className="flex flex-wrap items-end gap-3 py-2">
          <input type="hidden" name="id" value={lease.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`rent_amount_${lease.id}`}>Rent (KES)</Label>
            <Input
              id={`rent_amount_${lease.id}`}
              name="rent_amount"
              type="number"
              step="0.01"
              required
              defaultValue={lease.rent_amount}
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`deposit_amount_${lease.id}`}>Deposit (KES)</Label>
            <Input
              id={`deposit_amount_${lease.id}`}
              name="deposit_amount"
              type="number"
              step="0.01"
              defaultValue={lease.deposit_amount}
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`billing_day_${lease.id}`}>Rent due day</Label>
            <Input
              id={`billing_day_${lease.id}`}
              name="billing_day"
              type="number"
              min={1}
              max={28}
              defaultValue={lease.billing_day}
              className="w-24"
            />
          </div>
          <div className="flex gap-2">
            <SubmitButton pendingText="Saving…" size="sm">
              Save
            </SubmitButton>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            {lease.status === 'active' && (
              <Link
                href={`/leases/${lease.id}/terminate`}
                className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'ml-2')}
              >
                Terminate lease
              </Link>
            )}
          </div>
          {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        </form>
      </TableCell>
    </TableRow>
  )
}
