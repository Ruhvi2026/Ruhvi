import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ segments: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Segments storage not configured' },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
