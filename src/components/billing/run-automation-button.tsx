'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { runAutomationNow } from '@/lib/actions/billing'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

export function RunAutomationButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await runAutomationNow()
          toast.success(
            `Automation ran: ${result.penaltiesApplied} penalt${result.penaltiesApplied === 1 ? 'y' : 'ies'} applied, ${result.remindersSent} reminder(s) sent.`
          )
        })
      }
    >
      <Zap className="h-4 w-4" />
      {isPending ? 'Running…' : 'Run billing automation now'}
    </Button>
  )
}
