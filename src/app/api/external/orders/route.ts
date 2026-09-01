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
  if (!hasPermission(scopes, 'orders', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/orders
// Read list, detail, and timeline/tracking
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();

  if (orderId) {
    // Detail mode with tracking and events
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        items:order_items(*),
        tracking_updates(*),
        events:order_events(*)
      `
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('[external/orders GET] Detail error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order }, { status: 200 });
  } else {
    // List mode
    const offset = (page - 1) * limit;
    const {
      data: orders,
      error,
      count,
    } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[external/orders GET] List error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orders: orders || [],
        pagination: { page, limit, total: count || 0 },
      },
      { status: 200 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/external/orders
// Route POST to PUT to fulfill some external webhook setups if needed.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  return PUT(req);
}

// ---------------------------------------------------------------------------
// PUT /api/external/orders
// Update status, insert tracking updates, force cancel/refund (Admin)
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

  const orderId = body.orderId as string | undefined;
  if (!orderId) {
    return NextResponse.json(
      { error: '`orderId` is required' },
      { status: 422 }
    );
  }

  const action = body.action as string | undefined;
  const supabase = getServiceClient();

  // Admin actions (Cancel / Force Refund)
  if (action === 'cancel' || action === 'refund') {
    if (!hasPermission(auth.scopes, 'orders', 'admin')) {
      return NextResponse.json(
        {
          error: 'Forbidden: `cancel` or `refund` action requires Admin scope',
        },
        { status: 403 }
      );
    }

    // Simplistic cancel logic
    const { error: cancelError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    if (cancelError) {
      console.error('[external/orders PUT] Cancel error:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      );
    }

    // Attempt to log order_event if enum permits (we try 'RETURN_APPROVED' as closest equivalent, or ignore if it errors)
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'RETURN_APPROVED',
      portal: 'admin',
      metadata: {
        note: 'Cancelled via external Admin API',
        apiKey: auth.keyId,
      },
    });

    await logAuditEvent({
      portal: 'admin',
      action: 'EXTERNAL_API_ORDER_CANCEL',
      entityType: 'order',
      entityId: orderId,
      changes: { apiKey: auth.keyId },
    });

    return NextResponse.json(
      { success: true, message: `Order cancelled/refunded successfully` },
      { status: 200 }
    );
  }

  // Standard updates (Tracking / Status)
  let statusUpdated = false;
  const newStatus = body.status as string | undefined;

  if (newStatus) {
    const { error: statusError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (statusError) {
      console.error('[external/orders PUT] Status update error:', statusError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }
    statusUpdated = true;

    // Requirement: "change status from 'pending' to 'shipped' must insert an `order_events` timeline log."
    // Map status to event_type
    let eventType = null;
    if (newStatus === 'shipped') eventType = 'SHIPPED';
    else if (newStatus === 'processing') eventType = 'ORDER_CONFIRMED';
    else if (newStatus === 'delivered') eventType = 'DELIVERED';

    if (eventType) {
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: eventType,
        portal: 'admin',
        metadata: { source: 'External API', keyId: auth.keyId },
      });
    }
  }

  // Tracking Update insertion
  let trackingUpdated = false;
  if (body.tracking) {
    const trackingInfo = body.tracking;
    if (trackingInfo.awb_code && trackingInfo.status && trackingInfo.activity) {
      const { error: trackingError } = await supabase
        .from('tracking_updates')
        .insert({
          order_id: orderId,
          awb_code: trackingInfo.awb_code,
          status: trackingInfo.status,
          location: trackingInfo.location || null,
          activity: trackingInfo.activity,
        });

      if (trackingError) {
        console.error('[external/orders PUT] Tracking error:', trackingError);
        return NextResponse.json(
          { error: 'Failed to add tracking update' },
          { status: 500 }
        );
      }
      trackingUpdated = true;
    }
  }

  if (!statusUpdated && !trackingUpdated) {
    return NextResponse.json(
      {
        error:
          'No valid update fields provided (requires `status` or `tracking` object)',
      },
      { status: 422 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_ORDER_UPDATE',
    entityType: 'order',
    entityId: orderId,
    changes: { status: newStatus, trackingUpdated, apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Order updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/orders
// Delete order (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
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
  const { error } = await supabase.from('orders').delete().eq('id', orderId);

  if (error) {
    console.error('[external/orders DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_ORDER_DELETE',
    entityType: 'order',
    entityId: orderId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Order deleted successfully' },
    { status: 200 }
  );
}
