import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;
let customTokenCache: string | null = null;
let tokenExpiry: number | null = null;
let cachedUid: string | null = null;

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
      return await getCustomToken();
    },
  });

  return supabaseInstance;
}

export async function getCustomToken(): Promise<string> {
  try {
    const { auth } = await import('@/lib/firebase');
    const fbUser = auth.currentUser;
    if (!fbUser) {
      customTokenCache = null;
      tokenExpiry = null;
      cachedUid = null;
      return '';
    }

    // If user changed, invalidate cache
    if (cachedUid !== fbUser.uid) {
      customTokenCache = null;
      tokenExpiry = null;
      cachedUid = fbUser.uid;
    }

    // Check if we have a valid cached token
    if (customTokenCache && tokenExpiry && Date.now() < tokenExpiry) {
      return customTokenCache;
    }

    const idToken = await fbUser.getIdToken(false);

    // Fetch custom Supabase token using the Firebase ID token
    const response = await fetch('/api/auth/sync-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync token');
    }

    const data = await response.json();

    if (data.supabaseToken) {
      customTokenCache = data.supabaseToken;
      // Token expires in 1 hour (set expiration slightly early to be safe)
      tokenExpiry = Date.now() + 55 * 60 * 1000;
      return customTokenCache;
    }
  } catch (e) {
    console.error('Failed to get Supabase JWT', e);
  }
  return '';
}

export function clearSupabaseTokenCache() {
  customTokenCache = null;
  tokenExpiry = null;
  cachedUid = null;
}
