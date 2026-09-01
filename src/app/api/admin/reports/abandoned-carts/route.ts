import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select(
        'id, quantity, created_at, product:products(name, price), cart:carts(user:users(id, full_name, email, phone))'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch abandoned carts:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to load abandoned carts.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('Error loading abandoned carts:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load abandoned carts.' },
      { status: 500 }
    );
  }
}
