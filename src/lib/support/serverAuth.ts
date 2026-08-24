import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

export interface SupportStaffUser {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'customer' | 'staff' | 'manager' | 'admin';
}

export async function getSupabaseAdminClient(cookieStore?: any) {
  const store = cookieStore || (await cookies());
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function getCurrentSupportUser(): Promise<SupportStaffUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await verifySessionToken(sessionCookie);
    const uid = decoded?.sub;
    if (!uid) return null;

    const supabase = await getSupabaseAdminClient(cookieStore);
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role')
      .eq('id', uid)
      .maybeSingle();

    if (!user) return null;

    return user as SupportStaffUser;
  } catch (err) {
    console.error('getCurrentSupportUser error:', err);
    return null;
  }
}
