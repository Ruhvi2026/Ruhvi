import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { user } = await getServerUser();
    if (!user?.id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (
      !(await hasPermission(user.id, 'promotions.view', supabase)) &&
      !(await hasPermission(user.id, 'marketing.view', supabase))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(promotions);
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { user } = await getServerUser();
    if (!user?.id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (
      !(await hasPermission(user.id, 'promotions.create', supabase)) &&
      !(await hasPermission(user.id, 'marketing.edit', supabase))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (
      !body.name ||
      !body.discount_type ||
      body.discount_value === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert([
        {
          name: body.name,
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          start_date: body.start_date || null,
          end_date: body.end_date || null,
          active: body.active !== undefined ? body.active : true,
          applicable_to: body.applicable_to || 'all',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
