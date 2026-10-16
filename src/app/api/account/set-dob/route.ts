import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate customer server-side
    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Please sign in to register your date of birth.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawDob = (body.dob || body.date_of_birth || '').trim();

    if (!rawDob) {
      return NextResponse.json(
        { error: 'Please select a valid date of birth.' },
        { status: 400 }
      );
    }

    // 2. Strict format validation: YYYY-MM-DD
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(rawDob)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected format: YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${rawDob}T00:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'The provided date of birth is invalid.' },
        { status: 400 }
      );
    }

    // 3. Realistic age boundaries (13 to 115 years)
    const today = new Date();
    let age = today.getUTCFullYear() - parsedDate.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - parsedDate.getUTCMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getUTCDate() < parsedDate.getUTCDate())
    ) {
      age--;
    }

    if (age < 13) {
      return NextResponse.json(
        {
          error:
            'You must be at least 13 years old to register your date of birth.',
        },
        { status: 400 }
      );
    }

    if (age > 115) {
      return NextResponse.json(
        { error: 'Please provide a realistic date of birth.' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 4. Authoritatively resolve customer in public.users
    let { data: userProfile } = await supabase
      .from('users')
      .select('id, email, full_name, date_of_birth, is_dob_locked')
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
          .select('id, email, full_name, date_of_birth, is_dob_locked')
          .eq('id', ident.customer_id)
          .maybeSingle();
        userProfile = byIdent;
      }
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Customer account could not be found. Please log in again.' },
        { status: 404 }
      );
    }

    // 5. One-time Registration Check: Ensure DOB cannot be changed once submitted
    if (userProfile.is_dob_locked || userProfile.date_of_birth) {
      return NextResponse.json(
        {
          error:
            'Your date of birth is already registered and cannot be changed online. Please contact Ruhvi Customer Care if you need assistance.',
        },
        { status: 409 }
      );
    }

    // 6. Persist DOB and lock flag
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        date_of_birth: rawDob,
        is_dob_locked: true,
        dob_updated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', userProfile.id);

    if (updateErr) {
      console.error(
        '[API /api/account/set-dob] Supabase update error:',
        updateErr
      );
      return NextResponse.json(
        { error: 'Failed to record date of birth. Please try again later.' },
        { status: 500 }
      );
    }

    // 7. Audit Logging
    await logAuditEvent({
      actorId: userProfile.id,
      actorEmail: userProfile.email || undefined,
      portal: 'storefront',
      action: 'user_dob_locked',
      entityType: 'user',
      entityId: userProfile.id,
      changes: {
        date_of_birth: rawDob,
        is_dob_locked: true,
        dob_updated_at: nowIso,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Date of birth successfully registered and permanently locked.',
      date_of_birth: rawDob,
      is_dob_locked: true,
      dob_updated_at: nowIso,
    });
  } catch (error: any) {
    console.error('[API /api/account/set-dob] Unexpected error:', error);
    return NextResponse.json(
      {
        error:
          error?.message || 'Internal server error while saving date of birth.',
      },
      { status: 500 }
    );
  }
}
