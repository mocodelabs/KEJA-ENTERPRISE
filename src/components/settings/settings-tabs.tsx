'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/org', label: 'Organization' },
  { href: '/settings/payments', label: 'Payment Gateways' },
  { href: '/settings/sms', label: 'SMS Gateway' },
  { href: '/settings/whatsapp', label: 'WhatsApp Gateway' },
]

export function SettingsTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-t-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-b-2 border-emerald-700 text-emerald-800'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
