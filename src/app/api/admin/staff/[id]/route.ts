import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getAdminClient(cookieStore: any) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  return createServerClient(
    supabaseUrl,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.role !== 'super_admin' && auth.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can modify staff members' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: 'Staff ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { is_active, role, department, allowed_portals } = body;

    const cookieStore = await cookies();
    const supabase = getAdminClient(cookieStore);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
    if (role) updatePayload.role = role;
    if (department) updatePayload.department = department;
    if (allowed_portals) updatePayload.allowed_portals = allowed_portals;

    // Try updating staff_profiles
    const { data: updatedStaff, error: staffErr } = await supabase
      .from('staff_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!staffErr && updatedStaff) {
      // Also sync account_status on legacy users table if legacy_user_id exists
      if (updatedStaff.legacy_user_id && typeof is_active === 'boolean') {
        await supabase
          .from('users')
          .update({
            account_status: is_active ? 'active' : 'disabled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedStaff.legacy_user_id);
      }

      return NextResponse.json({ success: true, staff: updatedStaff });
    }

    // Fallback: If not in staff_profiles, update legacy users table
    const legacyPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof is_active === 'boolean') {
      legacyPayload.account_status = is_active ? 'active' : 'disabled';
    }
    if (role) legacyPayload.role = role;
    if (department) legacyPayload.department = department;
    if (allowed_portals) legacyPayload.allowed_portals = allowed_portals;

    const { data: updatedUser, error: userErr } = await supabase
      .from('users')
      .update(legacyPayload)
      .eq('id', id)
      .select()
      .single();

    if (userErr) throw userErr;

    return NextResponse.json({ success: true, staff: updatedUser });
  } catch (err: any) {
    console.error('Error updating staff member:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update staff member' },
      { status: 500 }
    );
  }
}
