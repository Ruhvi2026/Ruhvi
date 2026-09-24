import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { cookies } from 'next/headers';

export interface OrderNotificationItem {
  id: string;
  category:
    | 'NEW_ORDER'
    | 'SLA_ALERT'
    | 'CANCELLATION'
    | 'RETURN'
    | 'RTO'
    | 'REFUND'
    | 'ACCOUNT_HEALTH';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  amount?: number;
  status: string;
  ageDays?: number;
  actionUrl: string;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch orders from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(
        'id, order_number, status, payment_status, total_amount, created_at, shipping_address'
      )
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Failed to fetch orders for notifications:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch order notifications' },
        { status: 500 }
      );
    }

    const now = new Date();
    const notifications: OrderNotificationItem[] = [];

    let newOrdersCount = 0;
    let slaBreachCount = 0;
    let cancellationCount = 0;
    let returnsCount = 0;
    let rtoCount = 0;
    let refundsCount = 0;

    (orders || []).forEach((order) => {
      const createdAt = new Date(order.created_at);
      const diffMs = now.getTime() - createdAt.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      const customerName =
        order.shipping_address?.full_name ||
        order.shipping_address?.name ||
        'Customer';
      const formattedAmount = order.total_amount
        ? `₹${Number(order.total_amount).toLocaleString('en-IN')}`
        : '';

      // 1. SLA Breach Alert (> 3 days or > 72 hours in pending/confirmed/processing)
      if (
        ['pending', 'confirmed', 'processing'].includes(order.status) &&
        diffHours >= 72
      ) {
        slaBreachCount++;
        const isCritical = diffHours >= 96; // > 4 days is critical
        notifications.push({
          id: `sla-${order.id}`,
          category: 'SLA_ALERT',
          severity: isCritical ? 'CRITICAL' : 'WARNING',
          title: `SLA Breach Alert: Order #${order.order_number}`,
          message: `Order has been pending fulfillment for ${diffDays} days (${diffHours}h). Please dispatch or update status immediately.`,
          timestamp: order.created_at,
          read: false,
          orderId: order.id,
          orderNumber: order.order_number || order.id.slice(0, 8),
          customerName,
          amount: order.total_amount,
          status: order.status,
          ageDays: diffDays,
          actionUrl: `/portal-orders/all?search=${encodeURIComponent(order.order_number || order.id)}`,
        });
      }

      // 2. New Order (placed in last 48 hours)
      if (
        diffHours <= 48 &&
        (order.status === 'pending' || order.status === 'confirmed')
      ) {
        newOrdersCount++;
        notifications.push({
          id: `new-${order.id}`,
          category: 'NEW_ORDER',
          severity: 'INFO',
          title: `New Order Received: #${order.order_number}`,
          message: `${customerName} placed a new order for ${formattedAmount}. Status: ${order.status.toUpperCase()}.`,
          timestamp: order.created_at,
          read: false,
          orderId: order.id,
          orderNumber: order.order_number || order.id.slice(0, 8),
          customerName,
          amount: order.total_amount,
          status: order.status,
          ageDays: diffDays,
          actionUrl: `/portal-orders/all?search=${encodeURIComponent(order.order_number || order.id)}`,
        });
      }

      // 3. Order Cancellations
      if (order.status === 'cancelled') {
        cancellationCount++;
        notifications.push({
          id: `canc-${order.id}`,
          category: 'CANCELLATION',
          severity: 'WARNING',
          title: `Order Cancelled: #${order.order_number}`,
          message: `Order #${order.order_number} for ${formattedAmount} was marked as cancelled.`,
          timestamp: order.created_at,
          read: false,
          orderId: order.id,
          orderNumber: order.order_number || order.id.slice(0, 8),
          customerName,
          amount: order.total_amount,
          status: order.status,
          ageDays: diffDays,
          actionUrl: `/portal-orders/all?status=cancelled&search=${encodeURIComponent(order.order_number || order.id)}`,
        });
      }

      // 4. Returns
      if (
        [
          'return_requested',
          'return_approved',
          'returned',
          'return_rejected',
        ].includes(order.status)
      ) {
        returnsCount++;
        notifications.push({
          id: `ret-${order.id}`,
          category: 'RETURN',
          severity: 'WARNING',
          title: `Return Notification: #${order.order_number}`,
          message: `Order return status updated to ${order.status.replace('_', ' ').toUpperCase()} for ${customerName}.`,
          timestamp: order.created_at,
          read: false,
          orderId: order.id,
          orderNumber: order.order_number || order.id.slice(0, 8),
          customerName,
          amount: order.total_amount,
          status: order.status,
          ageDays: diffDays,
          actionUrl: `/portal-orders/returns`,
        });
      }

      // 5. RTO (Return to Origin) & Delivery Failures
      if (
        ['rto_initiated', 'rto_received', 'delivery_failed'].includes(
          order.status
        )
      ) {
        rtoCount++;
        notifications.push({
          id: `rto-${order.id}`,
          category: 'RTO',
          severity: 'CRITICAL',
          title: `RTO / Delivery Failure: #${order.order_number}`,
          message: `Shipment for order #${order.order_number} experienced delivery failure/RTO initiation.`,
          timestamp: order.created_at,
          read: false,
          orderId: order.id,
          orderNumber: order.order_number || order.id.slice(0, 8),
          customerName,
          amount: order.total_amount,
          status: order.status,
          ageDays: diffDays,
          actionUrl: `/portal-orders/rto`,
        });
      }

      // 6. Refunds
      if (order.status === 'refunded' || order.payment_status === 'refunded') {
        refundsCount++;
        notifications.push({
          id: `ref-${order.id}`,
          category: 'REFUND',
          severity: 'INFO',
          title: `Refund Processed: #${order.order_number}`,
          message: `Refund of ${formattedAmount} for order #${order.order_number} is recorded as completed.`,
          timestamp: order.created_at,
          read: false,
          orderId: order.id,
          orderNumber: order.order_number || order.id.slice(0, 8),
          customerName,
          amount: order.total_amount,
          status: order.status,
          ageDays: diffDays,
          actionUrl: `/portal-orders/refunds`,
        });
      }
    });

    // 7. Account Health Summary Alert
    if (slaBreachCount > 0 || rtoCount > 3) {
      notifications.unshift({
        id: `account-health-summary`,
        category: 'ACCOUNT_HEALTH',
        severity: slaBreachCount >= 3 ? 'CRITICAL' : 'WARNING',
        title: 'Account Health Alert: Pending SLA Breaches',
        message: `${slaBreachCount} order(s) pending >3 days, ${rtoCount} RTO shipment(s) active. Immediate action recommended to maintain store SLA rating.`,
        timestamp: new Date().toISOString(),
        read: false,
        orderId: '',
        orderNumber: 'STORE-HEALTH',
        actionUrl: `/portal-orders/all?status=pending`,
        status: 'warning',
      });
    }

    // Sort notifications: SLA_ALERT & ACCOUNT_HEALTH first, then by timestamp descending
    notifications.sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const accountHealthStatus =
      slaBreachCount > 3 || rtoCount > 5
        ? 'CRITICAL'
        : slaBreachCount > 0 || rtoCount > 1
          ? 'WARNING'
          : 'EXCELLENT';

    return NextResponse.json({
      summary: {
        totalNotifications: notifications.length,
        unreadCount: notifications.length,
        newOrdersCount,
        slaBreachCount,
        cancellationCount,
        returnsCount,
        rtoCount,
        refundsCount,
        accountHealthStatus,
      },
      notifications,
    });
  } catch (err: any) {
    console.error('Order notification API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
