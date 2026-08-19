import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server';

function hasPermission(profile: any, reqPerm: string) {
  if (!profile) return false;
  const role = profile.role?.toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  const perms = profile.permissions || [];
  if (perms.includes('*') || perms.includes(reqPerm)) return true;
  const [module] = reqPerm.split('.');
  if (perms.includes(`${module}.*`)) return true;
  return false;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!hasPermission(profile, 'coupons.view')) {
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
    const supabase = await createClient();
    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!hasPermission(profile, 'coupons.create')) {
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
