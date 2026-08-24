import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';

export interface AdminClientResult {
  supabase: any;
  userId: string;
  role: string | null;
}

/**
 * For server actions / route handlers: verifies the __session JWT and the
 * user's role in `users`, then returns a service-role Supabase client.
 * Throws on unauthenticated/unauthorized so callers can surface the error.
 */
export async function requireAdminClient(): Promise<AdminClientResult> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    throw new Error(
      auth.error === 'Unauthorized'
        ? 'Unauthorized'
        : 'Forbidden: Insufficient permissions'
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.'
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return { supabase, userId: auth.uid, role: auth.role };
}
