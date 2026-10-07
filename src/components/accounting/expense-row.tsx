'use client'

import { useActionState, useState } from 'react'
import { updateExpense, deleteExpense } from '@/lib/actions/accounting'
import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Eye, Pencil } from 'lucide-react'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Tables } from '@/lib/types/database'

type PropertyOption = { id: string; name: string }
type ExpenseWithProperty = Tables<'expenses'> & { property: { name: string } | null }

export function ExpenseRow({
  expense,
  properties,
  currency,
}: {
  expense: ExpenseWithProperty
  properties: PropertyOption[]
  currency: string
}) {
  const [mode, setMode] = useState<'collapsed' | 'view' | 'edit'>('collapsed')
  const [state, formAction] = useActionState(updateExpense, null)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setMode('collapsed')
  }

  if (mode === 'collapsed') {
    return (
      <TableRow>
        <TableCell>{formatDate(expense.expense_date)}</TableCell>
        <TableCell>{expense.property?.name ?? 'General'}</TableCell>
        <TableCell>{expense.category}</TableCell>
        <TableCell className="max-w-xs truncate text-slate-500">{expense.description ?? '—'}</TableCell>
        <TableCell className="text-right">{formatMoney(Number(expense.amount), currency)}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => setMode('view')} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setMode('edit')} title="Edit expense">
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteButton action={deleteExpense.bind(null, expense.id)} />
          </div>
        </TableCell>
      </TableRow>
    )
  }

  if (mode === 'view') {
    return (
      <TableRow>
        <TableCell colSpan={6}>
          <div className="flex flex-col gap-2 py-2 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Date: </span>
                {formatDate(expense.expense_date)}
              </div>
              <div>
                <span className="text-slate-500">Property: </span>
                {expense.property?.name ?? 'General / office'}
              </div>
              <div>
                <span className="text-slate-500">Category: </span>
                {expense.category}
              </div>
              <div>
                <span className="text-slate-500">Amount: </span>
                {formatMoney(Number(expense.amount), currency)}
              </div>
              <div>
                <span className="text-slate-500">Recorded: </span>
                {formatDate(expense.created_at)}
              </div>
              {expense.receipt_url && (
                <div>
                  <span className="text-slate-500">Receipt: </span>
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    View
                  </a>
                </div>
              )}
            </div>
            {expense.description && (
              <div>
                <span className="text-slate-500">Description: </span>
                {expense.description}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('edit')}>
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('collapsed')}>
                Close
              </Button>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={6}>
        <form action={formAction} className="flex flex-wrap items-end gap-3 py-2">
          <input type="hidden" name="id" value={expense.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`property_${expense.id}`}>Property</Label>
            <Select
              id={`property_${expense.id}`}
              name="property_id"
              defaultValue={expense.property_id ?? ''}
              className="w-40"
            >
              <option value="">General / office expense</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`category_${expense.id}`}>Category</Label>
            <Input
              id={`category_${expense.id}`}
              name="category"
              defaultValue={expense.category}
              required
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`amount_${expense.id}`}>Amount (KES)</Label>
            <Input
              id={`amount_${expense.id}`}
              name="amount"
              type="number"
              step="0.01"
              defaultValue={expense.amount}
              required
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`date_${expense.id}`}>Date</Label>
            <Input
              id={`date_${expense.id}`}
              name="expense_date"
              type="date"
              defaultValue={expense.expense_date}
              className="w-40"
            />
          </div>
          <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <Label htmlFor={`description_${expense.id}`}>Description</Label>
            <Input id={`description_${expense.id}`} name="description" defaultValue={expense.description ?? ''} />
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
