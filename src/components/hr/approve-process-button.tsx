'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { approveAndProcessPayrollRun } from '@/lib/actions/hr'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export function ApproveProcessButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await approveAndProcessPayrollRun(id)
          if (result?.error) toast.error(result.error)
          else toast.success('Payroll approved and processed.')
        })
      }
    >
      <CheckCircle2 className="h-4 w-4" />
      {isPending ? 'Processing…' : 'Approve & process'}
    </Button>
  )
}
