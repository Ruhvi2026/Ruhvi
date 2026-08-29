import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

/**
 * /api/support/sla-config
 * GET  — list the per-priority SLA target hours (staff+)
 * PUT  — update target_hours (admin only) — editable without a code deploy
 *
 * Backs spec §4.4: the SLA table, not a hardcoded constant, drives sla_due_at.
 */

async function getSupabaseAdmin(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

async function getCurrentUser(cookieStore: any) {
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await verifySessionToken(sessionCookie);
    const uid = decoded?.sub;
    if (!uid) return null;
    const supabase = await getSupabaseAdmin(cookieStore);
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', uid)
      .maybeSingle();
    return user;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = [
      'admin',
      'manager',
      'staff',
      'super_admin',
      'SUPER_ADMIN',
    ].includes(user.role);
    if (!isStaff)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = await getSupabaseAdmin(cookieStore);
    const { data, error } = await supabase
      .from('support_sla_config')
      .select('priority, target_hours, updated_at, updated_by_staff_id')
      .order('priority');

    if (error)
      return NextResponse.json(
        { error: 'Failed to load SLA config' },
        { status: 500 }
      );
    return NextResponse.json({ config: data || [] });
  } catch (err: any) {
    console.error('SLA config GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = ['admin', 'super_admin', 'SUPER_ADMIN'].includes(user.role);
    if (!isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { config } = body;

    if (!config || !Array.isArray(config)) {
      return NextResponse.json(
        { error: 'config array required' },
        { status: 400 }
      );
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    for (const entry of config) {
      if (!validPriorities.includes(entry.priority)) {
        return NextResponse.json(
          { error: `Invalid priority: ${entry.priority}` },
          { status: 400 }
        );
      }
      const hours = Number(entry.target_hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 30) {
        return NextResponse.json(
          { error: `Invalid target_hours for ${entry.priority}` },
          { status: 400 }
        );
      }
    }

    const supabase = await getSupabaseAdmin(cookieStore);
    const now = new Date().toISOString();

    for (const entry of config) {
      const { error } = await supabase.from('support_sla_config').upsert(
        {
          priority: entry.priority,
          target_hours: Number(entry.target_hours),
          updated_at: now,
          updated_by_staff_id: user.id,
        },
        { onConflict: 'priority' }
      );
      if (error) {
        console.error('SLA config upsert error:', error);
        return NextResponse.json(
          { error: 'Failed to save SLA config' },
          { status: 500 }
        );
      }
    }

    // SLA config changes are tracked via updated_at / updated_by_staff_id on the
    // config rows themselves (no ticket-level audit row exists for this).

    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    console.error('SLA config PUT error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
