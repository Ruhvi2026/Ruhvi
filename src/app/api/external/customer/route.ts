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
  if (!hasPermission(scopes, 'customer', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/customer
// Read customer profiles and order history
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();

  if (customerId) {
    // Detail/History mode
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        'id, first_name, last_name, email, phone, role, account_status, tags, segments, created_at'
      )
      .eq('id', customerId)
      .eq('role', 'customer')
      .maybeSingle();

    if (userError) {
      console.error('[external/customer GET] Detail error:', userError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch basic order history for the customer
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, total, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false });

    return NextResponse.json(
      {
        success: true,
        customer: { ...user, order_history: orders || [] },
      },
      { status: 200 }
    );
  } else {
    // List mode
    const offset = (page - 1) * limit;
    const {
      data: users,
      error,
      count,
    } = await supabase
      .from('users')
      .select(
        'id, first_name, last_name, email, phone, role, account_status, tags, segments, created_at',
        { count: 'exact' }
      )
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[external/customer GET] List error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        customers: users || [],
        pagination: { page, limit, total: count || 0 },
      },
      { status: 200 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/external/customer
// Update tags, segments, ban, merge (Admin)
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

  const customerId = body.customerId as string | undefined;
  const action = body.action as string | undefined;

  if (!customerId) {
    return NextResponse.json(
      { error: '`customerId` is required' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const isAdmin = hasPermission(auth.scopes, 'customer', 'admin');

  // Admin Actions: Ban / Merge
  if (action === 'ban') {
    if (!isAdmin)
      return NextResponse.json(
        { error: 'Forbidden: `ban` action requires Admin scope' },
        { status: 403 }
      );

    const { error: banError } = await supabase
      .from('users')
      .update({ account_status: 'suspended' })
      .eq('id', customerId);

    if (banError) {
      console.error('[external/customer PUT] Ban error:', banError);
      return NextResponse.json(
        { error: 'Failed to ban customer' },
        { status: 500 }
      );
    }

    await logAuditEvent({
      portal: 'admin',
      action: 'EXTERNAL_API_CUSTOMER_BAN',
      entityType: 'user',
      entityId: customerId,
      changes: { apiKey: auth.keyId },
    });
    return NextResponse.json(
      { success: true, message: 'Customer banned successfully' },
      { status: 200 }
    );
  }

  if (action === 'merge') {
    if (!isAdmin)
      return NextResponse.json(
        { error: 'Forbidden: `merge` action requires Admin scope' },
        { status: 403 }
      );
    const targetUserId = body.targetUserId as string | undefined;
    if (!targetUserId)
      return NextResponse.json(
        { error: '`targetUserId` is required for merge action' },
        { status: 422 }
      );

    // Move orders
    const { error: moveOrdersError } = await supabase
      .from('orders')
      .update({ user_id: targetUserId })
      .eq('user_id', customerId);

    // Move addresses
    const { error: moveAddressesError } = await supabase
      .from('addresses')
      .update({ user_id: targetUserId })
      .eq('user_id', customerId);

    // Note: Wallets/Rewards require complex RPC merges if they have balances, but for a basic merge API we simply disable the source account
    const { error: disableError } = await supabase
      .from('users')
      .update({
        account_status: 'disabled',
        email: `merged_${Date.now()}_${customerId}@deleted.local`,
      })
      .eq('id', customerId);

    if (moveOrdersError || moveAddressesError || disableError) {
      console.error('[external/customer PUT] Merge partial failure:', {
        moveOrdersError,
        moveAddressesError,
        disableError,
      });
      return NextResponse.json(
        { error: 'Failed to cleanly merge customer accounts' },
        { status: 500 }
      );
    }

    await logAuditEvent({
      portal: 'admin',
      action: 'EXTERNAL_API_CUSTOMER_MERGE',
      entityType: 'user',
      entityId: targetUserId,
      changes: { mergedFrom: customerId, apiKey: auth.keyId },
    });
    return NextResponse.json(
      { success: true, message: 'Customer merged successfully' },
      { status: 200 }
    );
  }

  // Standard Write Actions: Tags / Segments
  const updates: Record<string, any> = {};
  if (Array.isArray(body.tags)) updates.tags = body.tags;
  if (Array.isArray(body.segments)) updates.segments = body.segments;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields (tags, segments) provided to update' },
      { status: 422 }
    );
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', customerId);

  if (updateError) {
    console.error('[external/customer PUT] Update error:', updateError);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_CUSTOMER_UPDATE',
    entityType: 'user',
    entityId: customerId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Customer tags/segments updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/customer
// Delete customer (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json(
      { error: '`customerId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  // Perform soft delete to maintain order references
  const { error } = await supabase
    .from('users')
    .update({ account_status: 'disabled' })
    .eq('id', customerId);

  if (error) {
    console.error('[external/customer DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to soft delete customer' },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_CUSTOMER_DELETE',
    entityType: 'user',
    entityId: customerId,
    changes: { type: 'soft_delete', apiKey: auth.keyId },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Customer softly deleted (disabled) successfully',
    },
    { status: 200 }
  );
}
