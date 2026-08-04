import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function TestPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';
  
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  const supabase = createServerClient(url, key, { 
    cookies: { 
      getAll() { return allCookies; }, 
      setAll() {} 
    } 
  });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  return (
    <pre>
      {JSON.stringify({ user, error, cookies: allCookies }, null, 2)}
    </pre>
  );
}
