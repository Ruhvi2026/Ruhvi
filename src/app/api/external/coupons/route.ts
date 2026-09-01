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
  if (!hasPermission(scopes, 'coupons', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/coupons
// Read active coupons (Admin sees all)
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
  const isAdmin = hasPermission(auth.scopes, 'coupons', 'admin');
  const offset = (page - 1) * limit;

  let query = supabase.from('coupons').select('*', { count: 'exact' });

  if (!isAdmin) {
    // Non-admin scopes only see active, non-expired coupons
    query = query
      .eq('active', true)
      .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`);
  }

  const {
    data: coupons,
    error,
    count,
  } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[external/coupons GET] List error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      coupons: coupons || [],
      pagination: { page, limit, total: count || 0 },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/external/coupons
// Update expiry/usage limits. (Admin can update all fields)
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

  const couponId = body.couponId as string | undefined;
  if (!couponId) {
    return NextResponse.json(
      { error: '`couponId` is required' },
      { status: 422 }
    );
  }

  const isAdmin = hasPermission(auth.scopes, 'coupons', 'admin');

  // Allowed fields for standard write
  const standardAllowed = [
    'expiry_date',
    'usage_limit_total',
    'usage_limit_per_user',
    'active',
    'is_public',
    'target_users',
  ];
  // Extended fields for admin
  const adminAllowed = [
    ...standardAllowed,
    'code',
    'discount_type',
    'discount_value',
    'min_order_value',
    'applicable_to',
    'cod_charge_waiver',
  ];

  const allowedFields = isAdmin ? adminAllowed : standardAllowed;
  const updates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Reject if standard key tries to update admin-only fields
  if (!isAdmin) {
    const adminOnlyFields = [
      'code',
      'discount_type',
      'discount_value',
      'min_order_value',
      'applicable_to',
      'cod_charge_waiver',
    ];
    const attemptedAdminFields = adminOnlyFields.filter(
      (f) => body[f] !== undefined
    );
    if (attemptedAdminFields.length > 0) {
      return NextResponse.json(
        {
          error: `Forbidden: Standard write keys cannot update financial/core fields (${attemptedAdminFields.join(', ')}). Requires Admin scope.`,
        },
        { status: 403 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields provided to update' },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', couponId);

  if (error) {
    console.error('[external/coupons PUT] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_COUPON_UPDATE',
    entityType: 'coupon',
    entityId: couponId,
    changes: { updates, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Coupon updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/coupons
// Create new coupon (Admin only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.code || !body.discount_type || body.discount_value === undefined) {
    return NextResponse.json(
      { error: '`code`, `discount_type`, and `discount_value` are required' },
      { status: 422 }
    );
  }

  const insertData = {
    code: body.code.toUpperCase(),
    discount_type: body.discount_type,
    discount_value: body.discount_value,
    min_order_value: body.min_order_value || 0,
    usage_limit_total: body.usage_limit_total || null,
    usage_limit_per_user: body.usage_limit_per_user || 1,
    applicable_to: body.applicable_to || 'all',
    expiry_date: body.expiry_date || null,
    cod_charge_waiver: body.cod_charge_waiver || false,
    active: body.active !== undefined ? body.active : true,
    is_public: body.is_public !== undefined ? body.is_public : true,
    target_users: body.target_users || null,
  };

  const supabase = getServiceClient();
  const { data: coupon, error: insertError } = await supabase
    .from('coupons')
    .insert(insertData)
    .select('id')
    .single();

  if (insertError) {
    console.error('[external/coupons POST] Insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create coupon: ' + insertError.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_COUPON_CREATE',
    entityType: 'coupon',
    entityId: coupon.id,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    {
      success: true,
      message: 'Coupon created successfully',
      couponId: coupon.id,
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/coupons
// Delete coupon (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const couponId = searchParams.get('couponId');

  if (!couponId) {
    return NextResponse.json(
      { error: '`couponId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from('coupons').delete().eq('id', couponId);

  if (error) {
    console.error('[external/coupons DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_COUPON_DELETE',
    entityType: 'coupon',
    entityId: couponId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Coupon deleted successfully' },
    { status: 200 }
  );
}
