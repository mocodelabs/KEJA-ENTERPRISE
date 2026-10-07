'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required autoComplete="name" placeholder="Jane Wanjiru" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org_name">Company / property name</Label>
        <Input id="org_name" name="org_name" required placeholder="e.g. Keja Properties Ltd" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org_type">What best describes you?</Label>
        <Select id="org_type" name="org_type" defaultValue="manager">
          <option value="manager">I manage properties for other owners</option>
          <option value="owner_direct">I manage my own property directly</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_national_id">Owner National ID</Label>
        <Input id="owner_national_id" name="owner_national_id" required inputMode="numeric" placeholder="e.g. 12345678" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="owner_kra_pin">Owner KRA PIN</Label>
        <Input
          id="owner_kra_pin"
          name="owner_kra_pin"
          required
          placeholder="e.g. A012345678Z"
          className="uppercase"
          maxLength={11}
        />
        <p className="text-xs text-slate-400">Used to verify your account and for tax reporting we&apos;re adding soon.</p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-emerald-700">{state.message}</p>}
      <SubmitButton className="mt-2 w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
