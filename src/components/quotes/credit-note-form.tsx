'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createCreditNote } from '@/lib/actions/creditNotes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type InvoiceOption = { id: string; label: string }

export function CreditNoteForm({ invoices }: { invoices: InvoiceOption[] }) {
  const [state, formAction] = useActionState(createCreditNote, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invoice_id">Invoice (optional)</Label>
        <Select id="invoice_id" name="invoice_id" defaultValue="" className="w-64">
          <option value="">Not tied to an invoice</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Amount (KES)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" name="reason" placeholder="Overpayment, correction, etc." className="w-64" />
      </div>
      <SubmitButton pendingText="Creating…">Create credit note</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
