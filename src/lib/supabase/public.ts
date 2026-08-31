import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let publicClientInstance: any = null;

/**
 * A cookie-free Supabase client for server-side reads of public data only
 * (categories, collections, store settings). Does not read or set cookies,
 * so it never forces dynamic rendering — pages using it can be statically
 * generated / ISR-cached.
 *
 * Only safe for data whose RLS policies allow anonymous public reads.
 */
export function createPublicClient() {
  if (publicClientInstance) return publicClientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.'
    );
  }

  publicClientInstance = createSupabaseClient(url, key);
  return publicClientInstance;
}
