'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Truck, Package, ShieldCheck, MapPin, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OrderTrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const [trackingData, setTrackingData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetchTracking();
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      const supabase = createClient();

      // Order + AWB info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, status, awb_code, courier_name, shipped_at, estimated_delivery_date')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError || !order) {
        setError('Order not found.');
        setLoading(false);
        return;
      }

      // Tracking updates (from courier webhooks / Shiprocket)
      const { data: updates } = await supabase
        .from('tracking_updates')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true });

      // Shipment record (provider-agnostic)
      const { data: shipment } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setTrackingData({
        order,
        shipment: shipment || null,
        updates: updates || [],
        awb: order.awb_code || shipment?.awb_number || '',
        courier: order.courier_name || shipment?.courier_provider || 'Courier',
        trackingUrl: shipment?.tracking_url || '',
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load tracking information.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-stone-500">
        <Clock className="h-6 w-6 animate-spin" />
        <span className="ml-3 text-sm">Loading tracking data...</span>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-500">
        <AlertCircle className="h-8 w-8 text-rose-500" />
        <p className="mt-3 text-sm">{error || 'Unable to load tracking.'}</p>
        <Link href="/orders" className="mt-4 rounded-lg bg-amber-950 px-4 py-2 text-xs font-bold text-amber-100">
          Back to Orders
        </Link>
      </div>
    );
  }

  const { order, shipment } = trackingData;

  // Build timeline from tracking_updates + order lifecycle.
  const timelineSteps: any[] = [
    {
      title: 'Order Placed',
      description: `Order ${order.order_number} was successfully placed`,
      time: new Date(order.created_at).toLocaleString(),
      status: 'completed',
    },
  ];

  if (order.shipped_at || order.awb_code) {
    timelineSteps.push({
      title: `Shipped via ${trackingData.courier}`,
      description: trackingData.awb ? `AWB: ${trackingData.awb}` : 'Shipment created',
      time: order.shipped_at ? new Date(order.shipped_at).toLocaleString() : '',
      status: order.status === 'shipped' ? 'current' : 'completed',
    });
  }

  const courierUpdates = (trackingData.updates || []).map((u: any) => ({
    title: u.activity || u.status || 'Update',
    description: u.location ? `Location: ${u.location}` : '',
    time: new Date(u.timestamp).toLocaleString(),
    status: 'completed',
  }));

  if (courierUpdates.length > 0) {
    timelineSteps.push(...courierUpdates);
  }

  if (order.status === 'out_for_delivery') {
    timelineSteps.push({
      title: 'Out for Delivery',
      description: 'Your order is out for delivery',
      time: order.out_for_delivery_at ? new Date(order.out_for_delivery_at).toLocaleString() : '',
      status: 'current',
    });
  }

  if (order.status === 'delivered') {
    timelineSteps.push({
      title: 'Delivered',
      description: 'Your order has been delivered',
      time: order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '',
      status: 'current',
    });
  }

  if (['delivery_failed', 'rto_initiated', 'rto_received'].includes(order.status)) {
    timelineSteps.push({
      title: 'Delivery Issue',
      description: 'There was an issue with delivery. Our team will contact you.',
      time: '',
      status: 'current',
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <Link href="/orders" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400">
              Shipment Tracking
            </span>
            <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              Track Order {order.order_number}
            </h1>
          </div>
        </div>
      </div>

      {/* Courier Info Card */}
      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-stone-200 bg-white p-6 text-xs shadow-sm sm:grid-cols-3">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-stone-400">Courier Partner</span>
          <div className="text-sm font-bold text-stone-900">{trackingData.courier}</div>
          <div className="font-mono text-stone-500">AWB: {trackingData.awb || '—'}</div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-stone-400">Order Status</span>
          <div className="text-sm font-bold capitalize text-amber-950">{order.status.replace(/_/g, ' ')}</div>
          <div className="text-stone-500">100% Insured Transit</div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-stone-400">Tracking</span>
          {trackingData.trackingUrl ? (
            <a
              href={trackingData.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-indigo-600 hover:underline"
            >
              Open Courier Tracking →
            </a>
          ) : (
            <div className="text-sm font-bold text-stone-900">Awaiting shipment</div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <h3 className="border-b border-stone-100 pb-4 font-serif text-lg font-bold text-stone-900">
          Shipment Movement History
        </h3>

        {timelineSteps.length === 1 ? (
          <div className="py-8 text-center text-sm text-stone-500">
            <Truck className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            Your order is being processed. Tracking updates will appear once your order ships.
          </div>
        ) : (
          <div className="relative space-y-8 pl-6 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-0.5 before:bg-stone-200 sm:pl-8">
            {timelineSteps.map((step: any, idx: number) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              return (
                <div key={idx} className="relative flex items-start space-x-4">
                  <div
                    className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full text-white sm:-left-8 ${
                      isCompleted
                        ? 'bg-emerald-600 ring-4 ring-emerald-50'
                        : isCurrent
                          ? 'animate-pulse bg-amber-600 ring-4 ring-amber-50'
                          : 'bg-stone-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="space-y-1 pl-2">
                    <div className="flex items-center space-x-3">
                      <h4 className={`text-sm font-bold ${isCurrent ? 'text-amber-950' : 'text-stone-900'}`}>
                        {step.title}
                      </h4>
                      {step.time && <span className="font-mono text-[10px] text-stone-400">{step.time}</span>}
                    </div>
                    <p className="text-xs text-stone-500">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center space-x-2 pt-2 text-xs text-stone-400">
        <ShieldCheck className="h-4 w-4 text-amber-800" />
        <p>Questions about your order? Contact support@ruhvi.in</p>
      </div>
    </div>
  );
}