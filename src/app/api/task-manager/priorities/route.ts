import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    const { data: priorities, error } = await supabase
      .from('task_priorities')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.error('[Priorities GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch priorities' },
        { status: 500 }
      );
    }

    return NextResponse.json({ priorities: priorities || [], success: true });
  } catch (err: any) {
    console.error('[Priorities GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
