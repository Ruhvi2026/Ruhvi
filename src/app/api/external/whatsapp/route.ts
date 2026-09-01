import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';

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
  if (!hasPermission(scopes, 'whatsapp', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/whatsapp
// Read WhatsApp integration status (Stub)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    {
      success: true,
      status: 'blocked',
      message:
        'WhatsApp Business API integration is currently pending business verification. This module is stubbed and not yet live.',
    },
    { status: 503 }
  ); // 503 Service Unavailable is appropriate for a blocked integration
}

// ---------------------------------------------------------------------------
// POST /api/external/whatsapp
// Send WhatsApp message (Stub)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    {
      error:
        'WhatsApp integration is blocked pending verification. Cannot dispatch messages.',
    },
    { status: 503 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/whatsapp
// Update WhatsApp configuration (Stub)
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    {
      error:
        'WhatsApp integration is blocked pending verification. Cannot update configuration.',
    },
    { status: 503 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/whatsapp
// Delete WhatsApp integration (Stub)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    {
      error:
        'WhatsApp integration is blocked pending verification. Cannot execute admin commands.',
    },
    { status: 503 }
  );
}
