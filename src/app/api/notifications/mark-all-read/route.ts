import { NextResponse, type NextRequest } from 'next/server';
import {
  checkApiRateLimit,
  getClientIp,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '@/lib/rate-limit';
import { getServerUser } from '@/lib/auth/server';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = await checkApiRateLimit(
      'notifications-mark-read:' + ip,
      30,
      60
    );
    if (!rateCheck.success) {
      return createRateLimitResponse(
        rateCheck,
        'Too many requests. Please slow down.'
      );
    }
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience') || 'customer';

    let updateQuery = supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (audience === 'staff') {
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('id, department')
        .or(`auth_user_id.eq.${user.id},legacy_user_id.eq.${user.id}`)
        .eq('is_active', true)
        .maybeSingle();

      if (!staff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const staffFilter = `target_staff_id.eq.${staff.id},user_id.eq.${user.id}${staff.department ? `,target_department.eq.${staff.department}` : ''}`;
      updateQuery = updateQuery.eq('target_audience', 'staff').or(staffFilter);
    } else {
      // Customer context: Only mark customer notifications as read
      updateQuery = updateQuery
        .eq('user_id', user.id)
        .neq('target_audience', 'staff')
        .neq('category', 'CHAT');
    }

    const { error } = await updateQuery;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to mark all as read' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ success: true });
    return addRateLimitHeaders(response, rateCheck);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
