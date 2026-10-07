'use client'

import { useActionState, useState } from 'react'
import { recordOwnerPayout } from '@/lib/actions/ledger'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'

export function OwnerPayoutForm({
  propertyId,
  suggestedAmount,
  isPM,
  onDone,
}: {
  propertyId: string
  suggestedAmount: number
  isPM: boolean
  onDone: () => void
}) {
  const [state, formAction] = useActionState(recordOwnerPayout, null)
  const [lastHandledMessage, setLastHandledMessage] = useState<string | undefined>(undefined)

  if (state?.message && state.message !== lastHandledMessage) {
    setLastHandledMessage(state.message)
    onDone()
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-3">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`payout_amount_${propertyId}`}>Amount</Label>
        <Input
          id={`payout_amount_${propertyId}`}
          name="amount"
          type="number"
          step="0.01"
          defaultValue={suggestedAmount > 0 ? suggestedAmount.toFixed(2) : ''}
          required
          className="w-36"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`payout_date_${propertyId}`}>Date</Label>
        <Input
          id={`payout_date_${propertyId}`}
          name="payout_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-40"
        />
      </div>
      <div className="flex min-w-[160px] flex-1 flex-col gap-1.5">
        <Label htmlFor={`payout_memo_${propertyId}`}>Memo</Label>
        <Input id={`payout_memo_${propertyId}`} name="memo" placeholder="M-Pesa, bank transfer…" />
      </div>
      <div className="flex gap-2">
        <SubmitButton pendingText="Recording…" size="sm">
          {isPM ? 'Record payout' : 'Record withdrawal'}
        </SubmitButton>
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
