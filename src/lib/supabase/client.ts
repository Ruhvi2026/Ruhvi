import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;
let customTokenCache: string | null = null;
let tokenExpiry: number | null = null;

export function createClient() {
  // Use a singleton instance to prevent excessive token fetching
  if (supabaseInstance) return supabaseInstance;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';

  supabaseInstance = createSupabaseClient(url, key, {
    global: {
      headers: {},
    },
    accessToken: async () => {
      try {
        const { auth } = await import('@/lib/firebase');
        const fbUser = auth.currentUser;
        if (!fbUser) return '';

        // Directly use the Firebase JWT for Supabase RLS
        const idToken = await fbUser.getIdToken(false);
        return idToken;
      } catch (e) {
        console.error('Failed to get Firebase JWT', e);
      }
      return '';
    },
  });

  return supabaseInstance;
}
