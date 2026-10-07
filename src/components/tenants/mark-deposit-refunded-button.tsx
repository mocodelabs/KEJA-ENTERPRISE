'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { markDepositRefunded } from '@/lib/actions/leases'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export function MarkDepositRefundedButton({ terminationId }: { terminationId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm('Mark this deposit as refunded/settled? This posts the final ledger entry and cannot be undone.'))
          return
        startTransition(async () => {
          const result = await markDepositRefunded(terminationId)
          if (result?.error) toast.error(result.error)
        })
      }}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      Mark deposit refunded
    </Button>
  )
}
