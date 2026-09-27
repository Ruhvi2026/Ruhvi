import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

export async function GET(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();

    const [prioritiesRes, statusesRes, typesRes] = await Promise.all([
      supabase
        .from('task_priorities')
        .select('*')
        .order('level', { ascending: true }),
      supabase
        .from('task_statuses')
        .select('*')
        .order('display_order', { ascending: true }),
      supabase
        .from('task_types')
        .select('*')
        .order('name', { ascending: true }),
    ]);

    if (prioritiesRes.error) {
      console.error('[Reference GET] Priorities error:', prioritiesRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch priorities' },
        { status: 500 }
      );
    }
    if (statusesRes.error) {
      console.error('[Reference GET] Statuses error:', statusesRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch statuses' },
        { status: 500 }
      );
    }
    if (typesRes.error) {
      console.error('[Reference GET] Types error:', typesRes.error);
      return NextResponse.json(
        { error: 'Failed to fetch types' },
        { status: 500 }
      );
    }

    const priorities = prioritiesRes.data || [];
    const statuses = statusesRes.data || [];
    const types = typesRes.data || [];

    // Warn if reference tables are empty (migration may not have run)
    if (priorities.length === 0) {
      console.warn(
        '[Reference GET] task_priorities table is empty - migration 0098 may not have run'
      );
    }
    if (statuses.length === 0) {
      console.warn(
        '[Reference GET] task_statuses table is empty - migration 0098 may not have run'
      );
    }
    if (types.length === 0) {
      console.warn(
        '[Reference GET] task_types table is empty - migration 0098 may not have run'
      );
    }

    return NextResponse.json({
      priorities,
      statuses,
      types,
      success: true,
    });
  } catch (err: any) {
    console.error('[Reference GET] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
