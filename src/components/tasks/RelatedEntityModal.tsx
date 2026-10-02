'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Package,
  Box,
  Ticket,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Tag,
} from 'lucide-react';

interface RelatedEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'order' | 'product' | 'ticket' | null;
  idOrCode: string | null;
  initialData?: any;
}

export default function RelatedEntityModal({
  isOpen,
  onClose,
  type,
  idOrCode,
  initialData,
}: RelatedEntityModalProps) {
  const [data, setData] = useState<any>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !type || !idOrCode) {
      setData(null);
      setError(null);
      return;
    }

    // If initialData is already comprehensive, use it
    if (
      initialData &&
      (initialData.items || initialData.images || initialData.description)
    ) {
      setData(initialData);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetch(
      `/api/task-manager/related-entities?type=${type}&id=${encodeURIComponent(idOrCode)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${type} details`);
        return res.json();
      })
      .then((resData) => {
        if (active) {
          if (resData.success && resData.data) {
            setData(resData.data);
          } else {
            setError(resData.error || 'Entity not found');
          }
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to fetch details');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, type, idOrCode, initialData]);

  if (!isOpen || !type) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121526] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              {type === 'order' && <Package className="h-5 w-5" />}
              {type === 'product' && <Box className="h-5 w-5" />}
              {type === 'ticket' && <Ticket className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {type === 'order' && 'Order Inspection Details'}
                {type === 'product' && 'Product Inspection Details'}
                {type === 'ticket' && 'Support Ticket Details'}
              </h2>
              <p className="text-xs text-slate-400">
                Linked entity reference for Task Manager
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center space-y-3 py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="text-sm text-slate-400">
                Fetching {type} details...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* ORDER DETAILS VIEW */}
              {type === 'order' && (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Order No
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-white">
                        {data.order_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Status
                      </p>
                      <span className="mt-0.5 inline-flex items-center rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium capitalize text-emerald-400">
                        {data.status || 'Active'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Total Amount
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                        ₹
                        {Number(
                          data.total || data.subtotal || 0
                        ).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Payment
                      </p>
                      <p className="mt-0.5 text-xs font-medium capitalize text-slate-300">
                        {data.payment_method || 'Online'} •{' '}
                        {data.payment_status || 'Paid'}
                      </p>
                    </div>
                  </div>

                  {/* Customer Card */}
                  {data.customer && (
                    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        <User className="h-3.5 w-3.5 text-emerald-400" />{' '}
                        Customer Information
                      </h4>
                      <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-3">
                        <div>
                          <span className="block text-slate-400">Name:</span>
                          <span className="font-medium text-white">
                            {data.customer.full_name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Email:</span>
                          <span className="break-all font-medium text-white">
                            {data.customer.email || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Phone:</span>
                          <span className="font-medium text-white">
                            {data.customer.phone || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                      <Package className="h-3.5 w-3.5 text-emerald-400" />{' '}
                      Ordered Items ({data.items?.length || 0})
                    </h4>
                    {data.items && data.items.length > 0 ? (
                      <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        {data.items.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 text-xs"
                          >
                            <div>
                              <p className="font-medium text-white">
                                {item.product_name || item.sku || 'Item'}
                              </p>
                              {item.sku && (
                                <p className="text-[10px] text-slate-400">
                                  SKU: {item.sku}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-slate-300">
                                Qty: {item.quantity}
                              </p>
                              <p className="font-semibold text-emerald-400">
                                ₹
                                {Number(
                                  item.price_at_purchase || item.line_total || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-500">
                        No line items recorded
                      </p>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" /> Placed:{' '}
                      {new Date(data.created_at).toLocaleString('en-IN')}
                    </span>
                    {data.shipped_at && (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Shipped:{' '}
                        {new Date(data.shipped_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* PRODUCT DETAILS VIEW */}
              {type === 'product' && (
                <div className="space-y-6">
                  {/* Top Product Header */}
                  <div className="flex flex-col items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row">
                    {data.images && data.images.length > 0 ? (
                      <img
                        src={data.images[0].url}
                        alt={data.name}
                        className="h-24 w-24 shrink-0 rounded-lg border border-white/10 bg-black/40 object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-slate-500">
                        <Box className="h-8 w-8" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-400">
                          {data.status || 'Active'}
                        </span>
                        {data.sku && (
                          <span className="font-mono text-xs text-slate-400">
                            SKU: {data.sku}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold leading-snug text-white">
                        {data.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-lg font-bold text-emerald-400">
                          ₹{Number(data.price || 0).toLocaleString('en-IN')}
                        </span>
                        {data.mrp && Number(data.mrp) > Number(data.price) && (
                          <span className="text-slate-400 line-through">
                            ₹{Number(data.mrp).toLocaleString('en-IN')}
                          </span>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            (data.stock_quantity ?? 0) <=
                            (data.low_stock_threshold ?? 5)
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          Stock: {data.stock_quantity ?? 0} units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {data.description && (
                    <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Product Description
                      </h4>
                      <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                        {data.description}
                      </p>
                    </div>
                  )}

                  {/* Gallery */}
                  {data.images && data.images.length > 1 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Product Gallery ({data.images.length} images)
                      </h4>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {data.images.map((img: any, idx: number) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TICKET DETAILS VIEW */}
              {type === 'ticket' && (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Ticket #
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-white">
                        {data.ticket_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Priority
                      </p>
                      <span className="mt-0.5 inline-flex items-center rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium capitalize text-amber-300">
                        {data.priority || 'Normal'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Status
                      </p>
                      <span className="mt-0.5 inline-flex items-center rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium capitalize text-blue-300">
                        {data.status || 'Open'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Customer
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-200">
                        {data.customer_email || data.guest_name || 'Guest'}
                      </p>
                    </div>
                  </div>

                  {/* Subject & Description */}
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-semibold text-white">
                      {data.title || 'Support Query'}
                    </h3>
                    <p className="whitespace-pre-wrap rounded-lg border border-white/5 bg-black/20 p-3 text-xs leading-relaxed text-slate-300">
                      {data.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Recent Messages */}
                  {data.messages && data.messages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Recent Conversation ({data.messages.length})
                      </h4>
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {data.messages.map((m: any) => (
                          <div
                            key={m.id}
                            className={`rounded-lg border p-3 text-xs ${
                              m.sender_type === 'staff' ||
                              m.sender_type === 'agent'
                                ? 'border-indigo-500/20 bg-indigo-600/10 text-indigo-200'
                                : 'border-white/10 bg-white/5 text-slate-300'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold uppercase tracking-wider">
                                {m.sender_type || 'User'}
                              </span>
                              <span>
                                {new Date(m.created_at).toLocaleTimeString(
                                  'en-IN',
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{m.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Portal Link */}
        <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-6 py-4">
          <div className="text-xs text-slate-400">
            {type === 'order' &&
              'Order details synchronized with Orders Department'}
            {type === 'product' &&
              'Product catalog details synchronized with Operations'}
            {type === 'ticket' &&
              'Support ticket synchronized with Customer Support'}
          </div>

          <div className="flex items-center gap-2">
            {data && type === 'order' && (
              <Link
                href={`/portal-orders/${data.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Orders Portal
              </Link>
            )}
            {data && type === 'product' && (
              <Link
                href={`/operations/products/${data.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View in Products Portal
              </Link>
            )}
            {data && type === 'ticket' && (
              <Link
                href={`/support/tickets/${data.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Support Ticket
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
