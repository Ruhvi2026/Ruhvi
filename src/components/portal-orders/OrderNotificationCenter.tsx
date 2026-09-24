'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Package,
  AlertTriangle,
  RotateCcw,
  ArchiveX,
  RefreshCw,
  ShieldAlert,
  X,
  CheckCheck,
  ExternalLink,
  Clock,
  CheckCircle2,
  Filter,
  Activity,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

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

export interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  newOrdersCount: number;
  slaBreachCount: number;
  cancellationCount: number;
  returnsCount: number;
  rtoCount: number;
  refundsCount: number;
  accountHealthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
}

export function OrderNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotificationItem[]>(
    []
  );
  const [summary, setSummary] = useState<NotificationSummary>({
    totalNotifications: 0,
    unreadCount: 0,
    newOrdersCount: 0,
    slaBreachCount: 0,
    cancellationCount: 0,
    returnsCount: 0,
    rtoCount: 0,
    refundsCount: 0,
    accountHealthStatus: 'GOOD',
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const drawerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/portal-orders/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch order notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime orders changes
    const channel = supabase
      .channel('order_notifications_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          fetchNotifications(false);
          const newStatus = (payload.new as any)?.status;
          const orderNum = (payload.new as any)?.order_number || 'Order';

          if (payload.eventType === 'INSERT') {
            toast(`📦 New Order #${orderNum} received!`, {
              icon: '🎉',
              style: {
                borderRadius: '12px',
                background: '#1c1917',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              },
            });
          } else if (payload.eventType === 'UPDATE') {
            toast(
              `Order #${orderNum} status updated to ${newStatus?.toUpperCase()}`,
              {
                icon: '🔔',
                style: {
                  borderRadius: '12px',
                  background: '#1c1917',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                },
              }
            );
          }
        }
      )
      .subscribe();

    // Auto polling every 45s as fallback
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 45000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  // Close drawer on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(new Set(allIds));
    toast.success('All notifications marked as read');
  };

  const isNotificationRead = (n: OrderNotificationItem) => {
    return n.read || readIds.has(n.id);
  };

  const effectiveUnreadCount = notifications.filter(
    (n) => !isNotificationRead(n)
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SLA_ALERT') return n.category === 'SLA_ALERT';
    if (activeTab === 'NEW_ORDER') return n.category === 'NEW_ORDER';
    if (activeTab === 'CANCELLATION') return n.category === 'CANCELLATION';
    if (activeTab === 'RETURN_RTO')
      return n.category === 'RETURN' || n.category === 'RTO';
    if (activeTab === 'REFUND') return n.category === 'REFUND';
    if (activeTab === 'ACCOUNT_HEALTH') return n.category === 'ACCOUNT_HEALTH';
    return true;
  });

  const getCategoryIcon = (category: string, severity: string) => {
    switch (category) {
      case 'SLA_ALERT':
        return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      case 'NEW_ORDER':
        return <ShoppingBag className="h-4 w-4 text-amber-400" />;
      case 'CANCELLATION':
        return <X className="h-4 w-4 text-red-400" />;
      case 'RETURN':
        return <RotateCcw className="h-4 w-4 text-orange-400" />;
      case 'RTO':
        return <ArchiveX className="h-4 w-4 text-purple-400" />;
      case 'REFUND':
        return <RefreshCw className="h-4 w-4 text-blue-400" />;
      case 'ACCOUNT_HEALTH':
        return <ShieldAlert className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="animate-pulse rounded-full border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            CRITICAL SLA
          </span>
        );
      case 'WARNING':
        return (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            WARNING
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            INFO
          </span>
        );
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        title="Order Notifications & SLA Alerts"
      >
        <Bell className="h-4 w-4 text-amber-400" />
        {effectiveUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] animate-pulse items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white shadow-lg ring-2 ring-[#0f0f17]">
            {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
          </span>
        )}
      </button>

      {/* Drawer / Popover Panel */}
      {isOpen && (
        <div
          ref={drawerRef}
          className="fixed right-2 top-16 z-50 w-full max-w-md rounded-2xl border border-white/15 bg-[#131726] shadow-2xl backdrop-blur-xl sm:right-4 sm:w-[440px]"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
                <Bell className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  Order Notifications
                  {summary.slaBreachCount > 0 && (
                    <span className="rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[9px] font-extrabold text-rose-400">
                      {summary.slaBreachCount} SLA Alerts
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time alerts for orders, returns & SLA delays
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchNotifications(true)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                title="Refresh notifications"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-4 gap-2 border-b border-white/5 bg-[#0f111d] p-3 text-center">
            <div className="rounded-lg border border-white/5 bg-white/5 p-1.5">
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                SLA Alerts
              </p>
              <p className="text-xs font-bold text-rose-400">
                {summary.slaBreachCount}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-1.5">
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                New Orders
              </p>
              <p className="text-xs font-bold text-amber-400">
                {summary.newOrdersCount}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-1.5">
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                Returns/RTO
              </p>
              <p className="text-xs font-bold text-orange-400">
                {summary.returnsCount + summary.rtoCount}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-1.5">
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                Refunds
              </p>
              <p className="text-xs font-bold text-blue-400">
                {summary.refundsCount}
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="scrollbar-none flex items-center gap-1 overflow-x-auto border-b border-white/5 p-2 text-[11px]">
            {[
              { id: 'ALL', label: 'All', count: notifications.length },
              {
                id: 'SLA_ALERT',
                label: 'SLA (>3 Days)',
                count: summary.slaBreachCount,
                color: 'text-rose-400',
              },
              {
                id: 'NEW_ORDER',
                label: 'New Orders',
                count: summary.newOrdersCount,
                color: 'text-amber-400',
              },
              {
                id: 'RETURN_RTO',
                label: 'Returns & RTO',
                count: summary.returnsCount + summary.rtoCount,
                color: 'text-orange-400',
              },
              {
                id: 'CANCELLATION',
                label: 'Cancelled',
                count: summary.cancellationCount,
              },
              { id: 'REFUND', label: 'Refunds', count: summary.refundsCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'border border-amber-500/40 bg-amber-500/20 font-semibold text-amber-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1 text-[10px] opacity-80 ${tab.color || ''}`}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] divide-y divide-white/5 overflow-y-auto p-2">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-xs text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin text-amber-400" />
                Loading order alerts...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="h-6 w-6 text-emerald-400/60" />
                No active order notifications in this view.
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isRead = isNotificationRead(n);
                return (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-3 rounded-xl p-3 transition-all ${
                      isRead
                        ? 'bg-transparent opacity-75'
                        : 'bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Category Icon */}
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      {getCategoryIcon(n.category, n.severity)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-white">
                          {n.title}
                        </span>
                        {getSeverityBadge(n.severity)}
                      </div>

                      <p className="mt-1 break-words text-[11px] leading-snug text-slate-300">
                        {n.message}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(n.timestamp)}
                          </span>
                          {n.ageDays !== undefined && n.ageDays > 0 && (
                            <span className="rounded border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-300">
                              {n.ageDays}d pending
                            </span>
                          )}
                        </div>

                        {n.actionUrl && (
                          <Link
                            href={n.actionUrl}
                            onClick={() => {
                              markAsRead(n.id);
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 hover:underline"
                          >
                            View Order <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator / mark read */}
                    {!isRead && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400 transition-transform hover:scale-125"
                        title="Mark as read"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="flex items-center justify-between rounded-b-2xl border-t border-white/10 bg-[#0f111d] p-3">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-[11px] text-slate-400 transition-colors hover:text-amber-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>

            <Link
              href="/portal-orders/all"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline"
            >
              All Portal Orders &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
