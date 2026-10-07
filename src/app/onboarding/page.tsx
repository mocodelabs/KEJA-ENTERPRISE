import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/session'
import { OnboardingForm } from '@/components/auth/onboarding-form'

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser()

  const { count } = await supabase
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (count && count > 0) redirect('/dashboard')

  // Signup already asked for these — carried on the account itself (not a
  // cookie) since the confirmation link is often opened on a different
  // device/browser than the one used to sign up.
  const metadata = user.user_metadata ?? {}
  const defaultName = String(metadata.pending_org_name ?? '')
  const defaultOrgType: 'manager' | 'owner_direct' = metadata.pending_org_type === 'owner_direct' ? 'owner_direct' : 'manager'
  const defaultNationalId = String(metadata.pending_owner_national_id ?? '')
  const defaultKraPin = String(metadata.pending_owner_kra_pin ?? '')

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Set up your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">
            You can invite team members and add properties after this.
          </p>
        </div>
        <OnboardingForm
          defaultName={defaultName}
          defaultOrgType={defaultOrgType}
          defaultNationalId={defaultNationalId}
          defaultKraPin={defaultKraPin}
        />
      </div>
    </div>
  )
}
