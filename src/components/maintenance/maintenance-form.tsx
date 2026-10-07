'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addMaintenanceRecord } from '@/lib/actions/maintenance'
import { useUnitCascade, NO_BLOCK, NO_FLOOR, type CascadeUnit } from '@/hooks/useUnitCascade'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import { MAINTENANCE_ISSUE_OPTIONS } from '@/lib/maintenanceTypes'

type UnitOption = CascadeUnit & { unit_no: string }

export function MaintenanceForm({ units }: { units: UnitOption[] }) {
  const [state, formAction] = useActionState(addMaintenanceRecord, null)
  const formRef = useRef<HTMLFormElement>(null)
  const cascade = useUnitCascade(units)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    cascade.reset()
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

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
        <Label htmlFor="issue_type">Issue type</Label>
        <Select id="issue_type" name="issue_type" defaultValue="other">
          {MAINTENANCE_ISSUE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reported_date">Reported date</Label>
        <Input id="reported_date" name="reported_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cost">Cost (KES)</Label>
        <Input id="cost" name="cost" type="number" step="0.01" min={0} defaultValue={0} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billed_to">Bill this to</Label>
        <Select id="billed_to" name="billed_to" defaultValue="landlord">
          <option value="landlord">Landlord (property expense)</option>
          <option value="tenant">Tenant (next invoice)</option>
          <option value="expense">Expense (general company cost)</option>
        </Select>
      </div>

      <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required rows={2} placeholder="What happened / what was fixed" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <div className="sm:col-span-2 lg:col-span-3">
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
        <SubmitButton pendingText="Saving…">Add record</SubmitButton>
      </div>
    </form>
  )
}
