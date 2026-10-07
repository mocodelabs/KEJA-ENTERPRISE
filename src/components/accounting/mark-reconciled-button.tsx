'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { markReconciled } from '@/lib/actions/accounting'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export function MarkReconciledButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await markReconciled(id)
          if (result?.error) toast.error(result.error)
        })
      }
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      Mark reconciled
    </Button>
  )
}
