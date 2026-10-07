'use client'

import { useActionState, useEffect, useRef } from 'react'
import { recordPayment } from '@/lib/actions/payments'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

type InvoiceOption = {
  id: string
  balance: number
  label: string
}

export function PaymentForm({
  invoiceId,
  invoices,
}: {
  invoiceId?: string
  invoices?: InvoiceOption[]
}) {
  const [state, formAction] = useActionState(recordPayment, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      {invoiceId ? (
        <input type="hidden" name="invoice_id" value={invoiceId} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoice_id">Invoice</Label>
          <Select id="invoice_id" name="invoice_id" required defaultValue="" className="w-64">
            <option value="" disabled>
              Select an open invoice
            </option>
            {invoices?.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Amount (KES)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="method">Method</Label>
        <Select id="method" name="method" defaultValue="mpesa" className="w-32">
          <option value="mpesa">M-Pesa</option>
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reference">Reference</Label>
        <Input id="reference" name="reference" placeholder="Transaction code" className="w-40" />
      </div>
      <SubmitButton pendingText="Recording…">Record payment</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-700">{state.message}</p>}
    </form>
  )
}
