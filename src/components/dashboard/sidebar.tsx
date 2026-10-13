import { NavLinks } from '@/components/dashboard/nav-links'
import { Home } from 'lucide-react'
import type { Enums } from '@/lib/types/database'

export function SidebarBrand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 px-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
        <Home className="h-4 w-4 text-white" />
      </span>
      <span className="font-semibold text-white">KEJA Enterprise</span>
    </div>
  )
}

export function Sidebar({ orgType }: { orgType: Enums<'org_type'> }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900 md:flex print:hidden">
      <SidebarBrand />
      <NavLinks orgType={orgType} />
    </aside>
  )
}
