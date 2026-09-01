import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Helper to generate a secure random password
// ---------------------------------------------------------------------------
function generateSecurePassword(length = 16) {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let password = '';
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
}

// ---------------------------------------------------------------------------
// Helper to authenticate request and check scopes
// ---------------------------------------------------------------------------
async function getAuthenticatedKey(
  req: NextRequest,
  minLevel: 'read' | 'write' | 'admin'
) {
  const rawKey = extractBearerToken(req.headers.get('authorization'));
  if (!rawKey) {
    return { error: 'Unauthorized', status: 401 };
  }

  const keyHash = hashApiKey(rawKey);
  const supabaseAuth = getServiceClient();
  const { data: keyRow } = await supabaseAuth
    .from('api_keys')
    .select('id, name, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return { error: 'Unauthorized', status: 401 };
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  if (!hasPermission(scopes, 'users', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/users
// Read list of users, filterable by role and department
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const roleId = searchParams.get('roleId');
  const departmentId = searchParams.get('departmentId');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select(
      'id, full_name, email, phone, role, role_id, department_id, employee_id, account_status, allowed_portals, created_at, updated_at',
      { count: 'exact' }
    );

  // Only fetch staff/admin users (exclude 'customer')
  query = query.neq('role', 'customer');

  if (role) {
    query = query.eq('role', role);
  }
  if (roleId) {
    query = query.eq('role_id', roleId);
  }
  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const {
    data: users,
    error,
    count,
  } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[external/users GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      users: users || [],
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/users
// Update user roles/departments
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body.userId as string | undefined;
  if (!userId) {
    return NextResponse.json(
      { error: '`userId` is required' },
      { status: 422 }
    );
  }

  const isAdmin = hasPermission(auth.scopes, 'users', 'admin');
  const supabase = getServiceClient();

  // Protect SUPER_ADMIN elevation
  if ((body.role === 'super_admin' || body.role === 'admin') && !isAdmin) {
    return NextResponse.json(
      {
        error:
          'Forbidden: standard `write` keys cannot assign `admin` or `super_admin` roles. Requires Admin scope.',
      },
      { status: 403 }
    );
  }

  // Prevent tampering with existing SUPER_ADMIN users if caller is not Admin
  if (!isAdmin) {
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    if (
      targetUser &&
      (targetUser.role === 'super_admin' || targetUser.role === 'admin')
    ) {
      return NextResponse.json(
        {
          error:
            'Forbidden: standard `write` keys cannot modify existing Admin/Super Admin users.',
        },
        { status: 403 }
      );
    }
  }

  const updates: Record<string, any> = {};
  if (body.role !== undefined) updates.role = body.role;
  if (body.role_id !== undefined) updates.role_id = body.role_id;
  if (body.department_id !== undefined)
    updates.department_id = body.department_id;
  if (body.employee_id !== undefined) updates.employee_id = body.employee_id;
  if (body.allowed_portals !== undefined)
    updates.allowed_portals = body.allowed_portals;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 422 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('[external/users PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update user: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_USER_UPDATE',
    entityType: 'user',
    entityId: userId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'User updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/users
// Create staff user (Admin only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    email,
    full_name,
    phone,
    role,
    role_id,
    department_id,
    employee_id,
    allowed_portals,
  } = body;

  if (!email || !full_name) {
    return NextResponse.json(
      { error: '`email` and `full_name` are required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  // Create auth user with random secure password
  const randomPassword = generateSecurePassword();
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

  if (authError || !authUser.user) {
    console.error('[external/users POST] Auth Create error:', authError);
    return NextResponse.json(
      { error: 'Failed to provision auth account: ' + authError?.message },
      { status: 500 }
    );
  }

  const newUserId = authUser.user.id;

  // The database trigger will have auto-created the `users` row.
  // Now we update it with the staff assignments.
  const updates: Record<string, any> = {
    role: role || 'staff',
    updated_at: new Date().toISOString(),
  };

  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;
  if (role_id !== undefined) updates.role_id = role_id;
  if (department_id !== undefined) updates.department_id = department_id;
  if (employee_id !== undefined) updates.employee_id = employee_id;
  if (allowed_portals !== undefined) updates.allowed_portals = allowed_portals;

  const { error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', newUserId);

  if (updateError) {
    console.error(
      '[external/users POST] User profile update error:',
      updateError
    );
    return NextResponse.json(
      {
        error:
          'Account created but failed to assign roles: ' + updateError.message,
      },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_USER_CREATE',
    entityType: 'user',
    entityId: newUserId,
    changes: { email, role: updates.role, apiKey: auth.keyId },
  });

  // Expose the temporary password once so the external integration can email it or use it
  return NextResponse.json(
    {
      success: true,
      message: 'Staff user provisioned successfully',
      userId: newUserId,
      temporary_password: randomPassword,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/users
// Revoke access (soft delete via account_status) (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: '`userId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Check target user to prevent revoking SUPER_ADMIN (manual override required)
  const { data: targetUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (targetUser && targetUser.role === 'super_admin') {
    return NextResponse.json(
      {
        error:
          'Forbidden: SUPER_ADMIN access cannot be revoked via external API for safety reasons.',
      },
      { status: 403 }
    );
  }

  // Revoke access by updating account_status (and optionally clearing roles to be safe)
  const { error } = await supabase
    .from('users')
    .update({
      account_status: 'disabled',
      allowed_portals: [],
    })
    .eq('id', userId);

  if (error) {
    console.error('[external/users DELETE] Revoke error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke user access: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_USER_REVOKE',
    entityType: 'user',
    entityId: userId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'User access revoked successfully' },
    { status: 200 }
  );
}
