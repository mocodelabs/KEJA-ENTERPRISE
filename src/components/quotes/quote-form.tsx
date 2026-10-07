'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createQuote } from '@/lib/actions/quotes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Plus, X } from 'lucide-react'

type Option = { id: string; label: string }

const NEW_PROSPECT = '__new__'

export function QuoteForm({ clients, properties }: { clients: Option[]; properties: Option[] }) {
  const [state, formAction] = useActionState(createQuote, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [items, setItems] = useState([{ description: '', amount: '' }])
  const [clientSelection, setClientSelection] = useState('')
  const [propertySelection, setPropertySelection] = useState('')
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setItems([{ description: '', amount: '' }])
    setClientSelection('')
    setPropertySelection('')
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        const hidden = (e.currentTarget.elements.namedItem('items_json') as HTMLInputElement)
        hidden.value = JSON.stringify(items.map((i) => ({ description: i.description, amount: Number(i.amount) || 0 })))
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="items_json" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client_id">Client</Label>
          <Select
            id="client_id"
            name="client_id"
            value={clientSelection}
            onChange={(e) => setClientSelection(e.target.value)}
          >
            <option value="">None</option>
            <option value={NEW_PROSPECT}>+ Prospective client (not in system yet)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          {clientSelection === NEW_PROSPECT && (
            <Input name="client_name" placeholder="Client name" className="mt-1" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="property_id">Property</Label>
          <Select
            id="property_id"
            name="property_id"
            value={propertySelection}
            onChange={(e) => setPropertySelection(e.target.value)}
          >
            <option value="">None</option>
            <option value={NEW_PROSPECT}>+ Prospective property (not in system yet)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          {propertySelection === NEW_PROSPECT && (
            <Input name="property_label" placeholder="Property name / address" className="mt-1" />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="valid_until">Valid until</Label>
        <Input id="valid_until" name="valid_until" type="date" className="w-48" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Line items</Label>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              placeholder="Description"
              value={item.description}
              onChange={(e) =>
                setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))
              }
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={item.amount}
              onChange={(e) =>
                setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, amount: e.target.value } : it)))
              }
              className="w-32"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              disabled={items.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setItems((prev) => [...prev, { description: '', amount: '' }])}
        >
          <Plus className="h-4 w-4" /> Add line
        </Button>
      </div>

      <p className="text-sm font-medium text-slate-700">Total: KES {total.toFixed(2)}</p>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Creating…" className="w-fit">
        Create quote
      </SubmitButton>
    </form>
  )
}
