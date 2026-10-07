'use client'

import { useActionState, useState } from 'react'
import { updateTemplate, deleteTemplate } from '@/lib/actions/messaging'
import { TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Pencil } from 'lucide-react'
import type { Tables } from '@/lib/types/database'

export function TemplateRow({ template }: { template: Tables<'message_templates'> }) {
  const [isEditing, setIsEditing] = useState(false)
  const [state, formAction] = useActionState(updateTemplate, null)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <TableRow>
        <TableCell className="font-medium text-slate-900">{template.name}</TableCell>
        <TableCell>
          <Badge>{template.template_type.replace('_', ' ')}</Badge>
        </TableCell>
        <TableCell className="max-w-xs truncate text-slate-500">{template.body}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteButton action={deleteTemplate.bind(null, template.id)} />
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={4}>
        <form action={formAction} className="flex flex-col gap-2 py-2">
          <input type="hidden" name="id" value={template.id} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input name="name" defaultValue={template.name} required placeholder="Template name" />
            <Select name="template_type" defaultValue={template.template_type}>
              <option value="invoice_issued">Invoice issued</option>
              <option value="rent_due">Rent due</option>
              <option value="partial_reminder">Partial payment reminder</option>
              <option value="penalty">Penalty applied</option>
              <option value="notice">General notice</option>
              <option value="receipt">Payment receipt</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <Textarea name="body" defaultValue={template.body} required rows={3} />
          <p className="text-xs text-slate-400">
            Tokens: {'{{tenant_name}}'} {'{{amount}}'} {'{{balance}}'} {'{{due_date}}'} {'{{property_name}}'}{' '}
            {'{{unit_no}}'} {'{{receipt_no}}'} {'{{period}}'} {'{{message}}'}
          </p>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <SubmitButton pendingText="Saving…" size="sm">
              Save
            </SubmitButton>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </TableCell>
    </TableRow>
  )
}
