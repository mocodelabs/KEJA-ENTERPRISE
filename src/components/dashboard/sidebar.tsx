'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavSections } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { Home } from 'lucide-react'
import type { Enums } from '@/lib/types/database'

export function Sidebar({ orgType }: { orgType: Enums<'org_type'> }) {
  const pathname = usePathname()
  const navSections = getNavSections(orgType)

  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900 md:flex print:hidden">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
          <Home className="h-4 w-4 text-white" />
        </span>
        <span className="font-semibold text-white">KEJA Enterprise</span>
      </div>
      <nav className="flex-1 space-y-4 px-2 py-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {section.title}
            </p>
            <div className="mt-1 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
