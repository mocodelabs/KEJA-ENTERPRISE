import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDemoUser } from '@/lib/demo'

/** Leaves the demo workspace and goes to sign-up (the signed-in demo user would otherwise be bounced to the dashboard). */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && isDemoUser(user.email)) await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/signup', request.url))
}
