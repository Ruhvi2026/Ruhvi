import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  try {
    const supabase = createServerClient(
      url,
      key,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const path = request.nextUrl.pathname

    // RBAC for /admin, /manager, /staff routes
    if (path.startsWith('/admin') || path.startsWith('/manager') || path.startsWith('/staff')) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', path)
        return NextResponse.redirect(loginUrl)
      }

      // Fetch user role from public.users table
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = userProfile?.role || 'customer'
      const allowedRoles = ['admin', 'manager', 'staff']

      if (!allowedRoles.includes(role)) {
        // Forbidden for regular customers
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  } catch (error) {
    console.error('[Middleware Error]', error)
    // Return standard response on error to avoid 500 MIDDLEWARE_INVOCATION_FAILED
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (.png, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
