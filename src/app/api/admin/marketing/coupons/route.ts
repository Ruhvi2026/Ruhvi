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

    if (!(await hasPermission(user.id, 'coupons.view', supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(coupons);
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
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

    if (!(await hasPermission(user.id, 'coupons.create', supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate basics
    if (
      !body.code ||
      !body.discount_type ||
      body.discount_value === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert([
        {
          code: body.code.toUpperCase(),
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          min_order_value: body.min_order_value || 0,
          usage_limit_total: body.usage_limit_total || null,
          usage_limit_per_user: body.usage_limit_per_user || 1,
          applicable_to: body.applicable_to || 'all',
          target_users:
            body.target_users && body.target_users.length > 0
              ? body.target_users
              : null,
          is_public: body.is_public !== undefined ? body.is_public : true,
          expiry_date: body.expiry_date || null,
          cod_charge_waiver: body.cod_charge_waiver || false,
          active: body.active !== undefined ? body.active : true,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // unique violation
        return NextResponse.json(
          { error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
