import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_ORG_COOKIE } from '@/lib/session'
import { DEMO_EMAIL, DEMO_PASSWORD, isDemoUser } from '@/lib/demo'

/** One-click entry to the shared demo workspace (see src/lib/demo.ts). */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const dashboard = new URL('/dashboard', request.url)

  // Never swap a real user's session for the demo one.
  if (user && !isDemoUser(user.email)) return NextResponse.redirect(dashboard)

  if (!user) {
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    if (error) return NextResponse.redirect(new URL('/login', request.url))
  }

  const { data: membership } = await supabase.from('org_members').select('org_id').limit(1).maybeSingle()
  if (membership) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, membership.org_id, { httpOnly: true, sameSite: 'lax', path: '/' })
  }

  return NextResponse.redirect(dashboard)
}
