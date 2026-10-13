'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { NavLinks } from '@/components/dashboard/nav-links'
import { SidebarBrand } from '@/components/dashboard/sidebar'
import { Button } from '@/components/ui/button'
import type { Enums } from '@/lib/types/database'

export function MobileNav({ orgType }: { orgType: Enums<'org_type'> }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(pathname)

  // Close the drawer when navigation happens (reset state during render rather than in an effect).
  if (open && openedAt !== pathname) {
    setOpen(false)
  }

  return (
    <div className="md:hidden print:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => {
          setOpenedAt(pathname)
          setOpen(true)
        }}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col overflow-y-auto bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pr-2">
              <SidebarBrand />
              <button
                type="button"
                aria-label="Close menu"
                className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks orgType={orgType} />
          </aside>
        </div>
      )}
    </div>
  )
}
