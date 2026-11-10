'use client';

import React from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Package,
  ShoppingCart,
  AlertCircle,
  MessageCircle,
  Clock,
} from 'lucide-react';

function formatTimeAgo(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
}

function getNotificationIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case 'order':
      return <ShoppingCart className="h-4 w-4 text-emerald-400" />;
    case 'return':
      return <Package className="h-4 w-4 text-amber-400" />;
    case 'chat':
    case 'mention':
      return <MessageCircle className="h-4 w-4 text-violet-400" />;
    case 'alert':
    case 'system':
      return <AlertCircle className="h-4 w-4 text-rose-400" />;
    default:
      return <Bell className="h-4 w-4 text-blue-400" />;
  }
}

export function NotificationPanel() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
      {/* Subheader bar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 bg-[#13192B] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-bold text-white">
            Live System Alerts
          </span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
              {unreadCount > 99 ? '99+' : unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/10"
            title="Mark all notifications as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 divide-y divide-white/5 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center px-4 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-slate-300">
              All caught up!
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              No new alerts or pending system notifications.
            </p>
          </div>
        ) : (
          notifications.map((item) => {
            const isUnread = !item.read;
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isUnread) markAsRead(item.id);
                }}
                className={`group flex cursor-pointer items-start gap-3 p-3 transition hover:bg-white/[0.04] ${
                  isUnread ? 'bg-amber-500/[0.03]' : ''
                }`}
              >
                {/* Icon avatar */}
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition ${
                    isUnread
                      ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                      : 'bg-white/5'
                  }`}
                >
                  {getNotificationIcon(item.type)}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <h5
                      className={`truncate text-xs leading-snug ${
                        isUnread
                          ? 'font-bold text-white'
                          : 'font-medium text-slate-300'
                      }`}
                    >
                      {item.title}
                    </h5>
                    <span className="flex flex-shrink-0 items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>

                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                    {item.message}
                  </p>

                  {item.link && (
                    <div className="mt-1.5">
                      <Link
                        href={item.link}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isUnread) markAsRead(item.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/15 hover:text-emerald-300"
                      >
                        <span>View details</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Unread dot */}
                {isUnread && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
