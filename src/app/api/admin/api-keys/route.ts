import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  ApiKeyScope,
  VALID_SCOPE_SET,
} from '@/lib/api-keys';
import { logAuditEvent } from '@/lib/audit';

// ---------------------------------------------------------------------------
// GET /api/admin/api-keys
// List all API keys (no hash returned, ever).
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  } catch (err: any) {
    console.error('[api-keys GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/api-keys
// Create a new API key. Returns the raw key ONCE — never retrievable again.
// Body: { name: string; scopes: ApiKeyScope[] }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { name?: string; scopes?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, scopes } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return NextResponse.json(
      { error: 'at least one scope is required' },
      { status: 400 }
    );
  }

  const invalid = scopes.filter((s) => !VALID_SCOPE_SET.has(s));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Unknown scope(s): ${invalid.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const { record, rawKey } = await createApiKey({
      name: name.trim(),
      scopes: scopes as ApiKeyScope[],
      createdBy: auth.uid,
    });

    // Non-blocking audit log
    logAuditEvent({
      actorId: auth.uid,
      portal: 'admin',
      action: 'api_key.created',
      entityType: 'api_key',
      entityId: record.id,
      changes: { name: record.name, scopes: record.scopes },
    });

    return NextResponse.json({ record, rawKey }, { status: 201 });
  } catch (err: any) {
    console.error('[api-keys POST]', err);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/api-keys?id=<keyId>
// Revoke an API key (sets revoked_at, does not delete the row).
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const keyId = req.nextUrl.searchParams.get('id');
  if (!keyId) {
    return NextResponse.json(
      { error: 'id query param is required' },
      { status: 400 }
    );
  }

  try {
    await revokeApiKey(keyId);

    logAuditEvent({
      actorId: auth.uid,
      portal: 'admin',
      action: 'api_key.revoked',
      entityType: 'api_key',
      entityId: keyId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api-keys DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
