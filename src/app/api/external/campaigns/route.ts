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
  if (!hasPermission(scopes, 'marketing_campaign', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/campaigns
// Read list of dispatched push campaigns
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
    data: campaigns,
    error,
    count,
  } = await supabase
    .from('push_campaigns')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[external/campaigns GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      campaigns: campaigns || [],
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/campaigns
// Dispatch a new push campaign (Admin only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `marketing` module is read-only for standard write keys. Requires Admin scope to dispatch campaigns.',
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

  const { title, message, target_url, image_url, audience } = body;

  if (!title || !message) {
    return NextResponse.json(
      { error: '`title` and `message` are required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();

  const { data: campaign, error } = await supabase
    .from('push_campaigns')
    .insert({
      title,
      message,
      target_url: target_url || null,
      image_url: image_url || null,
      audience: audience || 'All Users',
      status: 'Sent',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[external/campaigns POST] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch campaign: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_CAMPAIGN_DISPATCH',
    entityType: 'push_campaign',
    entityId: campaign.id,
    changes: { title, audience, apiKey: auth.keyId },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Campaign dispatched successfully',
      campaignId: campaign.id,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// PUT & DELETE /api/external/campaigns
// Blocked methods (Immutable ledger)
// ---------------------------------------------------------------------------
export async function PUT() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Dispatched push campaigns are immutable.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Method Not Allowed. Dispatched push campaigns cannot be recalled or deleted.',
    },
    { status: 405 }
  );
}
