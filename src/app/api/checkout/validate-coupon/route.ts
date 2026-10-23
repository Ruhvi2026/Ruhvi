import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CouponService } from '@/services/coupon.service';

export async function POST(request: Request) {
  try {
    const { code, subtotal, userEmail, userPhone } = await request.json();
    if (!code)
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: coupon, error: fetchErr } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (fetchErr || !coupon) {
      return NextResponse.json(
        { error: 'Invalid or unrecognized coupon code.' },
        { status: 404 }
      );
    }

    const validation = CouponService.validateCouponRecord(coupon, {
      code,
      subtotal: Number(subtotal) || 0,
      userEmail,
      userPhone,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    return NextResponse.json({
      success: true,
      discount: validation.discount,
      code: validation.code,
      min_order_value: validation.minOrderValue,
      is_non_stackable: validation.isNonStackable,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
