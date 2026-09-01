import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  ApiKeyScope,
  VALID_SCOPE_SET,
} from '@/lib/api-keys';
import { logAuditEvent } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Admin-host guard — key creation/revocation is admin-panel-only.
// The Tech portal may list keys (GET) but must not mutate them.
// ---------------------------------------------------------------------------
function isAdminHost(req: NextRequest): boolean {
  const host = req.headers.get('host') || '';
  return (
    host === 'admin.ruhvi.in' ||
    host === 'localhost' ||
    host.startsWith('admin.localhost') ||
    host.startsWith('localhost:')
  );
}

// ---------------------------------------------------------------------------
// GET /api/admin/api-keys
// List all API keys (no hash returned, ever). Available to all admin roles
// across internal portals for viewing/tracking.
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
// Restricted to the Admin panel host.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isAdminHost(req)) {
    return NextResponse.json(
      {
        error:
          'API key generation is only available from the Admin panel. The Tech portal is read-only for API keys.',
      },
      { status: 403 }
    );
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
// DELETE /api/admin/api-keys?id=<keyId>[&force=true]
// Revoke an API key (sets revoked_at) OR permanently delete it (if force=true).
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isAdminHost(req)) {
    return NextResponse.json(
      {
        error:
          'API key management is only available from the Admin panel. The Tech portal is read-only for API keys.',
      },
      { status: 403 }
    );
  }

  const keyId = req.nextUrl.searchParams.get('id');
  const force = req.nextUrl.searchParams.get('force') === 'true';

  if (!keyId) {
    return NextResponse.json(
      { error: 'id query param is required' },
      { status: 400 }
    );
  }

  try {
    if (force) {
      await deleteApiKey(keyId);
      logAuditEvent({
        actorId: auth.uid,
        portal: 'admin',
        action: 'api_key.deleted',
        entityType: 'api_key',
        entityId: keyId,
      });
    } else {
      await revokeApiKey(keyId);
      logAuditEvent({
        actorId: auth.uid,
        portal: 'admin',
        action: 'api_key.revoked',
        entityType: 'api_key',
        entityId: keyId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`[api-keys DELETE force=${force}]`, err);
    return NextResponse.json(
      { error: `Failed to ${force ? 'delete' : 'revoke'} API key` },
      { status: 500 }
    );
  }
}
