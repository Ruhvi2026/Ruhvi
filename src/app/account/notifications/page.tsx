'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  ArrowLeft,
  Package,
  Sparkles,
  Wallet,
  Megaphone,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

type CategoryFilter = 'ALL' | 'ORDERS' | 'WALLET' | 'OFFERS' | 'UPDATES';

export default function NotificationsInboxPage() {
  const router = useRouter();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    fetchNotifications,
    loading,
  } = useNotifications();
  const [filter, setFilter] = useState<CategoryFilter>('ALL');

  useEffect(() => {
    fetchNotifications(filter);
  }, [filter]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-3">
          <Link
            href="/account"
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900">
              <Bell className="h-7 w-7 text-amber-900" />
              <span>Notification Center</span>
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center space-x-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-900 transition-colors hover:bg-amber-100"
          >
            <Check className="h-4 w-4 text-amber-800" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="hide-scrollbar flex space-x-2 overflow-x-auto border-b border-stone-100 pb-2 text-xs">
        {(
          ['ALL', 'ORDERS', 'WALLET', 'OFFERS', 'UPDATES'] as CategoryFilter[]
        ).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition-colors ${
              filter === cat
                ? 'bg-amber-950 text-amber-100'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {cat === 'ALL'
              ? 'All Alerts'
              : cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-900"></div>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-5 transition-all ${
                !notif.read
                  ? 'border-amber-900/30 bg-amber-950/5 ring-1 ring-amber-900/10'
                  : 'border-stone-200 bg-white opacity-90'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    notif.category === 'ORDERS'
                      ? 'bg-blue-50 text-blue-700'
                      : notif.category === 'OFFERS'
                        ? 'bg-amber-100 text-amber-900'
                        : notif.category === 'WALLET'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {notif.category === 'ORDERS' ? (
                    <Package className="h-5 w-5" />
                  ) : notif.category === 'WALLET' ? (
                    <Wallet className="h-5 w-5" />
                  ) : notif.category === 'UPDATES' ? (
                    <Megaphone className="h-5 w-5" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-stone-900">
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-600" />
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-stone-600">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-stone-400">
                    <span>
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleDateString(
                            'en-IN',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : 'Recently'}
                    </span>
                    {notif.category && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-stone-500">
                        {notif.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {notif.image_url && (
                <div className="hidden flex-shrink-0 sm:block">
                  <img
                    src={notif.image_url}
                    alt="Notification media"
                    className="h-16 w-16 rounded-lg border border-stone-200 object-cover"
                  />
                </div>
              )}

              {notif.link && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif.id);
                    router.push(notif.link!);
                  }}
                  className="flex-shrink-0 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-50"
                >
                  View Details
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-stone-200 bg-white p-16 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <Bell className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900">
            No Notifications
          </h3>
          <p className="text-xs text-stone-500">
            You're all caught up! There are no notifications in this view.
          </p>
        </div>
      )}
    </div>
  );
}
