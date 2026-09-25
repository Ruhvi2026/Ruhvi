'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  MoreVertical,
  Headphones,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Notification {
  id: string;
  target_department: string;
  title: string;
  message: string;
  read: boolean;
  category: string;
  reference_type: string;
  reference_id: string;
  created_at: string;
  actor_id?: string;
}

const getIconForCategory = (category: string) => {
  switch (category) {
    case 'SLA_BREACH':
      return {
        icon: AlertTriangle,
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
      };
    case 'TECH_TAG':
      return {
        icon: MessageSquare,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10',
      };
    case 'OPERATIONS_TAG':
      return {
        icon: MessageSquare,
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10',
      };
    default:
      return { icon: Info, color: 'text-slate-500', bg: 'bg-slate-500/10' };
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return `${Math.floor(diffInHours / 24)} days ago`;
};

const getLinkForNotification = (notif: Notification) => {
  if (notif.reference_type === 'ticket')
    return `/support/tickets/${notif.reference_id}`;
  return '/support/dashboard';
};

export default function SupportNotifications() {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('support_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'target_department=eq.support',
        },
        (payload: any) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: 'target_department=eq.support',
        },
        (payload: any) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id ? (payload.new as Notification) : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_department', 'support')
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'mentions') return notif.category.includes('TAG');
    return true;
  });

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Bell className="h-6 w-6 text-indigo-400" />
            Support Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Cross-department tags and helpdesk alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllAsRead}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#0d0f1a] p-4 shadow-sm sm:flex-row">
        <div className="flex space-x-1 border-b border-white/10 pr-4 sm:border-b-0 sm:border-r">
          {['all', 'unread', 'mentions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              {tab === 'unread' && (
                <span className="ml-2 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] text-white">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0f1a] shadow-sm">
        <div className="divide-y divide-white/5">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const {
                icon: Icon,
                color,
                bg,
              } = getIconForCategory(notif.category);
              return (
                <div
                  key={notif.id}
                  className={`animate-in fade-in flex gap-4 p-4 transition-colors duration-200 hover:bg-white/5 ${
                    !notif.read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${bg}`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-200">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                          {notif.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-500">
                          <Clock className="h-3 w-3" />{' '}
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Link
                        href={getLinkForNotification(notif)}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
                      >
                        View Details
                      </Link>
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center p-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                <CheckCircle2 className="h-8 w-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-300">
                No Notifications
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                You're all caught up in support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
