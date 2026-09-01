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
  if (!hasPermission(scopes, 'team_management', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/teams
// Read list of departments/teams with user counts
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

  // We query departments and join users to get the aggregate count of users per department
  const {
    data: departments,
    error,
    count,
  } = await supabase
    .from('departments')
    .select('*, users!department_id (id)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[external/teams GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  // Transform the response to include member_count and remove the raw users array
  const formattedDepartments = (departments || []).map((dept) => {
    const member_count = Array.isArray(dept.users) ? dept.users.length : 0;
    const { users, ...deptData } = dept;
    return { ...deptData, member_count };
  });

  return NextResponse.json(
    {
      success: true,
      teams: formattedDepartments,
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/teams
// Update department (Admin only)
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `teams` module is read-only for standard write keys. Requires Admin scope to modify teams.',
      },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const teamId = body.teamId as string | undefined;
  if (!teamId) {
    return NextResponse.json(
      { error: '`teamId` is required' },
      { status: 422 }
    );
  }

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 422 }
    );
  }

  updates.updated_at = new Date().toISOString();
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', teamId);

  if (error) {
    console.error('[external/teams PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update team: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_TEAM_UPDATE',
    entityType: 'department',
    entityId: teamId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Team updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/teams
// Create new department (Admin only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `teams` module is read-only for standard write keys. Requires Admin scope to create teams.',
      },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;
  if (!name) {
    return NextResponse.json({ error: '`name` is required' }, { status: 422 });
  }

  const supabase = getServiceClient();
  const { data: newTeam, error } = await supabase
    .from('departments')
    .insert({
      name: name.toLowerCase(),
      description: description || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[external/teams POST] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create team: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_TEAM_CREATE',
    entityType: 'department',
    entityId: newTeam.id,
    changes: { name, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Team created successfully', teamId: newTeam.id },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/teams
// Delete department (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `teams` module is read-only for standard write keys. Requires Admin scope to delete teams.',
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json(
      { error: '`teamId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('[external/teams DELETE] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete team: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_TEAM_DELETE',
    entityType: 'department',
    entityId: teamId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Team deleted successfully' },
    { status: 200 }
  );
}
