'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { createUnit } from '@/lib/actions/units'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import { UNIT_TYPE_OPTIONS, UNIT_TYPE_BEDROOMS } from '@/lib/unitTypes'
import type { Enums } from '@/lib/types/database'

type Block = { id: string; name: string; floor_count: number }

export function UnitForm({ propertyId, blocks }: { propertyId: string; blocks: Block[] }) {
  const [state, formAction] = useActionState(createUnit, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [unitType, setUnitType] = useState<Enums<'unit_type'>>('single_room')
  const [bedrooms, setBedrooms] = useState<number | null>(UNIT_TYPE_BEDROOMS.single_room)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    setUnitType('single_room')
    setBedrooms(UNIT_TYPE_BEDROOMS.single_room)
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  const blockId = selectedBlockId && blocks.some((b) => b.id === selectedBlockId) ? selectedBlockId : blocks[0]?.id ?? ''
  const selectedBlock = blocks.find((b) => b.id === blockId)
  const floorOptions = useMemo(
    () => (selectedBlock ? Array.from({ length: selectedBlock.floor_count }, (_, i) => i + 1) : []),
    [selectedBlock]
  )

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit_no">Unit no.</Label>
        <Input id="unit_no" name="unit_no" required placeholder="A1" className="w-24" />
      </div>
      {blocks.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block_id">Block</Label>
            <Select
              id="block_id"
              name="block_id"
              value={blockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="w-32"
            >
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="floor">Floor</Label>
            <Select id="floor" name="floor" defaultValue="1" className="w-24" key={blockId}>
              {floorOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit_type">Type</Label>
        <Select
          id="unit_type"
          name="unit_type"
          value={unitType}
          onChange={(e) => {
            const value = e.target.value as Enums<'unit_type'>
            setUnitType(value)
            setBedrooms(UNIT_TYPE_BEDROOMS[value])
          }}
          className="w-36"
        >
          {UNIT_TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bedrooms">Bedrooms</Label>
        <Input
          id="bedrooms"
          name="bedrooms"
          type="number"
          min={0}
          className="w-20"
          value={bedrooms ?? ''}
          onChange={(e) => setBedrooms(e.target.value === '' ? null : Number(e.target.value))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rent_amount">Rent (KES)</Label>
        <Input id="rent_amount" name="rent_amount" type="number" step="0.01" required className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue="vacant" className="w-32">
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </Select>
      </div>
      <SubmitButton pendingText="Adding…">Add unit</SubmitButton>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
