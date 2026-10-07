'use client'

import { useState } from 'react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { OwnerPayoutForm } from '@/components/accounting/owner-payout-form'
import { formatMoney } from '@/lib/utils'

type PropertyBreakdown = {
  id: string
  name: string
  balanceDue: number
  collections: number
  expenses: number
  commission: number
  payouts: number
}

export function PropertyBreakdownRow({
  row,
  currency,
  isPM,
}: {
  row: PropertyBreakdown
  currency: string
  isPM: boolean
}) {
  const [showPayout, setShowPayout] = useState(false)
  const colSpan = isPM ? 7 : 6

  return (
    <>
      <TableRow>
        <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
        <TableCell>{formatMoney(row.collections, currency)}</TableCell>
        <TableCell>{formatMoney(row.expenses, currency)}</TableCell>
        {isPM && <TableCell>{formatMoney(row.commission, currency)}</TableCell>}
        <TableCell>{formatMoney(row.payouts, currency)}</TableCell>
        <TableCell className="font-medium">{formatMoney(row.balanceDue, currency)}</TableCell>
        <TableCell className="text-right">
          {row.balanceDue > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPayout((v) => !v)}>
              {showPayout ? 'Close' : isPM ? 'Pay owner' : 'Withdraw'}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {showPayout && (
        <TableRow>
          <TableCell colSpan={colSpan}>
            <OwnerPayoutForm
              propertyId={row.id}
              suggestedAmount={row.balanceDue}
              isPM={isPM}
              onDone={() => setShowPayout(false)}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
