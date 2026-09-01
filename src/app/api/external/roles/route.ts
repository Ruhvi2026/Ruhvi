import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

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
  if (!hasPermission(scopes, 'roles', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/roles
// Read list of roles and associated permissions
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  const {
    data: roles,
    error,
    count,
  } = await supabase
    .from('roles')
    .select(
      `
      *,
      role_permissions ( permission )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[external/roles GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  // Format response to flatten role_permissions
  const formattedRoles = (roles || []).map((role) => ({
    ...role,
    permissions: role.role_permissions.map((rp: any) => rp.permission),
  }));

  // Clean up original relation key
  formattedRoles.forEach((r) => delete (r as any).role_permissions);

  return NextResponse.json(
    {
      success: true,
      roles: formattedRoles,
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/roles
// Sync role permissions
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

  const roleId = body.roleId as string | undefined;
  const permissions = body.permissions as string[] | undefined;

  if (!roleId || !Array.isArray(permissions)) {
    return NextResponse.json(
      { error: '`roleId` and `permissions` array are required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  // 1. Fetch role to verify it exists and check for SUPER_ADMIN protection
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .maybeSingle();

  if (roleError || !roleData) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  if (roleData.name === 'SUPER_ADMIN') {
    return NextResponse.json(
      {
        error:
          'Forbidden: SUPER_ADMIN role permissions cannot be modified via external API',
      },
      { status: 403 }
    );
  }

  // 2. Destructive replacement strategy: delete all existing, insert new
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId);

  if (deleteError) {
    console.error(
      '[external/roles PUT] Delete old permissions error:',
      deleteError
    );
    return NextResponse.json(
      { error: 'Failed to clear old permissions' },
      { status: 500 }
    );
  }

  if (permissions.length > 0) {
    const insertPayload = permissions.map((perm) => ({
      role_id: roleId,
      permission: perm,
    }));

    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(insertPayload);

    if (insertError) {
      console.error(
        '[external/roles PUT] Insert new permissions error:',
        insertError
      );
      return NextResponse.json(
        { error: 'Failed to insert new permissions' },
        { status: 500 }
      );
    }
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_ROLE_PERMS_UPDATE',
    entityType: 'role',
    entityId: roleId,
    changes: { permissions, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Role permissions synced successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/roles
// Create new role (Admin only)
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

  const { name, display_name, description, department_id, permissions } = body;

  if (!name || !display_name) {
    return NextResponse.json(
      { error: '`name` and `display_name` are required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  const { data: newRole, error: insertError } = await supabase
    .from('roles')
    .insert({
      name: name.toUpperCase(),
      display_name,
      description: description || null,
      department_id: department_id || null,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[external/roles POST] Create error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create role: ' + insertError.message },
      { status: 500 }
    );
  }

  // Optionally seed permissions if provided
  if (Array.isArray(permissions) && permissions.length > 0) {
    const permPayload = permissions.map((perm) => ({
      role_id: newRole.id,
      permission: perm,
    }));
    await supabase.from('role_permissions').insert(permPayload);
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_ROLE_CREATE',
    entityType: 'role',
    entityId: newRole.id,
    changes: { name, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Role created successfully', roleId: newRole.id },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/roles
// Delete role (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return NextResponse.json(
      { error: '`roleId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Check for system role protection
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .maybeSingle();

  if (roleError || !roleData) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  if (roleData.name === 'SUPER_ADMIN' || roleData.name === 'ADMIN') {
    return NextResponse.json(
      {
        error: `Forbidden: Critical system role '${roleData.name}' cannot be deleted`,
      },
      { status: 403 }
    );
  }

  const { error } = await supabase.from('roles').delete().eq('id', roleId);

  if (error) {
    console.error('[external/roles DELETE] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete role: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_ROLE_DELETE',
    entityType: 'role',
    entityId: roleId,
    changes: { name: roleData.name, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Role deleted successfully' },
    { status: 200 }
  );
}
