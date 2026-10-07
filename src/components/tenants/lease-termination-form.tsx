'use client'

import { useActionState, useState } from 'react'
import { recordLeaseTermination } from '@/lib/actions/leases'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { formatMoney } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

type LineItem = { key: number; label: string; cost: string }

let nextKey = 0

function ItemEditor({
  title,
  items,
  onAdd,
  onUpdate,
  onRemove,
  labelPlaceholder,
  labelName,
  costName,
}: {
  title: string
  items: LineItem[]
  onAdd: () => void
  onUpdate: (key: number, field: 'label' | 'cost', value: string) => void
  onRemove: (key: number) => void
  labelPlaceholder: string
  labelName: string
  costName: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">None recorded.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <Input
                name={labelName}
                value={item.label}
                onChange={(e) => onUpdate(item.key, 'label', e.target.value)}
                placeholder={labelPlaceholder}
                className="flex-1"
              />
              <Input
                name={costName}
                type="number"
                step="0.01"
                min={0}
                value={item.cost}
                onChange={(e) => onUpdate(item.key, 'cost', e.target.value)}
                placeholder="Cost"
                className="w-28"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(item.key)}>
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LeaseTerminationForm({
  leaseId,
  depositAmount,
  currency,
}: {
  leaseId: string
  depositAmount: number
  currency: string
}) {
  const [state, formAction] = useActionState(recordLeaseTermination, null)
  const [arrears, setArrears] = useState('0')
  const [waterDeduction, setWaterDeduction] = useState('0')
  const [electricityDeduction, setElectricityDeduction] = useState('0')
  const [maintenanceItems, setMaintenanceItems] = useState<LineItem[]>([])
  const [otherItems, setOtherItems] = useState<LineItem[]>([])

  function addMaintenance() {
    setMaintenanceItems((rows) => [...rows, { key: nextKey++, label: '', cost: '0' }])
  }
  function addOther() {
    setOtherItems((rows) => [...rows, { key: nextKey++, label: '', cost: '0' }])
  }

  const itemsTotal = [...maintenanceItems, ...otherItems].reduce((sum, i) => sum + (Number(i.cost) || 0), 0)
  const totalDeductions = (Number(arrears) || 0) + (Number(waterDeduction) || 0) + (Number(electricityDeduction) || 0) + itemsTotal
  const refundAmount = depositAmount - totalDeductions

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="lease_id" value={leaseId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="termination_date">Termination date</Label>
        <Input
          id="termination_date"
          name="termination_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-48"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="arrears">Arrears (KES)</Label>
          <Input
            id="arrears"
            name="arrears"
            type="number"
            step="0.01"
            min={0}
            value={arrears}
            onChange={(e) => setArrears(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="water_deduction">Water deposit deduction (KES)</Label>
          <Input
            id="water_deduction"
            name="water_deduction"
            type="number"
            step="0.01"
            min={0}
            value={waterDeduction}
            onChange={(e) => setWaterDeduction(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="electricity_deduction">Electricity deposit deduction (KES)</Label>
          <Input
            id="electricity_deduction"
            name="electricity_deduction"
            type="number"
            step="0.01"
            min={0}
            value={electricityDeduction}
            onChange={(e) => setElectricityDeduction(e.target.value)}
          />
        </div>
      </div>

      <ItemEditor
        title="Maintenance / damage items"
        items={maintenanceItems}
        onAdd={addMaintenance}
        onUpdate={(key, field, value) =>
          setMaintenanceItems((rows) => rows.map((r) => (r.key === key ? { ...r, [field === 'label' ? 'label' : 'cost']: value } : r)))
        }
        onRemove={(key) => setMaintenanceItems((rows) => rows.filter((r) => r.key !== key))}
        labelPlaceholder="e.g. Broken window"
        labelName="maintenance_type"
        costName="maintenance_cost"
      />

      <ItemEditor
        title="Other deductions"
        items={otherItems}
        onAdd={addOther}
        onUpdate={(key, field, value) =>
          setOtherItems((rows) => rows.map((r) => (r.key === key ? { ...r, [field === 'label' ? 'label' : 'cost']: value } : r)))
        }
        onRemove={(key) => setOtherItems((rows) => rows.filter((r) => r.key !== key))}
        labelPlaceholder="e.g. Unreturned keys"
        labelName="other_description"
        costName="other_cost"
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Any additional context for the report" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Deposit held</span>
          <span>{formatMoney(depositAmount, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Total deductions</span>
          <span>{formatMoney(totalDeductions, currency)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold">
          <span>{refundAmount >= 0 ? 'Refund due to tenant' : 'Balance owed by tenant'}</span>
          <span className={refundAmount >= 0 ? 'text-emerald-700' : 'text-red-600'}>
            {formatMoney(Math.abs(refundAmount), currency)}
          </span>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Terminating…" className="w-fit">
        Terminate lease &amp; generate report
      </SubmitButton>
    </form>
  )
}
