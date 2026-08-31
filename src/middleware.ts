import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/verify-session';

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
  supabaseResponse.headers.set('x-ruhvi-host', hostname);
  const isAdminHost =
    hostname === 'admin.ruhvi.in' || hostname.startsWith('admin.localhost');
  const isOperationsHost =
    hostname === 'operation.ruhvi.in' ||
    hostname.startsWith('operation.localhost');
  const isOrdersHost =
    hostname === 'orders.ruhvi.in' || hostname.startsWith('orders.localhost');
  const isSupportHost =
    hostname === 'support.ruhvi.in' || hostname.startsWith('support.localhost');
  const isMarketingHost =
    hostname === 'marketing.ruhvi.in' ||
    hostname.startsWith('marketing.localhost');
  const isAuthHost =
    hostname === 'auth.ruhvi.in' || hostname.startsWith('auth.localhost');

  const isAnyPortalHost =
    isAdminHost ||
    isOperationsHost ||
    isOrdersHost ||
    isSupportHost ||
    isMarketingHost;
  const path = request.nextUrl.pathname;

  // Save referral code from URL to cookie
  const refCode = request.nextUrl.searchParams.get('ref');
  if (refCode) {
    supabaseResponse.cookies.set('ruhvi_referral_code', refCode, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }

  // 1. Root redirect on portal hosts
  if (path === '/') {
    if (isAdminHost)
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    if (isOperationsHost)
      return NextResponse.redirect(
        new URL('/operations/dashboard', request.url)
      );
    if (isOrdersHost)
      return NextResponse.redirect(
        new URL('/portal-orders/dashboard', request.url)
      );
    if (isSupportHost)
      return NextResponse.redirect(new URL('/support/dashboard', request.url));
    if (isMarketingHost)
      return NextResponse.redirect(
        new URL('/marketing/dashboard', request.url)
      );
    if (isAuthHost)
      return NextResponse.redirect(new URL('/login', request.url));
  }

  // Block signup on portal hosts
  if (isAnyPortalHost && path.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Strict Subdomain Isolation
  const commonAllowedPaths = [
    '/login',
    '/api',
    '/auth/callback',
    '/404',
    '/_not-found',
    '/unauthorized',
  ];
  const isCommonAllowed =
    commonAllowedPaths.some((p) => path.startsWith(p)) ||
    path.endsWith('.js') ||
    path.endsWith('.json');

  if (isAdminHost) {
    if (
      !isCommonAllowed &&
      !path.startsWith('/admin') &&
      !path.startsWith('/manager') &&
      !path.startsWith('/staff')
    ) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isOperationsHost) {
    if (!isCommonAllowed && !path.startsWith('/operations')) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isOrdersHost) {
    if (!isCommonAllowed && !path.startsWith('/portal-orders')) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isSupportHost) {
    if (!isCommonAllowed && !path.startsWith('/support')) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isMarketingHost) {
    if (!isCommonAllowed && !path.startsWith('/marketing')) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isAuthHost) {
    const isAuthAllowed =
      isCommonAllowed ||
      path.startsWith('/signup') ||
      path.startsWith('/set-password') ||
      path.startsWith('/reset-password') ||
      path.startsWith('/forgot-password');
    if (!isAuthAllowed) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else {
    // Block internal routes on the main customer-facing domain
    if (
      path.startsWith('/admin') ||
      path.startsWith('/manager') ||
      path.startsWith('/staff') ||
      path.startsWith('/operations') ||
      path.startsWith('/portal-orders') ||
      path.startsWith('/support') ||
      path.startsWith('/marketing')
    ) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }

  // 3. Inject X-Robots-Tag for portal hosts to prevent indexing
  if (isAnyPortalHost) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  const isInternalRoute =
    path.startsWith('/admin') ||
    path.startsWith('/manager') ||
    path.startsWith('/staff') ||
    path.startsWith('/operations') ||
    path.startsWith('/portal-orders') ||
    path.startsWith('/support') ||
    path.startsWith('/marketing');

  if (isInternalRoute) {
    try {
      const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
              if (isAnyPortalHost) {
                supabaseResponse.headers.set(
                  'X-Robots-Tag',
                  'noindex, nofollow'
                );
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

      // RBAC for internal routes
      const sessionCookie = request.cookies.get('__session')?.value;

      if (!sessionCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', path);
        const redirectResponse = NextResponse.redirect(loginUrl);
        if (isAnyPortalHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }

      // Verify the signed session cookie to get the user's UID and Email
      const decodedToken = await verifySessionToken(sessionCookie);
      if (!decodedToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', path);
        const redirectResponse = NextResponse.redirect(loginUrl);
        if (isAnyPortalHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }
      const uid = decodedToken.sub;
      const email = decodedToken.email as string | undefined;

      // Fetch user role and allowed portals directly from public.users
      const { data: profile } = await supabase
        .from('users')
        .select('role, account_status, allowed_portals')
        .eq('id', uid)
        .maybeSingle();

      const userProfile = profile;
      const role = userProfile?.role || 'customer';
      const accountStatus = userProfile?.account_status || 'active';
      const allowedPortals = userProfile?.allowed_portals || [];

      // 1. Check account status
      if (accountStatus !== 'active') {
        const redirectResponse = NextResponse.redirect(
          new URL('/unauthorized', request.url)
        );
        if (isAnyPortalHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }

      // 2. Authorize based on roles or explicit allowed_portals
      // By default, super_admin has access to everything
      // Other roles need explicit allowed_portals OR fallback legacy logic
      const allowedRoles = ['super_admin', 'admin', 'manager', 'staff'];

      if (!allowedRoles.includes(role)) {
        // Forbidden for regular customers
        const redirectResponse = NextResponse.redirect(
          new URL('/unauthorized', request.url)
        );
        if (isAnyPortalHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }

      // Portal-specific authorization
      let isPortalAllowed = false;
      if (role === 'super_admin') {
        isPortalAllowed = true;
      } else {
        if (
          isAdminHost &&
          (allowedPortals.includes('admin') ||
            ['admin', 'manager'].includes(role))
        )
          isPortalAllowed = true;
        if (
          isOperationsHost &&
          (allowedPortals.includes('operations') || role === 'admin')
        )
          isPortalAllowed = true;
        if (
          isOrdersHost &&
          (allowedPortals.includes('orders') || role === 'admin')
        )
          isPortalAllowed = true;
        if (
          isSupportHost &&
          (allowedPortals.includes('support') ||
            role === 'admin' ||
            role === 'staff')
        )
          isPortalAllowed = true;
        if (
          isMarketingHost &&
          (allowedPortals.includes('marketing') || role === 'admin')
        )
          isPortalAllowed = true;
      }

      if (!isPortalAllowed && isAnyPortalHost) {
        const redirectResponse = NextResponse.redirect(
          new URL('/unauthorized', request.url)
        );
        if (isAnyPortalHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        supabaseResponse.cookies.getAll().forEach((c) => {
          redirectResponse.cookies.set(c.name, c.value, c);
        });
        return redirectResponse;
      }
    } catch (error) {
      console.error('[Middleware Error]', error);
      // Fail closed: if RBAC/session verification fails on an internal route,
      // redirect to login instead of passing the request through unauthenticated.
      if (isInternalRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', path);
        const redirectResponse = NextResponse.redirect(loginUrl);
        if (isAnyPortalHost) {
          redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        return redirectResponse;
      }
      // For public routes, return the standard response to avoid 500 MIDDLEWARE_INVOCATION_FAILED
    }
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
