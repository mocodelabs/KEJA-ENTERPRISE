'use client'

import { useActionState, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateEmployee, terminateEmployee, reinstateEmployee, deleteEmployee } from '@/lib/actions/hr'
import { TableRow, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubmitButton } from '@/components/ui/submit-button'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Eye, Pencil, UserX, UserCheck } from 'lucide-react'
import { formatMoney, formatDate } from '@/lib/utils'
import type { Tables } from '@/lib/types/database'

type Mode = 'collapsed' | 'view' | 'edit' | 'terminate'

export function EmployeeRow({
  employee,
  contractUrl,
  currency,
}: {
  employee: Tables<'employees'>
  contractUrl?: string
  currency: string
}) {
  const [mode, setMode] = useState<Mode>('collapsed')
  const [updateState, updateAction] = useActionState(updateEmployee, null)
  const [lastUpdateMessage, setLastUpdateMessage] = useState<string | undefined>(undefined)
  const [terminateState, terminateAction] = useActionState(terminateEmployee, null)
  const [lastTerminateMessage, setLastTerminateMessage] = useState<string | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  if (updateState?.message && updateState.message !== lastUpdateMessage) {
    setLastUpdateMessage(updateState.message)
    setMode('collapsed')
  }
  if (terminateState?.message && terminateState.message !== lastTerminateMessage) {
    setLastTerminateMessage(terminateState.message)
    setMode('collapsed')
  }

  const statusVariant = employee.status === 'active' ? 'success' : employee.status === 'terminated' ? 'danger' : 'default'

  if (mode === 'collapsed') {
    return (
      <TableRow>
        <TableCell className="font-medium text-slate-900">{employee.full_name}</TableCell>
        <TableCell>{employee.job_title ?? '—'}</TableCell>
        <TableCell>{formatMoney(Number(employee.salary), currency)}</TableCell>
        <TableCell>
          <Badge variant={statusVariant} className="capitalize">
            {employee.status}
          </Badge>
        </TableCell>
        <TableCell>
          {contractUrl ? (
            <a href={contractUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
              View
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => setMode('view')} title="View details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setMode('edit')} title="Edit employee">
              <Pencil className="h-4 w-4" />
            </Button>
            {employee.status === 'terminated' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Reinstate employee"
                disabled={isPending}
                onClick={() => {
                  if (!confirm('Reinstate this employee as active?')) return
                  startTransition(async () => {
                    const result = await reinstateEmployee(employee.id)
                    if (result?.error) toast.error(result.error)
                  })
                }}
              >
                <UserCheck className="h-4 w-4 text-emerald-600" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Terminate contract"
                onClick={() => setMode('terminate')}
              >
                <UserX className="h-4 w-4 text-amber-600" />
              </Button>
            )}
            <DeleteButton
              action={deleteEmployee.bind(null, employee.id)}
              confirmText="Delete this employee record? This cannot be undone."
            />
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
                <span className="text-slate-500">Job title: </span>
                {employee.job_title ?? '—'}
              </div>
              <div>
                <span className="text-slate-500">Salary: </span>
                {formatMoney(Number(employee.salary), currency)}
              </div>
              <div>
                <span className="text-slate-500">Status: </span>
                <span className="capitalize">{employee.status}</span>
              </div>
              <div>
                <span className="text-slate-500">Phone: </span>
                {employee.phone ?? '—'}
              </div>
              <div>
                <span className="text-slate-500">Email: </span>
                {employee.email ?? '—'}
              </div>
              <div>
                <span className="text-slate-500">Hire date: </span>
                {employee.hire_date ? formatDate(employee.hire_date) : '—'}
              </div>
              {contractUrl && (
                <div>
                  <span className="text-slate-500">Contract: </span>
                  <a href={contractUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                    View
                  </a>
                </div>
              )}
              {employee.status === 'terminated' && (
                <>
                  <div>
                    <span className="text-slate-500">Terminated on: </span>
                    {employee.termination_date ? formatDate(employee.termination_date) : '—'}
                  </div>
                  {employee.termination_reason && (
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-slate-500">Reason: </span>
                      {employee.termination_reason}
                    </div>
                  )}
                </>
              )}
            </div>
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

  if (mode === 'terminate') {
    return (
      <TableRow>
        <TableCell colSpan={6}>
          <form action={terminateAction} className="flex flex-wrap items-end gap-3 py-2">
            <input type="hidden" name="id" value={employee.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`term_date_${employee.id}`}>Termination date</Label>
              <Input
                id={`term_date_${employee.id}`}
                name="termination_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-40"
              />
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
              <Label htmlFor={`term_reason_${employee.id}`}>Reason (optional)</Label>
              <Input id={`term_reason_${employee.id}`} name="termination_reason" placeholder="Resignation, redundancy…" />
            </div>
            <div className="flex gap-2">
              <SubmitButton pendingText="Terminating…" size="sm" variant="destructive">
                Confirm termination
              </SubmitButton>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('collapsed')}>
                Cancel
              </Button>
            </div>
            {terminateState?.error && <p className="w-full text-sm text-red-600">{terminateState.error}</p>}
          </form>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={6}>
        <form action={updateAction} className="flex flex-wrap items-end gap-3 py-2">
          <input type="hidden" name="id" value={employee.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name_${employee.id}`}>Full name</Label>
            <Input id={`name_${employee.id}`} name="full_name" defaultValue={employee.full_name} required className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`title_${employee.id}`}>Job title</Label>
            <Input id={`title_${employee.id}`} name="job_title" defaultValue={employee.job_title ?? ''} className="w-36" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`salary_${employee.id}`}>Salary (KES)</Label>
            <Input
              id={`salary_${employee.id}`}
              name="salary"
              type="number"
              step="0.01"
              defaultValue={employee.salary}
              required
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`phone_${employee.id}`}>Phone</Label>
            <Input id={`phone_${employee.id}`} name="phone" defaultValue={employee.phone ?? ''} className="w-32" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`email_${employee.id}`}>Email</Label>
            <Input id={`email_${employee.id}`} name="email" type="email" defaultValue={employee.email ?? ''} className="w-44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`hire_${employee.id}`}>Hire date</Label>
            <Input
              id={`hire_${employee.id}`}
              name="hire_date"
              type="date"
              defaultValue={employee.hire_date ?? ''}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`contract_${employee.id}`}>Replace contract (optional)</Label>
            <Input id={`contract_${employee.id}`} name="contract" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="w-52" />
          </div>
          <div className="flex gap-2">
            <SubmitButton pendingText="Saving…" size="sm">
              Save
            </SubmitButton>
            <Button type="button" variant="outline" size="sm" onClick={() => setMode('collapsed')}>
              Cancel
            </Button>
          </div>
          {updateState?.error && <p className="w-full text-sm text-red-600">{updateState.error}</p>}
        </form>
      </TableCell>
    </TableRow>
  )
}
