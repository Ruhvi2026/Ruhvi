import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceClient } from '@/lib/supabase/service';
import { transitionOrder, type OrderStatus } from '@/lib/orders/status-engine';
import { observeOrderLifecycleTransition } from '@/lib/intelligence/order-lifecycle';

const SHIPROCKET_STATUS_MAP: Record<string, OrderStatus> = {
  DELIVERED: 'delivered',
  'OUT FOR DELIVERY': 'out_for_delivery',
  'IN TRANSIT': 'shipped',
  SHIPPED: 'shipped',
  'PICKED UP': 'shipped',
  'RTO INITIATED': 'rto_initiated',
  UNDELIVERED: 'rto_initiated',
  FAILED: 'rto_initiated',
  'RTO DELIVERED': 'rto_received',
  'RTO RECEIVED': 'rto_received',
  'RETURNED TO ORIGIN': 'rto_received',
  CANCELLED: 'cancelled',
};

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Fail closed when API keys/secrets are not configured
      return NextResponse.json(
        { error: 'Shiprocket webhook is not configured.' },
        { status: 503 }
      );
    }

    // Verify Shiprocket webhook token or HMAC signature header
    const providedSignature =
      req.headers.get('x-shiprocket-signature') || req.headers.get('x-api-key');

    if (!providedSignature) {
      return NextResponse.json(
        { error: 'Missing Shiprocket signature header.' },
        { status: 401 }
      );
    }

    const rawBody = await req.text();
    // Support both direct secret token comparison and HMAC-SHA256 signature
    const expectedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isMatch =
      providedSignature === webhookSecret || providedSignature === expectedHmac;

    if (!isMatch) {
      console.warn('[Shiprocket Webhook] Invalid signature rejected');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const awb = payload.awb || payload.awb_code;
    const status = (
      payload.current_status ||
      payload.shipment_status ||
      'Update'
    )
      .toString()
      .trim();

    if (!awb) {
      return NextResponse.json({ error: 'Missing AWB code' }, { status: 400 });
    }

    console.log(
      `[Shiprocket Webhook] Received update for AWB: ${awb} - Status: ${status}`
    );

    const supabase = getServiceClient();
    const orderIdentifier = payload.order_id
      ? String(payload.order_id).trim()
      : '';

    let query = supabase.from('orders').select('id, order_number, status');
    if (orderIdentifier) {
      query = query.or(
        `awb_code.eq.${awb},order_number.eq.${orderIdentifier},id.eq.${orderIdentifier}`
      );
    } else {
      query = query.eq('awb_code', awb);
    }

    const { data: order, error: lookupError } = await query.maybeSingle();

    if (!lookupError && order) {
      const upperStatus = status.toUpperCase();
      const targetStatus = SHIPROCKET_STATUS_MAP[upperStatus];

      if (targetStatus && targetStatus !== order.status) {
        try {
          await transitionOrder({
            orderId: order.id,
            newStatus: targetStatus,
            metadata: {
              courier_name: payload.courier_name,
              awb_code: awb,
              shiprocket_status: status,
            },
          });
        } catch (transErr) {
          console.warn(
            '[Shiprocket Webhook] State transition warning:',
            transErr
          );
        }
      }

      // Shared Intelligence Canonical Event Observation (Track B)
      try {
        await observeOrderLifecycleTransition({
          orderId: order.id,
          orderNumber: order.order_number,
          fromStatus: order.status,
          toStatus: targetStatus || (order.status as OrderStatus),
          actor: { type: 'webhook', id: 'shiprocket' },
          source: 'webhook_shiprocket',
          metadata: {
            courier_name: payload.courier_name,
            awb_code: awb,
            shiprocket_status: status,
          },
        });
      } catch (obsErr) {
        console.error(
          '[Shiprocket Webhook] Intelligence observation failed:',
          obsErr
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[Shiprocket Webhook Error]', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
