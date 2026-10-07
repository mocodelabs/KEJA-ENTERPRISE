'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createEmployee } from '@/lib/actions/hr'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function EmployeeForm() {
  const [state, formAction] = useActionState(createEmployee, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job_title">Job title</Label>
        <Input id="job_title" name="job_title" placeholder="Caretaker, Accountant…" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="salary">Monthly salary (KES)</Label>
        <Input id="salary" name="salary" type="number" step="0.01" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hire_date">Hire date</Label>
        <Input id="hire_date" name="hire_date" type="date" />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="contract">Employment contract (optional)</Label>
        <Input id="contract" name="contract" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
        <p className="text-xs text-slate-400">PDF, Word, or image — up to 10MB.</p>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
        <SubmitButton pendingText="Adding…">Add employee</SubmitButton>
      </div>
    </form>
  )
}
