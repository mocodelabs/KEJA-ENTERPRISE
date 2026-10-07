'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {value}
      </code>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        title="Copy"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
