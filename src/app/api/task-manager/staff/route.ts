import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const departmentId = searchParams.get('department_id');

    const supabase = getServiceClient();
    let dbQuery = supabase
      .from('users')
      .select(
        'id, full_name, email, department_id, role, account_status, avatar_url'
      )
      .neq('role', 'customer')
      .eq('account_status', 'active')
      .order('full_name', { ascending: true });

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    if (departmentId) {
      dbQuery = dbQuery.eq('department_id', departmentId);
    }

    const { data: staff, error } = await dbQuery.limit(100);

    if (error) {
      console.error('[Staff GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch staff' },
        { status: 500 }
      );
    }

    return NextResponse.json({ staff: staff || [], success: true });
  } catch (err: any) {
    console.error('[Staff GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
