'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Truck,
  FileText,
  CheckCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { Order } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  performed_by: string | null;
  portal: string;
  metadata: Record<string, any>;
  created_at: string;
  performed_by_user?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

function getEventDisplayConfig(eventType: string) {
  const configs: Record<
    string,
    {
      label: string;
      color: string;
      icon: React.ComponentType<{ className?: string }>;
      bgColor: string;
      borderColor: string;
    }
  > = {
    ORDER_CREATED: {
      label: 'Order Created',
      color: 'text-blue-400',
      icon: Package,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    PAYMENT_CONFIRMED: {
      label: 'Payment Confirmed',
      color: 'text-emerald-400',
      icon: CreditCard,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    ORDER_CONFIRMED: {
      label: 'Order Confirmed',
      color: 'text-blue-400',
      icon: CheckCircle,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    PACKING_STARTED: {
      label: 'Packing Started',
      color: 'text-amber-400',
      icon: Package,
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    PACKED: {
      label: 'Packed',
      color: 'text-amber-400',
      icon: Package,
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    LABEL_CREATED: {
      label: 'Label Created',
      color: 'text-indigo-400',
      icon: FileText,
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    MANIFEST_CREATED: {
      label: 'Manifest Created',
      color: 'text-indigo-400',
      icon: FileText,
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    SHIPPED: {
      label: 'Shipped',
      color: 'text-indigo-400',
      icon: Truck,
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    OUT_FOR_DELIVERY: {
      label: 'Out for Delivery',
      color: 'text-sky-400',
      icon: Truck,
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
    },
    DELIVERED: {
      label: 'Delivered',
      color: 'text-emerald-400',
      icon: CheckCircle,
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    RETURN_REQUESTED: {
      label: 'Return Requested',
      color: 'text-orange-400',
      icon: RotateCcw,
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    RETURN_APPROVED: {
      label: 'Return Approved',
      color: 'text-orange-400',
      icon: CheckCircle,
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    RETURN_PICKED: {
      label: 'Return Picked Up',
      color: 'text-orange-400',
      icon: Truck,
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
    REFUND_INITIATED: {
      label: 'Refund Initiated',
      color: 'text-purple-400',
      icon: CreditCard,
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    RTO_INITIATED: {
      label: 'RTO Initiated',
      color: 'text-red-400',
      icon: AlertTriangle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    RTO_RECEIVED: {
      label: 'RTO Received',
      color: 'text-red-400',
      icon: Package,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    CANCELLED: {
      label: 'Cancelled',
      color: 'text-rose-400',
      icon: XCircle,
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
    },
  };

  return (
    configs[eventType] || {
      label: eventType,
      color: 'text-slate-400',
      icon: Clock,
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/20',
    }
  );
}

function EventIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return <Icon className={className} />;
}

function TimelineItem({
  event,
  index,
  total,
}: {
  event: OrderEvent;
  index: number;
  total: number;
}) {
  const config = getEventDisplayConfig(event.event_type);
  const Icon = config.icon;
  const isLast = index === total - 1;
  const performedBy =
    event.performed_by_user?.full_name ||
    event.performed_by_user?.email ||
    'System';
  const portal = event.portal;
  const metadata = event.metadata;

  return (
    <div className="relative flex space-x-4">
      {/* Timeline line */}
      <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-gradient-to-b from-white/10 to-transparent" />

      {/* Event dot */}
      <div
        className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${config.color} ${config.borderColor} ${config.bgColor}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Event content */}
      <div className="min-w-0 flex-1 pb-8 last:pb-0">
        <div
          className={`rounded-xl border p-4 ${config.borderColor} ${config.bgColor} backdrop-blur-sm`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white">{config.label}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(event.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <div className="mt-2 flex items-center space-x-2 text-xs">
                <span className="rounded bg-white/5 px-2 py-0.5 text-slate-400">
                  By: {performedBy}
                </span>
                <span className="rounded bg-white/5 px-2 py-0.5 text-slate-400">
                  Portal: {portal}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata display */}
          {metadata && Object.keys(metadata).length > 0 && (
            <details className="mt-3">
              <summary className="flex cursor-pointer items-center space-x-1 text-xs text-slate-400 hover:text-slate-300">
                <span>Details</span>
                <ChevronDown className="h-3 w-3" />
              </summary>
              <div className="mt-2 max-h-48 overflow-auto rounded bg-white/5 p-3 font-mono text-xs text-slate-300">
                <pre>{JSON.stringify(metadata, null, 2)}</pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPushing, setIsPushing] = useState(false);

  React.useEffect(() => {
    fetchOrder();
    fetchEvents();
  }, [resolvedParams.id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          shipping_address:addresses(*),
          order_items(*)
        `
        )
        .eq('id', resolvedParams.id)
        .single();

      if (error) throw error;
      setOrder(data as Order);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const supabase = createClient();
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
        .eq('order_id', resolvedParams.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents((data as OrderEvent[]) || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handlePushToShiprocket = async () => {
    if (!order) return;
    setIsPushing(true);

    try {
      const res = await fetch('/api/admin/shiprocket/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrder({
          ...order,
          awb_code: data.awb_code,
          courier_name: data.courier_name,
          status: 'shipped',
        });
        // Refetch events to show new timeline entries
        fetchEvents();
      } else {
        alert(`Failed to create shipment: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error occurred while pushing to Shiprocket.');
    } finally {
      setIsPushing(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500">Loading order...</div>
    );
  if (error || !order)
    return (
      <div className="p-10 text-center font-bold text-rose-600">
        {error || 'Order not found.'}
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center space-x-4 border-b border-white/10 pb-6">
        <Link
          href="/portal-orders/all"
          className="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="h-5 w-5 text-slate-300" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-white">
            Manage Order {order.order_number}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Placed on {new Date(order.created_at!).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Order Details + Timeline */}
        <div className="space-y-8 lg:col-span-2">
          {/* Items */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-6">
            <h2 className="mb-4 font-serif text-lg font-bold text-white">
              Order Items
            </h2>
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-200">
                      Product ID: {item.product_id}
                    </p>
                    <p className="text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-bold text-white">
                    ₹{item.price_at_purchase.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-6">
            <h2 className="mb-4 font-serif text-lg font-bold text-white">
              Shipping Destination
            </h2>
            {order.shipping_address && (
              <div className="ph-no-capture space-y-1 text-sm text-slate-300">
                <p className="font-semibold text-white">
                  {order.shipping_address.full_name}
                </p>
                <p>{order.shipping_address.phone}</p>
                <p>
                  {order.shipping_address.line1}, {order.shipping_address.line2}
                </p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state}{' '}
                  - {order.shipping_address.pincode}
                </p>
              </div>
            )}
          </div>

          {/* Order Event Timeline */}
          <div className="rounded-2xl border border-white/5 bg-[#131726] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-white">
                Order Timeline
              </h2>
              <span className="text-xs text-slate-500">
                {events.length} events
              </span>
            </div>

            {events.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Clock className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <p>No timeline events recorded yet.</p>
                <p className="mt-1 text-xs">
                  Events will appear as the order progresses.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {events.map((event, index) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    index={index}
                    total={events.length}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fulfillment Panel */}
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-amber-500/20 bg-[#131726] p-6">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-4">
              <Package className="h-5 w-5 text-amber-500" />
              <h2 className="font-serif text-lg font-bold text-white">
                Fulfillment
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Payment Status</span>
                <span className="flex items-center font-bold capitalize text-emerald-400">
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {order.payment_status}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Order Status</span>
                <span className="font-bold capitalize text-white">
                  {order.status}
                </span>
              </div>
            </div>

            {/* Shiprocket Panel */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              {!order.awb_code ? (
                <>
                  <p className="text-xs text-slate-500">
                    Ready to pack? Push this order to Shiprocket to generate a
                    shipping label and tracking number.
                  </p>
                  <button
                    onClick={handlePushToShiprocket}
                    disabled={isPushing}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Truck className="h-4 w-4" />
                    <span>
                      {isPushing
                        ? 'Creating Shipment...'
                        : 'Generate Shipping Label'}
                    </span>
                  </button>
                </>
              ) : (
                <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-bold">Shipment Created</span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">Courier Partner:</p>
                    <p className="font-bold text-white">{order.courier_name}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400">Tracking AWB:</p>
                    <p className="font-mono font-bold text-white">
                      {order.awb_code}
                    </p>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-slate-700 py-2 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-slate-600">
                      <FileText className="h-3 w-3" />
                      <span>Print Label</span>
                    </button>
                    <button className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-white/10">
                      Manifest
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
