import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const isActive =
      coupon.active !== undefined
        ? coupon.active
        : coupon.is_active !== undefined
          ? coupon.is_active
          : true;
    if (!isActive) {
      return NextResponse.json(
        { error: 'This coupon is no longer active.' },
        { status: 400 }
      );
    }

    const expiryDate = coupon.expiry_date || coupon.valid_until;
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return NextResponse.json(
        { error: 'This coupon has expired.' },
        { status: 400 }
      );
    }

    const maxUses = coupon.usage_limit_total ?? coupon.max_uses;
    const usesCount = Number(coupon.uses_count || 0);
    if (maxUses && usesCount >= maxUses) {
      return NextResponse.json(
        { error: 'Coupon usage limit reached.' },
        { status: 400 }
      );
    }

    const minSpend = Number(coupon.min_order_value || 0);
    if (minSpend > 0 && subtotal < minSpend) {
      return NextResponse.json(
        {
          error: `Minimum order spend is ₹${minSpend.toLocaleString('en-IN')} on physical jewellery items.`,
        },
        { status: 400 }
      );
    }

    // Target Users Validation (e.g. exclusive birthday voucher)
    if (
      coupon.target_users &&
      Array.isArray(coupon.target_users) &&
      coupon.target_users.length > 0
    ) {
      const email = (userEmail || '').toLowerCase().trim();
      const rawPhone = (userPhone || '').replace(/\D/g, '');
      const last10Phone = rawPhone.slice(-10);

      const isAllowed = coupon.target_users.some((target: string) => {
        const cleanTarget = (target || '').toLowerCase().trim();
        const targetDigits = cleanTarget.replace(/\D/g, '');
        return (
          (email && cleanTarget === email) ||
          (last10Phone &&
            (cleanTarget === last10Phone ||
              targetDigits === last10Phone ||
              cleanTarget.endsWith(last10Phone)))
        );
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'This coupon is exclusively reserved for its recipient.' },
          { status: 403 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    const discountType = (
      coupon.discount_type ||
      coupon.type ||
      'flat'
    ).toLowerCase();
    const discountVal = Number(coupon.discount_value ?? coupon.value ?? 0);

    if (discountType === 'flat' || discountType === 'fixed') {
      discountAmount = discountVal;
    } else if (discountType === 'percentage') {
      discountAmount = (subtotal * discountVal) / 100;
      const maxDiscount = coupon.max_discount || coupon.usage_limit_discount;
      if (maxDiscount)
        discountAmount = Math.min(discountAmount, Number(maxDiscount));
    }

    return NextResponse.json({
      success: true,
      discount: Math.round(discountAmount),
      code: coupon.code,
      min_order_value: minSpend,
      is_non_stackable: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
