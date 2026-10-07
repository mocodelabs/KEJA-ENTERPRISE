'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createTemplate } from '@/lib/actions/messaging'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'

export function TemplateForm() {
  const [state, formAction] = useActionState(createTemplate, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Template name</Label>
        <Input id="name" name="name" required placeholder="Water bill reminder" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template_type">Type</Label>
        <Select id="template_type" name="template_type" defaultValue="custom">
          <option value="invoice_issued">Invoice issued</option>
          <option value="rent_due">Rent due</option>
          <option value="partial_reminder">Partial payment reminder</option>
          <option value="penalty">Penalty applied</option>
          <option value="notice">General notice</option>
          <option value="receipt">Payment receipt</option>
          <option value="custom">Custom</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body">Message body</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={4}
          placeholder="Hi {{tenant_name}}, ..."
        />
        <p className="text-xs text-slate-400">
          Tokens: {'{{tenant_name}}'} {'{{amount}}'} {'{{balance}}'} {'{{due_date}}'} {'{{property_name}}'}{' '}
          {'{{unit_no}}'} {'{{receipt_no}}'} {'{{period}}'} {'{{message}}'}
        </p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Saving…">Save template</SubmitButton>
    </form>
  )
}
