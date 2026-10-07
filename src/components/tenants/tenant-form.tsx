'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { createTenant } from '@/lib/actions/tenants'
import { useUnitCascade, NO_BLOCK, NO_FLOOR, type CascadeUnit } from '@/hooks/useUnitCascade'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import { UNIT_TYPE_LABELS } from '@/lib/unitTypes'
import type { Enums } from '@/lib/types/database'

type UnitOption = CascadeUnit & {
  unit_no: string
  unit_type: Enums<'unit_type'>
  rent_amount: number
}

export function TenantForm({ units }: { units: UnitOption[] }) {
  const [state, formAction] = useActionState(createTenant, null)
  const formRef = useRef<HTMLFormElement>(null)
  const cascade = useUnitCascade(units)
  const [rentAmount, setRentAmount] = useState('')
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    cascade.reset()
    setRentAmount('')
  }

  useEffect(() => {
    if (state?.message) formRef.current?.reset()
  }, [state])

  if (units.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No vacant units available — add a property and unit first. Every tenant must be pegged to a lease.
      </p>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required placeholder="Grace Njeri" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" required placeholder="0722 123 456" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="id_number">ID number</Label>
        <Input id="id_number" name="id_number" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="emergency_contact">Emergency contact</Label>
        <Input id="emergency_contact" name="emergency_contact" placeholder="Name & phone" />
      </div>

      <div className="mt-1 border-t border-slate-200 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Lease (required — every tenant is pegged to a lease)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="property_select">Apartment / Property</Label>
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
            <Label htmlFor="unit_id">Vacant unit</Label>
            <Select
              id="unit_id"
              name="unit_id"
              required
              value={cascade.unitId}
              disabled={cascade.unitsToPickFrom.length === 0}
              onChange={(e) => {
                cascade.setUnitId(e.target.value)
                const unit = units.find((u) => u.id === e.target.value)
                setRentAmount(unit ? String(unit.rent_amount) : '')
              }}
            >
              <option value="" disabled>
                {!cascade.propertyId
                  ? 'Select a property first'
                  : cascade.unitsToPickFrom.length === 0
                    ? 'No vacant units here'
                    : 'Select a unit'}
              </option>
              {cascade.unitsToPickFrom.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_no} ({UNIT_TYPE_LABELS[u.unit_type]})
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="start_date">Start date</Label>
            <Input id="start_date" name="start_date" type="date" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rent_amount">Monthly rent (KES)</Label>
            <Input
              id="rent_amount"
              name="rent_amount"
              type="number"
              step="0.01"
              required
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit_amount">Deposit (KES)</Label>
            <Input id="deposit_amount" name="deposit_amount" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing_day">Rent due day</Label>
            <Input id="billing_day" name="billing_day" type="number" min={1} max={28} defaultValue={1} />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="contract">Lease contract (optional)</Label>
          <Input id="contract" name="contract" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
          <p className="text-xs text-slate-400">PDF, Word, or image — up to 10MB.</p>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton pendingText="Adding…">Add tenant</SubmitButton>
    </form>
  )
}
