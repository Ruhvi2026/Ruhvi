import { createClient as createJSClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Single shared service-role Supabase client factory.
//
// Used by internal server-side order/payment/inventory operations that must
// bypass RLS. The service-role key is server-only and must never be exposed to
// the client. Centralising it here prevents the per-file drift that occurred
// when each module embedded its own copy.
// ---------------------------------------------------------------------------

const FALLBACK_SUPABASE_URL = 'https://igrkrkxdantrolbldapj.supabase.co';

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: NEXT_PUBLIC_SUPABASE_URL is not set in production. Failing closed.'
    );
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createJSClient(url || FALLBACK_SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
