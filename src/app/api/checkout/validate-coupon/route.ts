import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { code, subtotal, userEmail, userPhone } = await request.json();
    if (!code) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: coupon } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).single();

    if (!coupon) return NextResponse.json({ error: 'Invalid or inactive coupon.' }, { status: 404 });
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return NextResponse.json({ error: 'Coupon has expired.' }, { status: 400 });
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) return NextResponse.json({ error: 'Coupon usage limit reached.' }, { status: 400 });
    if (coupon.min_order_value && subtotal < coupon.min_order_value) return NextResponse.json({ error: ${'Minimum order value is ?'}' }, { status: 400 });

    // Target Users Validation
    if (coupon.target_users && coupon.target_users.length > 0) {
      const email = userEmail?.toLowerCase() || '';
      const phone = userPhone || '';
      
      let isAllowed = false;
      for (const target of coupon.target_users) {
        if (target === email || target === phone || phone.includes(target) || (target.length > 9 && phone.endsWith(target))) {
          isAllowed = true;
          break;
        }
      }
      if (!isAllowed) return NextResponse.json({ error: 'This coupon is not applicable to your account.' }, { status: 403 });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discountAmount = (subtotal * coupon.value) / 100;
      if (coupon.max_discount) discountAmount = Math.min(discountAmount, coupon.max_discount);
    }

    return NextResponse.json({ success: true, discount: Math.round(discountAmount) });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
