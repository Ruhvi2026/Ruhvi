import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { EmailOrchestrator } from '@/lib/email-orchestrator/service';

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cookieStore = await cookies();
  const supabase = getAdminClient(cookieStore);

  try {
    // 1. Try fetching from staff_profiles
    const { data: staffProfiles, error: staffError } = await supabase
      .from('staff_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (!staffError && staffProfiles && staffProfiles.length > 0) {
      return NextResponse.json({
        staff: staffProfiles.map((s) => ({
          id: s.id,
          legacy_user_id: s.legacy_user_id,
          employee_code: s.employee_code,
          full_name: `${s.first_name} ${s.last_name}`.trim(),
          email: s.work_email,
          phone: s.phone,
          role: s.role,
          department: s.department,
          department_id: s.department_id,
          allowed_portals: s.allowed_portals,
          is_active: s.is_active,
          created_at: s.created_at,
          updated_at: s.updated_at,
        })),
      });
    }

    // 2. Fallback to users table
    const { data: legacyUsers, error: userError } = await supabase
      .from('users')
      .select(
        'id, full_name, email, phone, role, department, department_id, employee_id, account_status, allowed_portals, created_at, updated_at'
      )
      .in('role', ['super_admin', 'admin', 'manager', 'staff'])
      .order('created_at', { ascending: true });

    if (userError) throw userError;

    return NextResponse.json({
      staff: (legacyUsers || []).map((u, idx) => ({
        id: u.id,
        legacy_user_id: u.id,
        employee_code:
          u.employee_id || `RHV-STF-${String(idx + 1).padStart(3, '0')}`,
        full_name: u.full_name || 'Staff Member',
        email: u.email,
        phone: u.phone,
        role: u.role,
        department: u.department || 'Support',
        department_id: u.department_id,
        allowed_portals: u.allowed_portals || ['admin', 'chat'],
        is_active:
          u.account_status !== 'disabled' && u.account_status !== 'suspended',
        created_at: u.created_at,
        updated_at: u.updated_at,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching staff list:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch staff members' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Only super_admin or admin can invite new staff
  if (auth.role !== 'super_admin' && auth.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can provision staff members' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      first_name,
      last_name = '',
      work_email,
      phone = '',
      department = 'Support',
      role = 'staff',
      allowed_portals = ['admin', 'chat'],
    } = body;

    if (!first_name || !work_email) {
      return NextResponse.json(
        { error: 'First name and work email are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = work_email.trim().toLowerCase();
    const cookieStore = await cookies();
    const supabase = getAdminClient(cookieStore);

    // Check if staff email already exists
    const { data: existingStaff } = await supabase
      .from('staff_profiles')
      .select('id, work_email')
      .eq('work_email', normalizedEmail)
      .maybeSingle();

    if (existingStaff) {
      return NextResponse.json(
        { error: 'A staff member with this work email already exists' },
        { status: 409 }
      );
    }

    // Generate unique employee code
    const { count: staffCount } = await supabase
      .from('staff_profiles')
      .select('*', { count: 'exact', head: true });

    const empCode = `RHV-STF-${String((staffCount || 0) + 1).padStart(3, '0')}`;
    const invitationToken = `inv_${crypto.randomUUID().replace(/-/g, '')}`;

    // Insert new staff profile
    const { data: newStaff, error: insertError } = await supabase
      .from('staff_profiles')
      .insert({
        employee_code: empCode,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        work_email: normalizedEmail,
        phone: phone.trim() || null,
        department: department.trim(),
        role: role,
        allowed_portals: allowed_portals,
        is_active: true,
        invited_by: auth.uid,
        invitation_token: invitationToken,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting staff profile:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to create staff profile' },
        { status: 500 }
      );
    }

    // Send invitation email via EmailOrchestrator
    try {
      await EmailOrchestrator.send({
        category: 'internal_staff',
        eventKey: `staff_invite_${empCode}_${Date.now()}`,
        eventType: 'staff_invitation',
        recipientEmail: normalizedEmail,
        recipientName: `${first_name} ${last_name}`.trim(),
        subject: `Welcome to the Ruhvi Team - Staff Invitation (#${empCode})`,
        variables: {
          employee_code: empCode,
          department: department,
          role: role,
          login_url: 'https://ruhvi.in/admin',
          note: 'Your staff account has been provisioned by system administration. Please contact your administrator for initial access setup.',
        },
      });
    } catch (emailErr) {
      console.error('Failed to send staff invitation email:', emailErr);
      // Non-blocking for the DB record
    }

    return NextResponse.json({
      success: true,
      staff: newStaff,
      message: `Staff member ${empCode} provisioned successfully`,
    });
  } catch (err: any) {
    console.error('Staff creation failed:', err);
    return NextResponse.json(
      { error: err.message || 'Staff provisioning failed' },
      { status: 500 }
    );
  }
}
