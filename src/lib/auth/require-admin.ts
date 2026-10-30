import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { verifySessionToken } from '@/lib/auth/verify-session';

export const INTERNAL_ADMIN_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'staff',
];

export interface RequireAdminResult {
  ok: boolean;
  uid: string;
  role: string | null;
  error: 'Unauthorized' | 'Forbidden' | null;
  status: number;
}

/**
 * Verifies the __session JWT (via cookie or Bearer authorization header)
 * and checks the user's role in the `users` table.
 * Returns ok=true only for authenticated users whose role is in
 * INTERNAL_ADMIN_ROLES. Fails closed on any error.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const cookieStore = await cookies();
  let token = cookieStore.get('__session')?.value;

  if (!token) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      }
    } catch {}
  }

  if (!token)
    return {
      ok: false,
      uid: '',
      role: null,
      error: 'Unauthorized',
      status: 401,
    };

  try {
    const decoded = await verifySessionToken(token);
    // `sub` is always the Supabase `users.id` UUID minted by /api/auth/session.
    // Do NOT fall back to `firebase_uid` — it lives in a different namespace
    // (customer_identities) and must never be used to look up users.id.
    const uid = decoded?.sub as string | undefined;
    if (!decoded || !uid) {
      return {
        ok: false,
        uid: '',
        role: null,
        error: 'Unauthorized',
        status: 401,
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl && process.env.NODE_ENV === 'production') {
      console.error(
        '[requireAdmin] FATAL: NEXT_PUBLIC_SUPABASE_URL is not set in production. Failing closed.'
      );
      return {
        ok: false,
        uid: '',
        role: null,
        error: 'Unauthorized',
        status: 500,
      };
    }

    const supabase = createServerClient(
      supabaseUrl || 'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', uid)
      .maybeSingle();

    const role = (user?.role as string | null) || null;
    if (!role || !INTERNAL_ADMIN_ROLES.includes(role)) {
      return { ok: false, uid, role, error: 'Forbidden', status: 403 };
    }

    return { ok: true, uid, role, error: null, status: 200 };
  } catch {
    return {
      ok: false,
      uid: '',
      role: null,
      error: 'Unauthorized',
      status: 401,
    };
  }
}
