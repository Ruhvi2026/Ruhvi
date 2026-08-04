import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const hostname = request.headers.get('host') || '';
  const isAdminHost = hostname === 'admin.ruhvi.in' || hostname.startsWith('admin.localhost');
  const path = request.nextUrl.pathname;

  // 1. Root redirect on admin host
  if (isAdminHost && path === '/') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Block signup on admin host
  if (isAdminHost && path.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Strict Subdomain Isolation
  if (isAdminHost) {
    // Only allow admin, auth, and API routes on the admin subdomain
    const isAllowed = 
      path.startsWith('/admin') ||
      path.startsWith('/manager') ||
      path.startsWith('/staff') ||
      path.startsWith('/login') ||
      path.startsWith('/api') ||
      path.startsWith('/auth/callback') ||
      path === '/404' ||
      path.startsWith('/_not-found');

    if (!isAllowed) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else {
    // Block admin routes on the main customer-facing domain
    if (path.startsWith('/admin') || path.startsWith('/manager') || path.startsWith('/staff')) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }

  // 3. Inject X-Robots-Tag for admin host to prevent indexing
  if (isAdminHost) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50rolbldapjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';

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
            if (isAdminHost) {
              supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
            }
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, { ...options, secure: false })
            )
          },
        },
      }
    )

    // RBAC for /admin, /manager, /staff routes
    if (path.startsWith('/admin') || path.startsWith('/manager') || path.startsWith('/staff')) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', path)
        const redirectResponse = NextResponse.redirect(loginUrl)
        if (isAdminHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c)
        })
        return redirectResponse
      }

      // Fetch user role from public.users table
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      let role = userProfile?.role

      // Always grant admin privileges to the primary admin email or metadata role
      if (
        user.email === 'ruhvi.main@gmail.com' ||
        user.app_metadata?.role === 'admin' ||
        user.user_metadata?.role === 'admin'
      ) {
        role = 'admin'
      }

      if (!role) {
        role = 'customer'
      }

      const allowedRoles = ['admin', 'manager', 'staff']

      if (!allowedRoles.includes(role)) {
        // Forbidden for regular customers
        const redirectResponse = NextResponse.redirect(new URL('/unauthorized', request.url))
        if (isAdminHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c)
        })
        return redirectResponse
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
