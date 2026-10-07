'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createProperty } from '@/lib/actions/properties'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Plus, X } from 'lucide-react'
import { isPropertyManager } from '@/lib/orgAccess'
import type { Enums, Tables } from '@/lib/types/database'

type BlockRow = { key: number; name: string; floors: string }

let nextKey = 0

export function PropertyForm({ clients, orgType }: { clients: Tables<'clients'>[]; orgType: Enums<'org_type'> }) {
  const isPM = isPropertyManager(orgType)
  const [state, formAction] = useActionState(createProperty, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [blocks, setBlocks] = useState<BlockRow[]>(() => [{ key: nextKey++, name: 'Block A', floors: '1' }])
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setBlocks([{ key: nextKey++, name: 'Block A', floors: '1' }])
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  function addBlock() {
    const letter = String.fromCharCode(65 + blocks.length)
    setBlocks((rows) => [...rows, { key: nextKey++, name: `Block ${letter}`, floors: '1' }])
  }

  function updateBlock(key: number, field: 'name' | 'floors', value: string) {
    setBlocks((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  function removeBlock(key: number) {
    setBlocks((rows) => rows.filter((r) => r.key !== key))
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Property name</Label>
        <Input id="name" name="name" required placeholder="Riverside Apartments" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_type">Type</Label>
        <Select id="property_type" name="property_type" defaultValue="residential">
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="mixed_use">Mixed use</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Ngong Road" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" placeholder="Nairobi" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Blocks &amp; floors</Label>
          <button
            type="button"
            onClick={addBlock}
            className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
          >
            <Plus className="h-3 w-3" /> Add block
          </button>
        </div>
        {blocks.length === 0 ? (
          <p className="text-xs text-slate-400">
            No blocks defined — the property will be treated as a single block.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {blocks.map((b) => (
              <div key={b.key} className="flex items-center gap-2">
                <Input
                  name="block_name"
                  value={b.name}
                  onChange={(e) => updateBlock(b.key, 'name', e.target.value)}
                  placeholder="Block name"
                  className="flex-1"
                  required
                />
                <Input
                  name="block_floor_count"
                  type="number"
                  min={1}
                  step={1}
                  value={b.floors}
                  onChange={(e) => updateBlock(b.key, 'floors', e.target.value)}
                  placeholder="Floors"
                  className="w-24"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBlock(b.key)}
                  aria-label={`Remove ${b.name}`}
                >
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPM && clients.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client_id">Owner client (optional)</Label>
          <Select id="client_id" name="client_id" defaultValue="">
            <option value="">This org owns it directly</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {isPM && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commission_rate">Commission override (%)</Label>
          <Input
            id="commission_rate"
            name="commission_rate"
            type="number"
            step="0.01"
            min={0}
            max={100}
            placeholder="Leave blank for org default"
          />
        </div>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Adding…">Add property</SubmitButton>
    </form>
  )
}
