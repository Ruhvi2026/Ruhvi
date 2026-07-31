'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Truck, Package, ShieldCheck, MapPin, CheckCircle2, Clock } from 'lucide-react';

export default function OrderTrackingPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;

  const [trackingData, setTrackingData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // In a real app, fetch from GET /api/orders/{orderId}/tracking
    // which queries the tracking_updates table.
    // For Phase 5, we mock the real-time Shiprocket sync.
    setTimeout(() => {
      setTrackingData({
        awb: `BLUEDART-RHV-${Math.floor(100000 + Math.random() * 900000)}`,
        courier: 'Blue Dart Express',
        status: 'In Transit',
        updates: [
          {
            title: 'Order Placed',
            description: 'Your order was successfully recorded in our system',
            time: 'Today, 10:30 AM',
            status: 'completed',
          },
          {
            title: 'Shipment Created',
            description: 'Shipping label generated and handed to courier',
            time: 'Today, 02:15 PM',
            status: 'completed',
          },
          {
            title: 'Dispatched via Blue Dart Express',
            description: 'In transit to destination hub',
            time: new Date().toLocaleTimeString(),
            status: 'current',
          },
          {
            title: 'Out for Delivery & Delivered',
            description: 'Handed to recipient with secure OTP verification',
            time: 'Expected in 3 days',
            status: 'upcoming',
          },
        ]
      });
      setLoading(false);
    }, 1000);
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-stone-500">
        <Clock className="w-6 h-6 animate-spin" />
        <span className="ml-3 text-sm">Loading real-time tracking data...</span>
      </div>
    );
  }

  const awbNumber = trackingData.awb;
  const timelineSteps = trackingData.updates;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/orders"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-mono text-stone-400 uppercase block">Shipment Tracking</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center space-x-3">
              <Truck className="w-7 h-7 text-amber-900" />
              <span>Track Order {orderId}</span>
            </h1>
          </div>
        </div>

        <span className="bg-blue-100 text-blue-800 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded">
          In Transit
        </span>
      </div>

      {/* Courier Info Card */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
        <div className="space-y-1">
          <span className="text-stone-400 uppercase text-[10px] font-semibold">Courier Partner</span>
          <div className="font-bold text-stone-900 text-sm">Blue Dart Express (Air)</div>
          <div className="text-stone-500 font-mono">AWB: {awbNumber}</div>
        </div>

        <div className="space-y-1">
          <span className="text-stone-400 uppercase text-[10px] font-semibold">Estimated Delivery</span>
          <div className="font-bold text-emerald-700 text-sm">3 - 5 Business Days</div>
          <div className="text-stone-500">100% Insured Transit</div>
        </div>

        <div className="space-y-1">
          <span className="text-stone-400 uppercase text-[10px] font-semibold">Destination</span>
          <div className="font-bold text-stone-900 text-sm">Hyderabad, Telangana</div>
          <div className="text-stone-500">OTP required at delivery</div>
        </div>
      </div>

      {/* Timeline Visual Steps */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-4">
          Shipment Movement History
        </h3>

        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
          {timelineSteps.map((step: any, idx: number) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';

            return (
              <div key={idx} className="relative flex items-start space-x-4">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                    isCompleted
                      ? 'bg-emerald-600 ring-4 ring-emerald-50'
                      : isCurrent
                      ? 'bg-amber-600 ring-4 ring-amber-50 animate-pulse'
                      : 'bg-stone-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                <div className="space-y-1 pl-2">
                  <div className="flex items-center space-x-3">
                    <h4 className={`text-sm font-bold ${isCurrent ? 'text-amber-950' : 'text-stone-900'}`}>
                      {step.title}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-mono">{step.time}</span>
                  </div>
                  <p className="text-xs text-stone-500">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
