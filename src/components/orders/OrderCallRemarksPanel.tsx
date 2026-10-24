'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Calendar,
  MessageSquare,
  ShieldAlert,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { OrderCallRemark, OrderCallStatus } from '@/types/database';
import toast from 'react-hot-toast';

interface OrderCallRemarksPanelProps {
  orderId: string;
  customerPhone?: string | null;
  customerName?: string | null;
  returnId?: string | null;
  onRemarkLogged?: () => void;
  className?: string;
}

interface ActiveCallInfo {
  isInProgress: boolean;
  staffId?: string | null;
  staffName?: string;
  department?: string;
  startedAt?: string;
  elapsedMinutes?: number;
}

const STATUS_CONFIG: Record<
  OrderCallStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeBg: string;
    borderColor: string;
  }
> = {
  calling_in_progress: {
    label: 'Calling In Progress',
    icon: PhoneCall,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  connected_resolved: {
    label: 'Connected / Resolved',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  customer_unreachable: {
    label: 'Customer Unreachable',
    icon: Phone,
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  rescheduled: {
    label: 'Rescheduled / Call Later',
    icon: Calendar,
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  rto_confirmed: {
    label: 'RTO Confirmed',
    icon: AlertTriangle,
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  return_coordination_scheduled: {
    label: 'Return Pickup Coordinated',
    icon: RotateCcw,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  cancelled: {
    label: 'Order Cancelled',
    icon: XCircle,
    color: 'text-red-400',
    badgeBg: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  other: {
    label: 'Internal Remark',
    icon: MessageSquare,
    color: 'text-slate-400',
    badgeBg: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
};

const QUICK_TEMPLATES = [
  'Customer requested evening delivery (4 PM - 7 PM)',
  'Address incorrect; customer shared new landmark on call',
  'Customer phone unreachable; automated SMS sent',
  'Customer confirmed they will accept delivery tomorrow',
  'Customer rejected parcel due to courier delivery delay',
  'Coordinated reverse pickup time with customer',
];

export default function OrderCallRemarksPanel({
  orderId,
  customerPhone,
  customerName,
  returnId,
  onRemarkLogged,
  className = '',
}: OrderCallRemarksPanelProps) {
  const [remarks, setRemarks] = useState<OrderCallRemark[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState<boolean>(false);

  // Form states
  const [selectedStatus, setSelectedStatus] = useState<OrderCallStatus>(
    'calling_in_progress'
  );
  const [remarkText, setRemarkText] = useState<string>('');
  const [rescheduledDate, setRescheduledDate] = useState<string>('');

  const maskPhone = (phone?: string | null): string => {
    if (!phone) return 'Not Available';
    const clean = phone.trim();
    if (clean.length < 7) return clean;
    const prefix = clean.slice(0, Math.min(6, clean.length - 4));
    const suffix = clean.slice(-2);
    return `${prefix} •••• ${suffix}`;
  };

  const fetchRemarks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/portal-orders/call-remarks?orderId=${encodeURIComponent(orderId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setRemarks(data.remarks || []);
        setActiveCall(data.activeCall || { isInProgress: false });
      }
    } catch (err) {
      console.error('Failed to load call remarks:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchRemarks();
    // Auto-poll collision status every 30 seconds
    const interval = setInterval(fetchRemarks, 30000);
    return () => clearInterval(interval);
  }, [fetchRemarks]);

  const handleSubmitRemark = async (
    statusOverride?: OrderCallStatus,
    textOverride?: string
  ) => {
    const status = statusOverride || selectedStatus;
    const text = (
      textOverride !== undefined ? textOverride : remarkText
    ).trim();

    if (!text) {
      toast.error('Please enter a remark or notes for this call.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/portal-orders/call-remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          returnId: returnId || null,
          callStatus: status,
          remarkText: text,
          rescheduledDate:
            status === 'rescheduled' && rescheduledDate
              ? rescheduledDate
              : null,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === 'COLLISION_DETECTED') {
        const confirmOverride = window.confirm(
          `⚠️ COLLISION WARNING:\n${data.message}\n\nDo you still want to claim this call?`
        );
        if (confirmOverride) {
          // Retry with force
          const forceRes = await fetch('/api/portal-orders/call-remarks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId,
              returnId: returnId || null,
              callStatus: status,
              remarkText: text,
              rescheduledDate:
                status === 'rescheduled' && rescheduledDate
                  ? rescheduledDate
                  : null,
              force: true,
            }),
          });
          if (forceRes.ok) {
            toast.success(
              'Remark recorded successfully (Collision Overridden)'
            );
            setRemarkText('');
            setRescheduledDate('');
            fetchRemarks();
            if (onRemarkLogged) onRemarkLogged();
          }
        }
        return;
      }

      if (!res.ok) {
        toast.error(data.error || 'Failed to record remark');
        return;
      }

      toast.success(
        status === 'calling_in_progress'
          ? 'Call started! Customer claimed to prevent duplicate calls.'
          : 'Remark logged successfully.'
      );
      setRemarkText('');
      setRescheduledDate('');
      fetchRemarks();
      if (onRemarkLogged) onRemarkLogged();
    } catch (err: any) {
      console.error(err);
      toast.error('Network error saving call remark');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickClaimCall = () => {
    if (activeCall?.isInProgress) {
      const proceed = window.confirm(
        `⚠️ COLLISION ALERT: ${activeCall.staffName} (${activeCall.department}) is ALREADY calling this customer (started ${activeCall.elapsedMinutes}m ago).\n\nAre you sure you want to call now?`
      );
      if (!proceed) return;
    }
    setIsPhoneRevealed(true);
    handleSubmitRemark(
      'calling_in_progress',
      `Dialing customer ${customerName || ''}... Claimed phone line.`
    );
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#131726] p-6 shadow-xl backdrop-blur-md ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-white">
              Customer Call Log & Collision Guard
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                RuhChat Anti-Collision
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Claim customer calls to avoid double-calling failed deliveries and
              RTO orders.
            </p>
          </div>
        </div>

        <button
          onClick={fetchRemarks}
          disabled={loading}
          title="Refresh call log"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Collision Warning Banner */}
      {activeCall?.isInProgress && (
        <div className="mt-4 animate-pulse rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-300">
                ⚠️ COLLISION WARNING: ACTIVE CALL IN PROGRESS
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-rose-200/90">
                <span className="font-semibold text-white">
                  {activeCall.staffName}
                </span>{' '}
                from{' '}
                <span className="font-semibold capitalize text-white">
                  {activeCall.department}
                </span>{' '}
                is actively calling this customer right now (initiated{' '}
                <span className="font-semibold text-white">
                  {activeCall.elapsedMinutes === 0
                    ? 'just now'
                    : `${activeCall.elapsedMinutes} min ago`}
                </span>
                ).
              </p>
              <p className="mt-2 text-[11px] text-rose-300/80">
                Please do NOT place another call simultaneously. Review past
                notes below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Calling Box */}
      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs text-slate-400">
              Customer Phone (Protected PII)
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-base font-bold tracking-wider text-white">
                {isPhoneRevealed
                  ? customerPhone || 'No phone recorded'
                  : maskPhone(customerPhone)}
              </span>
              <button
                type="button"
                onClick={() => setIsPhoneRevealed(!isPhoneRevealed)}
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {isPhoneRevealed ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Reveal
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                onClick={handleQuickClaimCall}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-500"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call & Claim Customer</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Log Remark Form */}
      <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Log Call Outcome / Remarks
        </h3>

        {/* Status Selector Pills */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(STATUS_CONFIG) as OrderCallStatus[]).map(
            (statusKey) => {
              const config = STATUS_CONFIG[statusKey];
              const Icon = config.icon;
              const isSelected = selectedStatus === statusKey;

              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setSelectedStatus(statusKey)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
                    isSelected
                      ? `${config.badgeBg} ${config.borderColor} ${config.color} shadow-md ring-1 ring-amber-500/50`
                      : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{config.label}</span>
                </button>
              );
            }
          )}
        </div>

        {/* Reschedule Date Input (Conditional) */}
        {selectedStatus === 'rescheduled' && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
            <label className="mb-1 block text-xs font-semibold text-sky-300">
              Select Rescheduled Callback Date & Time
            </label>
            <input
              type="datetime-local"
              value={rescheduledDate}
              onChange={(e) => setRescheduledDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
            />
          </div>
        )}

        {/* Quick Template Chips */}
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-slate-400">
            Quick Presets:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRemarkText(tmpl)}
                className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {tmpl}
              </button>
            ))}
          </div>
        </div>

        {/* Remark Textarea */}
        <div>
          <textarea
            rows={3}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Type customer call notes, agreed delivery slot, cancellation reason, or follow-up instructions..."
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleSubmitRemark()}
            disabled={submitting || !remarkText.trim()}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-900/20 transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Remark...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Call Remark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Timeline History */}
      <div className="mt-8 border-t border-white/10 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-serif text-sm font-bold text-white">
            <Clock className="h-4 w-4 text-slate-400" />
            Call History & Activity Timeline
          </h3>
          <span className="font-mono text-xs text-slate-500">
            {remarks.length} {remarks.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {remarks.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.01] py-8 text-center text-slate-500">
            <Phone className="mx-auto mb-2 h-7 w-7 text-slate-600 opacity-60" />
            <p className="text-xs">No calls logged yet for this order.</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Claim this customer or log a remark to keep the team synced.
            </p>
          </div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {remarks.map((item) => {
              const config =
                STATUS_CONFIG[item.call_status] || STATUS_CONFIG.other;
              const Icon = config.icon;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3.5 ${config.borderColor} ${config.badgeBg} transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 ${config.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className={`text-xs font-bold ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                    {item.remark_text}
                  </p>

                  {item.rescheduled_date && (
                    <div className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-300">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Rescheduled for:{' '}
                        {new Date(item.rescheduled_date).toLocaleString(
                          'en-IN',
                          {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-2 text-[10px] text-slate-400">
                    <span className="rounded bg-white/5 px-2 py-0.5 font-medium text-slate-300">
                      By: {item.staff_name}
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5 capitalize text-slate-400">
                      Dept: {item.department}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
