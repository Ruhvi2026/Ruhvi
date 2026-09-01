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
  if (!hasPermission(scopes, 'push_notifications', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/push
// Read list of push notifications
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
    data: pushes,
    error,
    count,
  } = await supabase
    .from('push_campaigns')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[external/push GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      pushes: pushes || [],
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/push
// Schedule a new push notification (Write / Admin)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
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

  const { title, message, target_url, image_url, audience } = body;

  if (!title || !message) {
    return NextResponse.json(
      { error: '`title` and `message` are required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  const { data: pushData, error } = await supabase
    .from('push_campaigns')
    .insert({
      title,
      message,
      target_url: target_url || null,
      image_url: image_url || null,
      audience: audience || 'All Users',
      status: 'Scheduled',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[external/push POST] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule push notification: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_PUSH_SCHEDULED',
    entityType: 'push_campaign',
    entityId: pushData.id,
    changes: { title, audience, apiKey: auth.keyId },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Push notification scheduled successfully',
      pushId: pushData.id,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/push
// Cancel a scheduled push notification or manage audience (Admin only)
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: standard `write` keys cannot modify scheduled notifications. Requires Admin scope to cancel or update pushes.',
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

  const pushId = body.pushId as string | undefined;
  if (!pushId) {
    return NextResponse.json(
      { error: '`pushId` is required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  // Prevent modifying already-sent campaigns
  const { data: existingPush } = await supabase
    .from('push_campaigns')
    .select('status')
    .eq('id', pushId)
    .single();

  if (existingPush && existingPush.status === 'Sent') {
    return NextResponse.json(
      {
        error: 'Cannot modify a push notification that has already been Sent.',
      },
      { status: 409 }
    );
  }

  const updates: Record<string, any> = {};
  if (body.action === 'cancel') {
    updates.status = 'Cancelled';
  } else if (body.audience !== undefined) {
    updates.audience = body.audience;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        error:
          'No valid update fields provided (use action: `cancel` or update `audience`)',
      },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('push_campaigns')
    .update(updates)
    .eq('id', pushId);

  if (error) {
    console.error('[external/push PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update push notification: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action:
      updates.status === 'Cancelled'
        ? 'EXTERNAL_API_PUSH_CANCELLED'
        : 'EXTERNAL_API_PUSH_UPDATED',
    entityType: 'push_campaign',
    entityId: pushId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Push notification updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/push
// Blocked method
// ---------------------------------------------------------------------------
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Method Not Allowed. Push notification history is immutable. Use PUT to cancel a scheduled notification instead.',
    },
    { status: 405 }
  );
}
