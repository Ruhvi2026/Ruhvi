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
  if (!hasPermission(scopes, 'website_management', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/website
// Read global settings and store configurations
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getServiceClient();
  const isAdmin = hasPermission(auth.scopes, 'website_management', 'admin');

  // Fetch from both configuration tables
  const [
    { data: storeSettings, error: storeError },
    { data: globalSettings, error: globalError },
  ] = await Promise.all([
    supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle(),
    supabase.from('settings').select('*'),
  ]);

  if (storeError || globalError) {
    console.error('[external/website GET] Error:', storeError, globalError);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  let formattedGlobalSettings = globalSettings || [];

  // Security Masking: If the key is not an Admin, we mask sensitive keys like `ai_providers`
  if (!isAdmin) {
    formattedGlobalSettings = formattedGlobalSettings.map((setting) => {
      if (setting.key.includes('provider') || setting.key.includes('keys')) {
        return {
          ...setting,
          value: {
            __masked__: 'Requires `website:admin` scope to view this payload',
          },
        };
      }
      return setting;
    });
  }

  // Convert array of K/V rows into a structured object map
  const mappedSettings = formattedGlobalSettings.reduce(
    (acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    },
    {} as Record<string, any>
  );

  return NextResponse.json(
    {
      success: true,
      website: {
        store: storeSettings || {},
        configs: mappedSettings,
      },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/website
// Update global configs (Admin only)
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `website` module is read-only for standard write keys. Requires Admin scope to update global settings.',
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

  const storeUpdates = body.store as Record<string, any> | undefined;
  const configUpdates = body.configs as Record<string, any> | undefined;

  if (!storeUpdates && !configUpdates) {
    return NextResponse.json(
      {
        error:
          'No valid update fields provided. Requires `store` or `configs` payload.',
      },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  let updatedStore = false;
  let updatedConfigs = false;

  // 1. Update store_settings
  if (storeUpdates && Object.keys(storeUpdates).length > 0) {
    const { error: storeError } = await supabase
      .from('store_settings')
      .update(storeUpdates)
      .eq('id', 'global');

    if (storeError) {
      console.error('[external/website PUT] Store Settings error:', storeError);
      return NextResponse.json(
        { error: 'Failed to update store settings: ' + storeError.message },
        { status: 500 }
      );
    }
    updatedStore = true;
  }

  // 2. Update dynamic global settings
  if (configUpdates && Object.keys(configUpdates).length > 0) {
    // We iterate the keys to upsert them into the settings table
    const promises = Object.entries(configUpdates).map(async ([key, value]) => {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    });

    try {
      await Promise.all(promises);
      updatedConfigs = true;
    } catch (err: any) {
      console.error('[external/website PUT] Global Settings error:', err);
      return NextResponse.json(
        { error: 'Failed to update global configurations: ' + err.message },
        { status: 500 }
      );
    }
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_WEBSITE_UPDATE',
    entityType: 'settings',
    entityId: 'global',
    changes: {
      storeUpdates,
      configsUpdatedKeys: configUpdates ? Object.keys(configUpdates) : [],
      apiKey: auth.keyId,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Global settings updated successfully',
      updatedStore,
      updatedConfigs,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST & DELETE /api/external/website
// Blocked methods
// ---------------------------------------------------------------------------
export async function POST() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Global settings must be updated via PUT.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Deleting global settings is forbidden.' },
    { status: 405 }
  );
}
