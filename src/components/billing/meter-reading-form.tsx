'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addMeterReading } from '@/lib/actions/billing'
import { useUnitCascade, NO_BLOCK, NO_FLOOR, type CascadeUnit } from '@/hooks/useUnitCascade'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import type { Enums } from '@/lib/types/database'

type UnitOption = CascadeUnit & { unit_no: string }

const METER_TYPE_OPTIONS: { value: Enums<'meter_type'>; label: string }[] = [
  { value: 'water', label: 'Water' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'gas', label: 'Gas' },
  { value: 'garbage', label: 'Garbage' },
]

export function MeterReadingForm({ units }: { units: UnitOption[] }) {
  const [state, formAction] = useActionState(addMeterReading, null)
  const formRef = useRef<HTMLFormElement>(null)
  const cascade = useUnitCascade(units)
  const [meterType, setMeterType] = useState<Enums<'meter_type'>>('water')
  const [amount, setAmount] = useState('')
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    cascade.reset()
    setMeterType('water')
    setAmount('')
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  const isFlatFee = meterType === 'garbage'

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_select">Property</Label>
        <Select id="property_select" value={cascade.propertyId} onChange={(e) => cascade.setPropertyId(e.target.value)}>
          <option value="" disabled>
            Select a property
          </option>
          {cascade.properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {cascade.showBlockSelect && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="block_select">Block</Label>
          <Select
            id="block_select"
            value={cascade.blockKey}
            disabled={!cascade.propertyId}
            onChange={(e) => cascade.setBlockKey(e.target.value)}
          >
            <option value="" disabled>
              Select a block
            </option>
            {cascade.blocksForProperty.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            {cascade.hasUnassignedUnits && <option value={NO_BLOCK}>No block</option>}
          </Select>
        </div>
      )}

      {cascade.showFloorSelect && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="floor_select">Floor</Label>
          <Select id="floor_select" value={cascade.floorKey} onChange={(e) => cascade.setFloorKey(e.target.value)}>
            <option value="" disabled>
              Select a floor
            </option>
            {cascade.floorsForBlock.map((f) => (
              <option key={f} value={f}>
                Floor {f}
              </option>
            ))}
            {cascade.hasNoFloorUnits && <option value={NO_FLOOR}>No floor recorded</option>}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="unit_id">Unit</Label>
        <Select
          id="unit_id"
          name="unit_id"
          required
          value={cascade.unitId}
          disabled={cascade.unitsToPickFrom.length === 0}
          onChange={(e) => cascade.setUnitId(e.target.value)}
        >
          <option value="" disabled>
            {!cascade.propertyId
              ? 'Select a property first'
              : cascade.unitsToPickFrom.length === 0
                ? 'No units here'
                : 'Select a unit'}
          </option>
          {cascade.unitsToPickFrom.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unit_no}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="meter_type">Type</Label>
        <Select
          id="meter_type"
          name="meter_type"
          value={meterType}
          onChange={(e) => setMeterType(e.target.value as Enums<'meter_type'>)}
        >
          {METER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reading_date">{isFlatFee ? 'Collection date' : 'Reading date'}</Label>
        <Input id="reading_date" name="reading_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      {isFlatFee ? (
        <>
          <input type="hidden" name="previous_reading" value="0" />
          <input type="hidden" name="rate_per_unit" value="1" />
          <input type="hidden" name="current_reading" value={amount} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garbage_amount">Amount (KES)</Label>
            <Input
              id="garbage_amount"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="previous_reading">Previous reading</Label>
            <Input id="previous_reading" name="previous_reading" type="number" step="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="current_reading">Current reading</Label>
            <Input id="current_reading" name="current_reading" type="number" step="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rate_per_unit">Rate per unit (KES)</Label>
            <Input id="rate_per_unit" name="rate_per_unit" type="number" step="0.01" required />
          </div>
        </>
      )}

      <div className="sm:col-span-2 lg:col-span-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
        <SubmitButton pendingText="Saving…">Record {isFlatFee ? 'fee' : 'reading'}</SubmitButton>
      </div>
    </form>
  )
}
