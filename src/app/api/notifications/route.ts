import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { cookies } from 'next/headers';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

export async function GET(request: Request) {
  try {
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
    const includeChat = searchParams.get('includeChat') === 'true';

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category !== 'ALL') {
      query = query.eq('category', category);
    } else if (!includeChat) {
      // In customer interface, 'ALL' means customer alerts: exclude internal staff chat
      query = query.neq('category', 'CHAT');
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

    // Get total unread count for customer badge (excludes internal staff chat)
    let unreadCountQuery = supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!includeChat && category === 'ALL') {
      unreadCountQuery = unreadCountQuery.neq('category', 'CHAT');
    } else if (category !== 'ALL') {
      unreadCountQuery = unreadCountQuery.eq('category', category);
    }

    const { count: unreadCount } = await unreadCountQuery;

    return NextResponse.json({
      notifications: data,
      total: count,
      unreadCount: unreadCount || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
