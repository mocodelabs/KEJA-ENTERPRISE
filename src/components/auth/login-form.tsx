'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton className="mt-2 w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        No account?{' '}
        <Link href="/signup" className="text-emerald-700 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  )
}
