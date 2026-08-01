'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, ArrowLeft, Package, Sparkles } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

export default function NotificationsInboxPage() {
  const router = useRouter();
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-6 gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/account"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl font-bold text-stone-900 flex items-center space-x-3">
              <Bell className="w-7 h-7 text-amber-900" />
              <span>Notifications Inbox</span>
            </h1>
            <p className="text-stone-500 text-xs mt-1">
              {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4 text-amber-800" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 text-xs border-b border-stone-100 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-amber-950 text-amber-100'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-amber-950 text-amber-100'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                !notif.read
                  ? 'bg-amber-950/5 border-amber-900/30 ring-1 ring-amber-900/10'
                  : 'bg-white border-stone-200 opacity-90'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notif.type === 'order'
                      ? 'bg-amber-100 text-amber-900'
                      : notif.type === 'promo'
                      ? 'bg-amber-500/20 text-amber-900'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {notif.type === 'order' ? (
                    <Package className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-stone-900">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{notif.message}</p>
                  <div className="text-[10px] font-mono text-stone-400 pt-1">
                    {notif.created_at
                      ? new Date(notif.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently'}
                  </div>
                </div>
              </div>

              {notif.link && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notif.id);
                    router.push(notif.link!);
                  }}
                  className="px-3 py-1.5 bg-white border border-stone-200 text-amber-900 hover:border-amber-400 text-xs font-semibold rounded-lg flex-shrink-0 hover:bg-amber-50 transition-colors"
                >
                  View Details
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900">No Notifications</h3>
          <p className="text-xs text-stone-500">You're all caught up! There are no notifications in this view.</p>
        </div>
      )}
    </div>
  );
}
