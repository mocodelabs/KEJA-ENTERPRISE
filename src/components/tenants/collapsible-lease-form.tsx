'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

export function CollapsibleLeaseForm({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {open ? 'Cancel' : 'New lease'}
      </Button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}
