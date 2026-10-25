import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { applySecurityHeaders } from '@/lib/middleware/security-headers';
import { resolveHost } from '@/lib/middleware/resolve-host';
import {
  INTERNAL_BASES,
  COMMON_ALLOWED_PATHS,
} from '@/lib/middleware/constants';
import {
  verifyCachedRbac,
  signRbacProfile,
  RBAC_COOKIE_NAME,
  RBAC_CACHE_TTL_SECONDS,
  type CachedRbacProfile,
} from '@/lib/middleware/rbac-cache';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const host = resolveHost(request.headers.get('host') || '');
  const {
    hostname,
    isAdminHost,
    isOperationsHost,
    isOrdersHost,
    isSupportHost,
    isMarketingHost,
    isAuthHost,
    isTechHost,
    isCoFounderHost,
    isAnyPortalHost,
  } = host;
  supabaseResponse.headers.set('x-ruhvi-host', hostname);
  const path = request.nextUrl.pathname;

  // 0. Inject Global Security Headers
  applySecurityHeaders(supabaseResponse, isAnyPortalHost);

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
    const rootRedirects = [
      { condition: isAdminHost, dest: '/admin/dashboard' },
      { condition: isOperationsHost, dest: '/operations/dashboard' },
      { condition: isOrdersHost, dest: '/portal-orders/dashboard' },
      { condition: isSupportHost, dest: '/support/dashboard' },
      { condition: isMarketingHost, dest: '/marketing/dashboard' },
      { condition: isTechHost, dest: '/tech/dashboard' },
      { condition: isCoFounderHost, dest: '/co-founder' },
      { condition: isAuthHost, dest: '/login' },
    ];

    const match = rootRedirects.find((route) => route.condition);
    if (match) {
      return NextResponse.redirect(new URL(match.dest, request.url));
    }
  }

  // Block signup on portal hosts
  if (isAnyPortalHost && path.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Strict Subdomain Isolation
  const isCommonAllowed =
    COMMON_ALLOWED_PATHS.some((p) => path.startsWith(p)) ||
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
  } else if (isTechHost) {
    if (!isCommonAllowed && !path.startsWith('/tech')) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  } else if (isCoFounderHost) {
    if (
      !isCommonAllowed &&
      !path.startsWith('/co-founder') &&
      !path.startsWith('/admin/ai-chat')
    ) {
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
    const isBlocked = INTERNAL_BASES.some(
      (b) => path === b || path.startsWith(b + '/')
    );
    if (isBlocked) {
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }

  // 3. Inject X-Robots-Tag for portal hosts to prevent indexing
  if (isAnyPortalHost) {
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  const isInternalRoute = INTERNAL_BASES.some(
    (b) => path === b || path.startsWith(b + '/')
  );

  if (isInternalRoute) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url) {
        throw new Error(
          'Missing Supabase env var: NEXT_PUBLIC_SUPABASE_URL must be set in middleware.'
        );
      }
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceKey) {
        console.error(
          '[Middleware] SUPABASE_SERVICE_ROLE_KEY is missing — failing closed.'
        );
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
      }

      const supabase = createServerClient(url, serviceKey, {
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
            applySecurityHeaders(supabaseResponse, isAnyPortalHost);
            supabaseResponse.headers.set('x-ruhvi-host', hostname);
            const isProduction = process.env.NODE_ENV === 'production';
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, {
                ...options,
                secure: isProduction ? true : (options.secure ?? false),
                sameSite: options.sameSite ?? 'lax',
              })
            );
          },
        },
      });

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
      const mfaVerified = (decodedToken as any).mfa_verified as
        boolean | undefined;

      if (!uid) {
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

      // 1. Check for valid cryptographically signed RBAC cache cookie to bypass remote DB query
      const cachedRbacCookie = request.cookies.get(RBAC_COOKIE_NAME)?.value;
      const cachedProfile = await verifyCachedRbac(cachedRbacCookie, uid);
      let needsRbacCookieSet = false;

      let userProfile: CachedRbacProfile;

      if (cachedProfile) {
        userProfile = cachedProfile;
      } else {
        // Cache miss: fetch user role, department and allowed portals directly from public.users
        const { data: profile } = await supabase
          .from('users')
          .select(
            'role, account_status, allowed_portals, department, totp_enabled'
          )
          .eq('id', uid)
          .maybeSingle();

        userProfile = {
          uid,
          role: profile?.role || 'customer',
          accountStatus: profile?.account_status || 'active',
          allowedPortals: (profile as any)?.allowed_portals || [],
          department: profile?.department ?? null,
          totpEnabled: !!profile?.totp_enabled,
        };
        needsRbacCookieSet = true;
      }

      const role = userProfile.role;
      const accountStatus = userProfile.accountStatus;
      const allowedPortals = userProfile.allowedPortals;
      const department = userProfile.department;

      // 2. Set RBAC cache cookie on miss so subsequent navigation skips DB query
      if (needsRbacCookieSet && accountStatus === 'active') {
        const rbacToken = await signRbacProfile(userProfile);
        if (rbacToken) {
          const isProduction = process.env.NODE_ENV === 'production';
          const isRuhviDomain = hostname.endsWith('ruhvi.in');
          supabaseResponse.cookies.set({
            name: RBAC_COOKIE_NAME,
            value: rbacToken,
            maxAge: RBAC_CACHE_TTL_SECONDS,
            httpOnly: true,
            secure: isProduction,
            path: '/',
            sameSite: 'lax',
            ...(isProduction && isRuhviDomain ? { domain: '.ruhvi.in' } : {}),
          });
        }
      }

      // 3. Check account status
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

      // 4. Enforce 2FA verification for internal staff/portal access
      if (userProfile.totpEnabled && !mfaVerified) {
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

      // 5. Authorize based on roles or explicit allowed_portals
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
      if (role === 'super_admin' || role === 'admin') {
        isPortalAllowed = true;
      } else if (isCommonAllowed) {
        isPortalAllowed = true;
      } else {
        if (
          isAdminHost &&
          (allowedPortals.includes('admin') ||
            ['admin', 'manager', 'super_admin'].includes(role))
        ) {
          isPortalAllowed = true;
        }
        if (
          isOperationsHost &&
          (department === 'operations' || allowedPortals.includes('operations'))
        ) {
          isPortalAllowed = true;
        }
        if (
          isOrdersHost &&
          (department === 'orders' ||
            department === 'portal-orders' ||
            allowedPortals.includes('orders'))
        ) {
          isPortalAllowed = true;
        }
        if (
          isSupportHost &&
          (department === 'support' ||
            allowedPortals.includes('support') ||
            role === 'staff')
        ) {
          isPortalAllowed = true;
        }
        if (
          isMarketingHost &&
          (department === 'marketing' || allowedPortals.includes('marketing'))
        ) {
          isPortalAllowed = true;
        }
        if (
          isTechHost &&
          (department === 'tech' || allowedPortals.includes('tech'))
        ) {
          isPortalAllowed = true;
        }
        if (
          isCoFounderHost &&
          (department === 'co-founder' ||
            allowedPortals.includes('co-founder') ||
            ['super_admin', 'admin'].includes(role))
        ) {
          isPortalAllowed = true;
        }
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
