import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Please sign in to check your Ruhvi Privé birthday voucher.' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();

    // 2. Authoritatively fetch user profile
    let { data: userProfile } = await supabase
      .from('users')
      .select(
        'id, email, phone, full_name, is_vip, vip_expires_at, date_of_birth, is_dob_locked, dob_updated_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (!userProfile) {
      const { data: ident } = await supabase
        .from('customer_identities')
        .select('customer_id')
        .eq('firebase_uid', user.id)
        .maybeSingle();

      if (ident?.customer_id) {
        const { data: byIdent } = await supabase
          .from('users')
          .select(
            'id, email, phone, full_name, is_vip, vip_expires_at, date_of_birth, is_dob_locked, dob_updated_at'
          )
          .eq('id', ident.customer_id)
          .maybeSingle();
        userProfile = byIdent;
      }
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    // 3. Verify VIP Membership Status
    const isVipActive =
      Boolean(userProfile.is_vip) &&
      Boolean(
        !userProfile.vip_expires_at ||
        new Date(userProfile.vip_expires_at).getTime() > Date.now()
      );

    if (!isVipActive) {
      return NextResponse.json({
        eligible: false,
        reason: 'VIP_MEMBERSHIP_REQUIRED',
        message:
          'Ruhvi Privé membership is required to unlock the annual ₹500 birthday gift voucher.',
      });
    }

    // 4. Verify Date of Birth Status
    if (!userProfile.is_dob_locked || !userProfile.date_of_birth) {
      return NextResponse.json({
        eligible: false,
        reason: 'DOB_NOT_LOCKED',
        message:
          'Please register and lock your Date of Birth in your Account Profile to claim your ₹500 birthday voucher.',
      });
    }

    // 5. Anti-Fraud 30-Day Buffer Check
    const dobLockedAt = userProfile.dob_updated_at
      ? new Date(userProfile.dob_updated_at).getTime()
      : Date.now();
    const daysSinceLocked = Math.floor(
      (Date.now() - dobLockedAt) / (1000 * 60 * 60 * 24)
    );

    // Parse user birthday
    const birthDateParts = userProfile.date_of_birth.split('-').map(Number);
    const birthMonth = birthDateParts[1]; // 1-12
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();

    // 6. Check if customer has already been issued a birthday voucher for the current calendar year
    const expectedCode = `PRIVE-BDAY-${userProfile.id.slice(0, 6).toUpperCase()}-${currentYear}`;

    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', expectedCode)
      .maybeSingle();

    if (existingCoupon) {
      const isExpired = existingCoupon.expiry_date
        ? new Date(existingCoupon.expiry_date) < new Date()
        : false;
      const isActive = (existingCoupon.active ?? true) && !isExpired;

      return NextResponse.json({
        eligible: true,
        voucher: {
          code: existingCoupon.code,
          value: Number(
            existingCoupon.discount_value || existingCoupon.value || 500
          ),
          min_order_value: Number(existingCoupon.min_order_value || 1000),
          valid_until: existingCoupon.expiry_date || existingCoupon.valid_until,
          is_active: isActive,
          terms: [
            'Valid for 1 full year (365 days) from issuance.',
            'Minimum order spend of ₹1,000 on physical jewellery products.',
            'Non-stackable: Cannot be combined or merged with any other voucher or offer.',
            'Applicable exclusively to physical jewellery items (excludes delivery and membership passes).',
            'Single use per member account.',
          ],
        },
      });
    }

    // If within 30-day anti-fraud buffer on fresh account lock
    if (daysSinceLocked < 30) {
      return NextResponse.json({
        eligible: false,
        reason: 'ANTI_FRAUD_BUFFER',
        days_remaining: 30 - daysSinceLocked,
        message: `Your birthday was recently locked. The 30-day anti-fraud security buffer ends in ${30 - daysSinceLocked} days, after which your ₹500 voucher will be generated automatically.`,
      });
    }

    // 7. Generate 1-Year Valid ₹500 Birthday Coupon
    const validUntilIso = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();
    const targetUsers = [
      userProfile.email?.toLowerCase(),
      userProfile.phone,
    ].filter(Boolean) as string[];

    const { data: newCoupon, error: couponErr } = await supabase
      .from('coupons')
      .insert({
        code: expectedCode,
        discount_type: 'flat',
        discount_value: 500,
        min_order_value: 1000,
        expiry_date: validUntilIso,
        usage_limit_total: 1,
        usage_limit_per_user: 1,
        applicable_to: 'specific_users',
        target_users: targetUsers,
        is_public: false,
        active: true,
        cod_charge_waiver: false,
      })
      .select('*')
      .single();

    if (couponErr) {
      console.error('[VIP-BIRTHDAY-VOUCHER] Error creating coupon:', couponErr);
      return NextResponse.json(
        {
          error: 'Failed to generate birthday voucher. Please contact support.',
        },
        { status: 500 }
      );
    }

    // Audit log
    await logAuditEvent({
      actorId: userProfile.id,
      actorEmail: userProfile.email || undefined,
      portal: 'storefront',
      action: 'vip_birthday_voucher_generated',
      entityType: 'coupon',
      entityId: newCoupon.id,
      changes: {
        code: expectedCode,
        value: 500,
        min_order_value: 1000,
        valid_until: validUntilIso,
      },
    });

    return NextResponse.json({
      eligible: true,
      voucher: {
        code: newCoupon.code,
        value: Number(newCoupon.discount_value || 500),
        min_order_value: Number(newCoupon.min_order_value || 1000),
        valid_until: newCoupon.expiry_date,
        is_active: newCoupon.active ?? true,
        terms: [
          'Valid for 1 full year (365 days) from issuance.',
          'Minimum order spend of ₹1,000 on physical jewellery products.',
          'Non-stackable: Cannot be combined or merged with any other voucher or offer.',
          'Applicable exclusively to physical jewellery items (excludes delivery and membership passes).',
          'Single use per member account.',
        ],
      },
    });
  } catch (error: any) {
    console.error('[VIP-BIRTHDAY-VOUCHER] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
