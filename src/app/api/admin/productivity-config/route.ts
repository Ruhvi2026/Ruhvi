import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { cookies } from 'next/headers';

/**
 * GET  /api/admin/productivity-config
 *   Returns the current super_admin_productivity_config from the settings table.
 *
 * PATCH /api/admin/productivity-config
 *   Updates the config. Requires super_admin role.
 *   Body: { config: { negligence_threshold_days: number, designation_kpis: {...} } }
 */

async function getSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCallerRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;

  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded?.sub) return null;

  const supabase = await getSupabaseServiceClient();
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', decoded.sub)
    .maybeSingle();

  return data?.role ?? null;
}

export async function GET() {
  try {
    // Any admin-level user can read config
    const role = await getCallerRole();
    if (!role || !['super_admin', 'admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'super_admin_productivity_config')
      .maybeSingle();

    if (error) {
      console.error('[productivity-config GET]', error);
      return NextResponse.json(
        { error: 'Failed to load config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data?.value ?? null });
  } catch (err) {
    console.error('[productivity-config GET]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Only super_admin can write config
    const role = await getCallerRole();
    if (role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden — super_admin only' },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body?.config || typeof body.config !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { config: {...} }' },
        { status: 400 }
      );
    }

    // Validate negligence_threshold_days
    const { config } = body;
    if (
      config.negligence_threshold_days !== undefined &&
      (typeof config.negligence_threshold_days !== 'number' ||
        config.negligence_threshold_days < 1 ||
        config.negligence_threshold_days > 365)
    ) {
      return NextResponse.json(
        { error: 'negligence_threshold_days must be between 1 and 365' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServiceClient();
    const { error } = await supabase
      .from('settings')
      .upsert(
        { key: 'super_admin_productivity_config', value: config },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[productivity-config PATCH]', error);
      return NextResponse.json(
        { error: 'Failed to save config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[productivity-config PATCH]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
