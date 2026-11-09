import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isDemoUser } from '@/lib/demo'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/signup')
  // /brochure is the public MoCode Labs sales page + PDF (static files in public/brochure).
  const isPublicRoute =
    path === '/' ||
    isAuthRoute ||
    path === '/brochure' ||
    path.startsWith('/brochure/') ||
    path === '/demo' ||
    path.startsWith('/demo/')

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const isDemo = isDemoUser(user?.email)

  // Someone browsing the shared demo who then clicks "Log in" / "Create your account" wants those
  // forms, not the demo dashboard: end their demo session (this browser only — `local` scope, because
  // every visitor shares the one demo user and a global sign-out would end everyone else's demo) and
  // let the page render.
  if (user && isDemo && isAuthRoute) {
    await supabase.auth.signOut({ scope: 'local' })
    return response
  }

  // The public landing page (next.config.ts rewrites "/" to the static brochure) is for visitors;
  // real signed-in users go straight to their dashboard. Demo visitors may still view it.
  if (user && !isDemo && (isAuthRoute || path === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
