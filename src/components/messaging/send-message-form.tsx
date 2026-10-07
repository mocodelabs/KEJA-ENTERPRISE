'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { sendToTenants } from '@/lib/actions/messaging'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import { X } from 'lucide-react'

type Tenant = { id: string; full_name: string; phone: string }
type Template = { id: string; name: string; body: string }
type PropertyOption = { id: string; name: string }
type BlockOption = { id: string; property_id: string; name: string }

export function SendMessageForm({
  tenants,
  templates,
  properties,
  blocks,
}: {
  tenants: Tenant[]
  templates: Template[]
  properties: PropertyOption[]
  blocks: BlockOption[]
}) {
  const [state, formAction] = useActionState(sendToTenants, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [recipientMode, setRecipientMode] = useState<'individual' | 'property'>('individual')
  const [selected, setSelected] = useState<Tenant[]>([])
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [propertyId, setPropertyId] = useState('')
  const [blockId, setBlockId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms')
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setSelected([])
    setQuery('')
    setPropertyId('')
    setBlockId('')
    setTemplateId('')
    setMessageBody('')
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  const blocksForProperty = blocks.filter((b) => b.property_id === propertyId)
  const selectedIds = useMemo(() => new Set(selected.map((t) => t.id)), [selected])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = tenants.filter((t) => !selectedIds.has(t.id))
    const matches = q ? pool.filter((t) => t.full_name.toLowerCase().includes(q) || t.phone.includes(q)) : pool
    return matches.slice(0, 6)
  }, [tenants, selectedIds, query])

  const selectedTemplate = templates.find((t) => t.id === templateId)
  const allSelected = tenants.length > 0 && selected.length === tenants.length

  function addTenant(t: Tenant) {
    setSelected((prev) => [...prev, t])
    setQuery('')
  }

  function removeTenant(id: string) {
    setSelected((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="recipient_mode" value={recipientMode} />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Recipients</Label>
          <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setRecipientMode('individual')}
              className={`px-3 py-1 ${recipientMode === 'individual' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setRecipientMode('property')}
              className={`px-3 py-1 ${recipientMode === 'property' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Property / Block
            </button>
          </div>
        </div>

        {recipientMode === 'property' ? (
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="property_id">Property</Label>
              <Select
                id="property_id"
                name="property_id"
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value)
                  setBlockId('')
                }}
              >
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="block_id">Block (optional)</Label>
              <Select
                id="block_id"
                name="block_id"
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                disabled={!propertyId || blocksForProperty.length === 0}
              >
                <option value="">
                  {propertyId && blocksForProperty.length === 0 ? 'No blocks — whole property' : 'All blocks'}
                </option>
                {blocksForProperty.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="w-full text-xs text-slate-400">
              Sends to every tenant with an active lease in that {blockId ? 'block' : 'property'}.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-emerald-700 hover:underline"
                onClick={() => setSelected(allSelected ? [] : tenants)}
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>

            {selected.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selected.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"
                  >
                    {t.full_name}
                    <button
                      type="button"
                      onClick={() => removeTenant(t.id)}
                      className="rounded-full hover:bg-emerald-100"
                      aria-label={`Remove ${t.full_name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <input type="hidden" name="tenant_ids" value={t.id} />
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                id="recipient_search"
                placeholder="Search by name or phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-md">
                  {suggestions.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addTenant(t)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span>{t.full_name}</span>
                      <span className="text-slate-400">{t.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {showSuggestions && suggestions.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-400 shadow-md">
                  {tenants.length === 0 ? 'No tenants yet.' : 'No matches.'}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="channel">Send via</Label>
        <Select
          id="channel"
          name="channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'sms' | 'whatsapp')}
          className="w-40"
        >
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template_id">Template (optional)</Label>
        <Select
          id="template_id"
          name="template_id"
          value={templateId}
          onChange={(e) => {
            const id = e.target.value
            setTemplateId(id)
            const template = templates.find((t) => t.id === id)
            if (template) setMessageBody(template.body)
          }}
        >
          <option value="">No template — write your own message</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message_body">Message</Label>
        <Textarea
          id="message_body"
          name="message_body"
          rows={4}
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          placeholder="Type your message…"
        />
        {selectedTemplate && (
          <p className="text-xs text-slate-400">Loaded from &quot;{selectedTemplate.name}&quot; — edit freely before sending.</p>
        )}
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Sending…" className="w-fit">
        Send message
      </SubmitButton>
    </form>
  )
}
