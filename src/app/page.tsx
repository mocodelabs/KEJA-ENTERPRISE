import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Building2, MessageSquare, Wallet, BarChart3, Home as HomeIcon } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const features = [
    {
      icon: Building2,
      title: 'Properties & Owners',
      desc: 'Manage client properties, commissions, and reconciled/pending accounts.',
    },
    {
      icon: MessageSquare,
      title: 'Tenant Automation',
      desc: 'Auto-invoice, SMS reminders, penalties, and receipts on payment.',
    },
    {
      icon: Wallet,
      title: 'Accounting',
      desc: 'Expenses, commissions, payroll, and reconciliation in one ledger.',
    },
    {
      icon: BarChart3,
      title: 'Reports',
      desc: 'Property performance, tenant trends, and growth over time.',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
            <HomeIcon className="h-4 w-4 text-white" />
          </span>
          <span className="text-lg font-semibold text-white">KEJA Enterprise</span>
        </span>
        {user ? (
          <Link href="/dashboard" className={cn(buttonVariants())}>
            Go to dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
              Sign in
            </Link>
            <Link href="/signup" className={cn(buttonVariants())}>
              Get started
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Property management, run on autopilot.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          KEJA Enterprise handles billing, tenant SMS reminders, receipts, commission
          reconciliation, and back-office operations for property managers and owners.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href={user ? '/dashboard' : '/signup'} className={cn(buttonVariants({ size: 'lg' }))}>
            {user ? 'Go to dashboard' : 'Start free'}
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-left">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <h3 className="font-medium text-slate-900">{f.title}</h3>
                <p className="mt-0.5 text-sm text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
