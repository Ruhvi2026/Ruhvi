import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import {
  dispatchProactiveAlert,
  dispatchDeliveryFailedAlert,
  dispatchRtoInitiatedAlert,
  dispatchReturnRequestAlert,
  dispatchLowStockAlert,
  dispatchTech500ErrorAlert,
  dispatchTech404SpikeAlert,
  dispatchTechHighLatencyAlert,
  scanAndDispatchOperationalAlerts,
  type ProactiveEventType,
  type DepartmentKey,
} from '@/lib/ai/proactive/dispatcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyAuthorization(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret =
    process.env.INTERNAL_DISPATCH_SECRET ||
    cronSecret ||
    'ruhvi-internal-cron-2026';

  // 1. Check custom headers
  const providedInternalSecret =
    req.headers.get('x-internal-secret') || req.headers.get('x-cron-secret');
  if (providedInternalSecret && providedInternalSecret === internalSecret) {
    return true;
  }

  // 2. Check Bearer Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 3. Check Session Cookie for Admin / Super Admin callers
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (sessionCookie) {
    const decoded = await verifySessionToken(sessionCookie);
    if (decoded && decoded.sub) {
      const supabase = getServiceClient();
      const { data: user } = await supabase
        .from('users')
        .select('role, account_status')
        .eq('id', decoded.sub as string)
        .maybeSingle();

      if (
        user &&
        user.account_status === 'active' &&
        ['super_admin', 'admin', 'manager'].includes(user.role)
      ) {
        return true;
      }
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAuthorization(req);
    if (!isAuthorized) {
      return NextResponse.json(
        {
          error:
            'Unauthorized: Valid internal secret or admin session required',
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const eventType: ProactiveEventType | 'SCAN_ALL' = body.eventType;
    const data = body.data || {};
    const department: DepartmentKey = body.department || 'orders';

    // 1. Handle Full Operational Scanner Trigger
    if (eventType === 'SCAN_ALL') {
      const scanResult = await scanAndDispatchOperationalAlerts();
      return NextResponse.json({
        success: true,
        eventType: 'SCAN_ALL',
        scanResult,
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Route by specific event type
    let result;

    switch (eventType) {
      case 'ORDER_DELIVERY_FAILED':
        result = await dispatchDeliveryFailedAlert({
          orderId: data.orderId || data.id,
          orderNumber: data.orderNumber || data.order_number,
          customerName: data.customerName || data.name,
          customerPhone: data.customerPhone || data.phone,
          courier: data.courier,
          reason: data.reason,
          attemptCount: data.attemptCount,
        });
        break;

      case 'ORDER_RTO_INITIATED':
        result = await dispatchRtoInitiatedAlert({
          orderId: data.orderId || data.id,
          orderNumber: data.orderNumber || data.order_number,
          customerName: data.customerName || data.name,
          customerPhone: data.customerPhone || data.phone,
          courier: data.courier,
          reason: data.reason,
        });
        break;

      case 'RETURN_REQUESTED':
        result = await dispatchReturnRequestAlert({
          returnId: data.returnId || data.id,
          orderId: data.orderId || data.order_id,
          orderNumber: data.orderNumber || data.order_number,
          customerName: data.customerName || data.name,
          customerPhone: data.customerPhone || data.phone,
          reason: data.reason || 'Not specified',
          customerNote: data.customerNote || data.comments,
          itemName: data.itemName,
          photoUrl: data.photoUrl,
        });
        break;

      case 'OPERATIONS_LOW_STOCK':
        result = await dispatchLowStockAlert({
          productId: data.productId || data.id,
          productName: data.productName || data.name || 'Jewellery Item',
          sku: data.sku || data.product_sku || 'SKU',
          currentStock:
            data.currentStock !== undefined
              ? data.currentStock
              : data.stock || 0,
          category: data.category,
        });
        break;

      case 'TECH_SENTRY_500':
        result = await dispatchTech500ErrorAlert({
          errorName: data.errorName || 'UnhandledException',
          errorMessage: data.errorMessage || 'Server error',
          route: data.route,
          count: data.count,
          sentryEventId: data.sentryEventId,
          stackSnippet: data.stackSnippet,
        });
        break;

      case 'TECH_404_SPIKE':
        result = await dispatchTech404SpikeAlert({
          missingPath: data.missingPath || data.path || '/',
          referrer: data.referrer,
          hitCount: data.hitCount || data.count || 1,
          timeWindowMinutes: data.timeWindowMinutes,
        });
        break;

      case 'TECH_HIGH_LATENCY':
        result = await dispatchTechHighLatencyAlert({
          endpoint: data.endpoint || '/api',
          latencyMs: data.latencyMs || 3500,
          thresholdMs: data.thresholdMs,
        });
        break;

      default:
        // Generic Custom Alert
        if (!body.markdownContent && !body.message) {
          return NextResponse.json(
            {
              error: 'markdownContent or message is required for custom alerts',
            },
            { status: 400 }
          );
        }
        result = await dispatchProactiveAlert({
          department,
          eventType: eventType || 'CUSTOM_ALERT',
          title: body.title || 'Department Operational Alert',
          markdownContent: body.markdownContent || body.message,
          entityRef: body.entityRef,
          metadata: data,
        });
        break;
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to dispatch alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      eventType,
      department,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Proactive Dispatch API Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error dispatching alert' },
      { status: 500 }
    );
  }
}
