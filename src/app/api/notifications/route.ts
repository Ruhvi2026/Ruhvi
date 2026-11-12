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

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = await checkApiRateLimit('notifications:' + ip, 60, 60);
    if (!rateCheck.success) {
      return createRateLimitResponse(
        rateCheck,
        'Too many notification requests. Please slow down.'
      );
    }
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'ALL';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const audience = searchParams.get('audience') || 'customer';

    let query = supabase.from('notifications').select('*', { count: 'exact' });

    let unreadQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (audience === 'staff') {
      // Verify user is an active staff member before exposing internal notifications
      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('id, department, role')
        .or(`auth_user_id.eq.${user.id},legacy_user_id.eq.${user.id}`)
        .eq('is_active', true)
        .maybeSingle();

      if (!staff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const staffFilter = `target_staff_id.eq.${staff.id},user_id.eq.${user.id}${staff.department ? `,target_department.eq.${staff.department}` : ''}`;

      query = query
        .eq('target_audience', 'staff')
        .or(staffFilter)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      unreadQuery = unreadQuery.eq('target_audience', 'staff').or(staffFilter);
    } else {
      // Customer Portal Context: Strictly exclude internal staff notifications and internal chat
      query = query
        .eq('user_id', user.id)
        .neq('target_audience', 'staff')
        .neq('category', 'CHAT')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      unreadQuery = unreadQuery
        .eq('user_id', user.id)
        .neq('target_audience', 'staff')
        .neq('category', 'CHAT');
    }

    if (category !== 'ALL') {
      query = query.eq('category', category);
      unreadQuery = unreadQuery.eq('category', category);
    }
    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Get total unread count scoped strictly by the caller context
    const { count: unreadCount } = await unreadQuery;

    const response = NextResponse.json({
      notifications: data,
      total: count,
      unreadCount: unreadCount || 0,
    });
    return addRateLimitHeaders(response, rateCheck);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
