import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    const { data: types, error } = await supabase
      .from('task_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[Types GET] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch task types' },
        { status: 500 }
      );
    }

    return NextResponse.json({ types: types || [], success: true });
  } catch (err: any) {
    console.error('[Types GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
