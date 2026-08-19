import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 0. Inject Global Security Headers
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  const hostname = request.headers.get('host') || '';
  const isAdminHost =
    hostname === 'admin.ruhvi.in' || hostname.startsWith('admin.localhost');
  const isSupportHost =
    hostname === 'support.ruhvi.in' || hostname.startsWith('support.localhost');
  const isAuthHost =
    hostname === 'auth.ruhvi.in' || hostname.startsWith('auth.localhost');
  const path = request.nextUrl.pathname;

  // Save referral code from URL to cookie
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode) {
    supabaseResponse.cookies.set('ruhvi_referral_code', refCode, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }

  // 1. Root redirect on admin host
  if (isAdminHost && path === '/') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Root redirect on support host
  if (isSupportHost && path === '/') {
    return NextResponse.redirect(new URL('/support/dashboard', request.url));
  }

  // Root redirect on auth host
  if (isAuthHost && path === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Block signup on admin/support hosts
  if ((isAdminHost || isSupportHost) && path.startsWith('/signup')) {
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
      path.startsWith('/_not-found') ||
      path.endsWith('.js') ||
      path.endsWith('.json');

    if (!isAllowed) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isSupportHost) {
    // Only allow support, auth, and API routes on the support subdomain
    const isAllowed =
      path.startsWith('/support') ||
      path.startsWith('/login') ||
      path.startsWith('/api') ||
      path.startsWith('/auth/callback') ||
      path === '/404' ||
      path.startsWith('/_not-found') ||
      path.endsWith('.js') ||
      path.endsWith('.json');

    if (!isAllowed) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isAuthHost) {
    // Only allow auth and API routes on the auth subdomain
    const isAllowed =
      path.startsWith('/login') ||
      path.startsWith('/signup') ||
      path.startsWith('/reset-password') ||
      path.startsWith('/forgot-password') ||
      path.startsWith('/api') ||
      path.startsWith('/auth/callback') ||
      path === '/404' ||
      path.startsWith('/_not-found') ||
      path.endsWith('.js') ||
      path.endsWith('.json');

    if (!isAllowed) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else {
    // Block admin and support routes on the main customer-facing domain
    if (
      path.startsWith('/admin') ||
      path.startsWith('/manager') ||
      path.startsWith('/staff') ||
      path.startsWith('/support')
    ) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }

  // 3. Inject X-Robots-Tag for admin/support host to prevent indexing
  if (isAdminHost || isSupportHost) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const supabase = createServerClient(
      url,
      serviceKey!, // Using Service Role Key to bypass RLS for role fetching since we don't have a Supabase session
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options: CookieOptions;
            }[]
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            if (isAdminHost || isSupportHost) {
              supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
            }
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, {
                ...options,
                secure: false,
              })
            );
          },
        },
      }
    );

    // RBAC for /admin, /manager, /staff, /support routes
    if (
      path.startsWith('/admin') ||
      path.startsWith('/manager') ||
      path.startsWith('/staff') ||
      path.startsWith('/support')
    ) {
      const sessionCookie = request.cookies.get('__session')?.value;

      if (!sessionCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', path);
        const redirectResponse = NextResponse.redirect(loginUrl);
        if (isAdminHost || isSupportHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }

      // Decode the Firebase session cookie to get the user's UID and Email
      const { decodeJwt } = await import('jose');
      const decodedToken = decodeJwt(sessionCookie);
      const uid = decodedToken.sub;
      const email = decodedToken.email as string | undefined;

      // Fetch user role directly from public.users
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', uid)
        .maybeSingle();
      let userProfile = profile;

      let role = userProfile?.role;

      if (!role) {
        role = 'customer';
      }

      const allowedRoles = ['admin', 'manager', 'staff'];

      if (!allowedRoles.includes(role)) {
        // Forbidden for regular customers
        const redirectResponse = NextResponse.redirect(
          new URL('/unauthorized', request.url)
        );
        if (isAdminHost || isSupportHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }
    }
  } catch (error) {
    console.error('[Middleware Error]', error);
    // Return standard response on error to avoid 500 MIDDLEWARE_INVOCATION_FAILED
  }

  return supabaseResponse;
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
};
