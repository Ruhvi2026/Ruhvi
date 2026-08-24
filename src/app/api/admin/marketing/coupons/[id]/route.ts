import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { hasPermission } from '@/lib/auth/rbac';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { user } = await getServerUser();
    if (!user?.id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await hasPermission(user.id, 'coupons.edit', supabase))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const allowedFields = [
      'code',
      'discount_type',
      'discount_value',
      'min_order_value',
      'usage_limit_total',
      'usage_limit_per_user',
      'applicable_to',
      'target_users',
      'is_public',
      'expiry_date',
      'cod_charge_waiver',
      'active',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { user } = await getServerUser();
    if (!user?.id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await hasPermission(user.id, 'coupons.edit', supabase))) {
      // Assume edit permission allows delete/deactivation
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    const { error } = await supabase.from('coupons').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
