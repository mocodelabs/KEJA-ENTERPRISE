'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteButton({
  action,
  confirmText = 'Delete this record? This cannot be undone.',
}: {
  action: () => Promise<{ error?: string } | void>
  confirmText?: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (!confirm(confirmText)) return
        startTransition(async () => {
          const result = await action()
          if (result?.error) toast.error(result.error)
        })
      }}
    >
      <Trash2 className="h-4 w-4 text-red-600" />
    </Button>
  )
}
