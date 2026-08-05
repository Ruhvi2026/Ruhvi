import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;
let customTokenCache: string | null = null;
let tokenExpiry: number | null = null;

export function createClient() {
  // Use a singleton instance to prevent excessive token fetching
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';

  supabaseInstance = createSupabaseClient(url, key, {
    accessToken: async () => {
      // Return cached token if valid (expires slightly before actual token)
      if (customTokenCache && tokenExpiry && Date.now() < tokenExpiry) {
        return customTokenCache;
      }
      
      try {
        const { auth } = await import('@/lib/firebase');
        const fbUser = auth.currentUser;
        if (!fbUser) return '';

        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/auth/sync-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        if (res.ok) {
          const data = await res.json();
          customTokenCache = data.supabaseToken;
          // Cache it for 50 minutes (Firebase tokens last 60 minutes)
          tokenExpiry = Date.now() + 50 * 60 * 1000;
          return customTokenCache || '';
        }
      } catch (e) {
        console.error('Failed to fetch custom Supabase JWT', e);
      }
      return '';
    }
  });

  return supabaseInstance;
}
