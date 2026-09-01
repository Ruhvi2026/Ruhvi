import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { executeRefund } from '@/lib/orders/refund';
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
  if (!hasPermission(scopes, 'payment', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/payment
// Read transaction status/detail per order.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json(
      { error: '`orderId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, user_id, total, prepaid_amount, cod_balance, payment_status, payment_method, phonepe_merchant_transaction_id, phonepe_transaction_id, phonepe_payment_state'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[external/payment GET] Supabase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      success: true,
      payment: order,
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/external/payment
// Routes to PUT logic to satisfy API testing requirements seamlessly.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  return PUT(req);
}

// ---------------------------------------------------------------------------
// PUT /api/external/payment
// Handle non-balance writes (gateway sync) or Admin refunds/voids.
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderId = body.orderId as string | undefined;
  const action = body.action as string | undefined;

  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json(
      { error: '`orderId` is required' },
      { status: 422 }
    );
  }
  if (!action || typeof action !== 'string') {
    return NextResponse.json(
      {
        error: '`action` is required ("refund", "void", or "update_reference")',
      },
      { status: 422 }
    );
  }

  const isAdmin = hasPermission(auth.scopes, 'payment', 'admin');

  // Handle Admin-only actions (refund/void)
  if (action === 'refund' || action === 'void') {
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: action requires admin scope' },
        { status: 403 }
      );
    }

    const method = (body.method as string) || 'original_payment';
    const amount = body.amount ? Number(body.amount) : undefined;
    const reason =
      (body.reason as string) || `Triggered via External API (${auth.keyName})`;

    if (method !== 'original_payment' && method !== 'wallet') {
      return NextResponse.json(
        { error: '`method` must be "original_payment" or "wallet"' },
        { status: 422 }
      );
    }

    const result = await executeRefund({
      orderId,
      method: method as 'original_payment' | 'wallet',
      amount,
      reason,
      performedBy: auth.keyId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Refund failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.alreadyRefunded
          ? 'Already refunded'
          : 'Refund processed successfully',
        refundedAmount: result.amount,
      },
      { status: 200 }
    );
  }

  // Handle non-admin writes (update_reference for gateways)
  if (action === 'update_reference') {
    // Allows updating gateway reference IDs without affecting total/balances
    const updates: Record<string, any> = {};
    if (typeof body.phonepe_transaction_id === 'string')
      updates.phonepe_transaction_id = body.phonepe_transaction_id;
    if (typeof body.phonepe_payment_state === 'string')
      updates.phonepe_payment_state = body.phonepe_payment_state;
    if (typeof body.phonepe_merchant_transaction_id === 'string')
      updates.phonepe_merchant_transaction_id =
        body.phonepe_merchant_transaction_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No reference fields provided to update' },
        { status: 422 }
      );
    }

    const supabase = getServiceClient();

    const { error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (updateError) {
      console.error('[external/payment PUT] Supabase error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reference fields' },
        { status: 500 }
      );
    }

    // Audit the reference update
    await logAuditEvent({
      portal: 'orders',
      action: 'PAYMENT_REFERENCE_UPDATED',
      entityType: 'order',
      entityId: orderId,
      changes: {
        updates,
        apiKey: auth.keyId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment reference fields updated successfully',
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { error: 'Unknown action specified' },
    { status: 422 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/payment
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json(
    {
      error:
        'DELETE is not supported on the payment resource (use PUT with action "void" instead)',
    },
    { status: 405 }
  );
}
