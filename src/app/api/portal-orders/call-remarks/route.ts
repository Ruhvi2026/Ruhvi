import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { OrderCallRemark, OrderCallStatus } from '@/types/database';

const VALID_STATUSES: OrderCallStatus[] = [
  'calling_in_progress',
  'connected_resolved',
  'customer_unreachable',
  'rescheduled',
  'rto_confirmed',
  'return_coordination_scheduled',
  'cancelled',
  'other',
];

const COLLISION_WINDOW_MINUTES = 20;

async function authenticateStaffUser(req: NextRequest) {
  const cookieStore = await cookies();
  let token = cookieStore.get('__session')?.value;

  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.sub) return null;

  const supabase = await getSupabaseAdminClient(cookieStore);
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, department')
    .eq('id', payload.sub)
    .single();

  if (error || !userProfile) return null;

  const allowedRoles = ['admin', 'super_admin', 'manager', 'staff'];
  if (!allowedRoles.includes(userProfile.role?.toLowerCase())) {
    return null;
  }

  return { user: payload, profile: userProfile, supabase };
}

// GET /api/portal-orders/call-remarks?orderId=...
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateStaffUser(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized staff access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId parameter is required' },
        { status: 400 }
      );
    }

    const { data: remarks, error } = await auth.supabase
      .from('order_call_remarks')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[call-remarks GET] Error querying remarks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch remarks' },
        { status: 500 }
      );
    }

    const typedRemarks: OrderCallRemark[] = remarks || [];
    const latestRemark = typedRemarks.length > 0 ? typedRemarks[0] : null;

    let activeCall: {
      isInProgress: boolean;
      staffId?: string | null;
      staffName?: string;
      department?: string;
      startedAt?: string;
      elapsedMinutes?: number;
    } | null = null;

    if (latestRemark && latestRemark.call_status === 'calling_in_progress') {
      const remarkTime = new Date(latestRemark.created_at).getTime();
      const now = Date.now();
      const diffMinutes = Math.floor((now - remarkTime) / (1000 * 60));

      if (diffMinutes <= COLLISION_WINDOW_MINUTES) {
        activeCall = {
          isInProgress: true,
          staffId: latestRemark.staff_id,
          staffName: latestRemark.staff_name,
          department: latestRemark.department,
          startedAt: latestRemark.created_at,
          elapsedMinutes: diffMinutes,
        };
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      remarks: typedRemarks,
      latestRemark,
      activeCall: activeCall || { isInProgress: false },
    });
  } catch (err: any) {
    console.error('[call-remarks GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

// POST /api/portal-orders/call-remarks
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateStaffUser(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized staff access' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      returnId,
      callStatus,
      remarkText,
      rescheduledDate,
      force,
    } = body;

    if (!orderId || !callStatus || !remarkText) {
      return NextResponse.json(
        { error: 'orderId, callStatus, and remarkText are required' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(callStatus)) {
      return NextResponse.json(
        { error: `Invalid callStatus. Allowed: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Collision Check: If initiating call, verify if another staff member is currently on the call
    if (callStatus === 'calling_in_progress' && !force) {
      const { data: latestRows } = await auth.supabase
        .from('order_call_remarks')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);

      const latest = latestRows?.[0];
      if (latest && latest.call_status === 'calling_in_progress') {
        const diffMinutes =
          (Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60);
        if (
          diffMinutes <= COLLISION_WINDOW_MINUTES &&
          latest.staff_id !== auth.profile.id
        ) {
          return NextResponse.json(
            {
              error: 'COLLISION_DETECTED',
              message: `${latest.staff_name} (${latest.department}) is currently calling this customer (started ${Math.floor(diffMinutes)}m ago).`,
              activeStaffName: latest.staff_name,
              startedAt: latest.created_at,
              elapsedMinutes: Math.floor(diffMinutes),
            },
            { status: 409 }
          );
        }
      }
    }

    const staffDisplayName =
      auth.profile.full_name ||
      (auth.profile.email ? auth.profile.email.split('@')[0] : 'Staff Member');

    const department = auth.profile.department || 'orders';

    const insertPayload = {
      order_id: orderId,
      return_id: returnId || null,
      staff_id: auth.profile.id,
      staff_name: staffDisplayName,
      department: department,
      call_status: callStatus,
      remark_text: (remarkText as string).trim(),
      rescheduled_date: rescheduledDate
        ? new Date(rescheduledDate).toISOString()
        : null,
    };

    const { data: insertedRemark, error: insertError } = await auth.supabase
      .from('order_call_remarks')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[call-remarks POST] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record call remark: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      remark: insertedRemark as OrderCallRemark,
    });
  } catch (err: any) {
    console.error('[call-remarks POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
