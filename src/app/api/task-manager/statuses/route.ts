import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    const { data: statuses, error } = await supabase
      .from('task_statuses')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[Statuses GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statuses' },
        { status: 500 }
      );
    }

    return NextResponse.json({ statuses: statuses || [], success: true });
  } catch (err: any) {
    console.error('[Statuses GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
