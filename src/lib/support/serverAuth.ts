import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

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
    const decoded = decodeJwt(sessionCookie);
    const uid = decoded.sub;
    if (!uid) return null;

    const supabase = await getSupabaseAdminClient(cookieStore);
    const { data: identity } = await supabase
      .from('customer_identities')
      .select('customer_id')
      .eq('firebase_uid', uid)
      .maybeSingle();

    if (!identity?.customer_id) return null;

    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role')
      .eq('id', identity.customer_id)
      .maybeSingle();

    if (!user) return null;

    // Grant admin privileges to primary administrator email
    if (decoded.email === 'ruhvi.main@gmail.com') {
      user.role = 'admin';
    }

    return user as SupportStaffUser;
  } catch (err) {
    console.error('getCurrentSupportUser error:', err);
    return null;
  }
}
