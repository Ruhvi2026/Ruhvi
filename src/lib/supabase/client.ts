import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';

  return createBrowserClient(url, key, {
    cookieOptions: {
      secure: false, // temporarily false to allow HTTP login while SSL provisions
    }
  });
}
