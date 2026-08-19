import { createClient } from '@/lib/supabase/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/auth/server';

export type OrderEventType =
  | 'ORDER_CREATED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_CONFIRMED'
  | 'PACKING_STARTED'
  | 'PACKED'
  | 'LABEL_CREATED'
  | 'MANIFEST_CREATED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_PICKED'
  | 'REFUND_INITIATED'
  | 'RTO_INITIATED'
  | 'RTO_RECEIVED'
  | 'CANCELLED';

export interface OrderEventMetadata {
  courier_name?: string;
  awb_code?: string;
  shipment_id?: string;
  tracking_url?: string;
  return_id?: string;
  refund_amount?: number;
  refund_method?: string;
  rto_reason?: string;
  packing_location?: string;
  notes?: string;
  [key: string]: any;
}

export interface LogOrderEventParams {
  orderId: string;
  eventType: OrderEventType;
  performedBy?: string;
  portal?: string;
  metadata?: OrderEventMetadata;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: OrderEventType;
  performed_by: string | null;
  portal: string;
  metadata: OrderEventMetadata;
  created_at: string;
  performed_by_user?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

function getServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createServerClient(url, key);
}

/**
 * Log an order event securely from backend/server context
 * Requires admin/staff authorization (validated via RLS policy)
 */
export async function logOrderEvent(
  params: LogOrderEventParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify the caller is authenticated (server-side)
    const { user } = await getServerUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: No authenticated user' };
    }

    // Verify user has admin/staff role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return { success: false, error: 'Forbidden: Insufficient permissions' };
    }

    // Use service role to bypass RLS for inserts (since policy checks is_admin_or_staff)
    const serviceSupabase = getServiceClient();

    const { error } = await serviceSupabase.from('order_events').insert({
      order_id: params.orderId,
      event_type: params.eventType,
      performed_by: params.performedBy || user.id,
      portal: params.portal || 'orders',
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('Failed to log order event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in logOrderEvent:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch order events for an order (for display in timeline)
 */
export async function getOrderEvents(
  orderId: string
): Promise<{ data: OrderEvent[] | null; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('order_events')
      .select(
        `
        id,
        order_id,
        event_type,
        performed_by,
        portal,
        metadata,
        created_at,
        performed_by_user:users!order_events_performed_by_fkey(full_name, email)
      `
      )
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as OrderEvent[] | null, error: undefined };
  } catch (error: any) {
    console.error('Error fetching order events:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get event type display configuration for UI
 */
export function getEventDisplayConfig(eventType: OrderEventType) {
  const configs: Record<
    OrderEventType,
    {
      label: string;
      color: string;
      icon: string;
      bgColor: string;
      borderColor: string;
    }
  > = {
    ORDER_CREATED: {
      label: 'Order Created',
      color: 'text-blue-400',
      icon: 'package',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    PAYMENT_CONFIRMED: {
      label: 'Payment Confirmed',
      color: 'text-emerald-400',
      icon: 'check-circle',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    ORDER_CONFIRMED: {
      label: 'Order Confirmed',
      color: 'text-blue-400',
      icon: 'check-circle',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    PACKING_STARTED: {
      label: 'Packing Started',
      color: 'text-amber-400',
      icon: 'package',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    PACKED: {
      label: 'Packed',
      color: 'text-amber-400',
      icon: 'package',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    LABEL_CREATED: {
      label: 'Label Created',
      color: 'text-indigo-400',
      icon: 'file-text',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    MANIFEST_CREATED: {
      label: 'Manifest Created',
      color: 'text-indigo-400',
      icon: 'file-text',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    SHIPPED: {
      label: 'Shipped',
      color: 'text-indigo-400',
      icon: 'truck',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    OUT_FOR_DELIVERY: {
      label: 'Out for Delivery',
      color: 'text-sky-400',
      icon: 'truck',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
    },
    DELIVERED: {
      label: 'Delivered',
      color: 'text-emerald-400',
      icon: 'check-circle',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    RETURN_REQUESTED: {
      label: 'Return Requested',
      color: 'text-orange-400',
      icon: 'rotate-ccw',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    RETURN_APPROVED: {
      label: 'Return Approved',
      color: 'text-orange-400',
      icon: 'check-circle',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    RETURN_PICKED: {
      label: 'Return Picked Up',
      color: 'text-orange-400',
      icon: 'truck',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    REFUND_INITIATED: {
      label: 'Refund Initiated',
      color: 'text-purple-400',
      icon: 'credit-card',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    RTO_INITIATED: {
      label: 'RTO Initiated',
      color: 'text-red-400',
      icon: 'alert-triangle',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    RTO_RECEIVED: {
      label: 'RTO Received',
      color: 'text-red-400',
      icon: 'package',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'text-rose-400',
      icon: 'x-circle',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    },
  };

  return (
    configs[eventType] || {
      label: eventType,
      color: 'text-slate-400',
      icon: 'circle',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
    }
  );
}
