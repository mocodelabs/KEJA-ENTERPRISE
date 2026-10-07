'use client'

import { useTransition } from 'react'
import { updateQuoteStatus } from '@/lib/actions/quotes'
import type { Enums } from '@/lib/types/database'

const STATUS_STYLES: Record<Enums<'quote_status'>, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-sky-100 text-sky-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
}

export function QuoteStatusSelect({ quoteId, status }: { quoteId: string; status: Enums<'quote_status'> }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => {
          updateQuoteStatus(quoteId, e.target.value as Enums<'quote_status'>)
        })
      }
      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      <option value="draft">Draft</option>
      <option value="sent">Sent</option>
      <option value="accepted">Accepted</option>
      <option value="declined">Declined</option>
      <option value="expired">Expired</option>
    </select>
  )
}
