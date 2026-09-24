'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  MoreVertical,
  MessageSquare,
  Server,
  Zap,
  Shield,
  Database,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    case 'SYSTEM':
      return { icon: Database, color: 'text-red-500', bg: 'bg-red-500/10' };
    case 'API':
      return { icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    case 'SECURITY':
      return { icon: Shield, color: 'text-orange-500', bg: 'bg-orange-500/10' };
    case 'DEPLOYMENT':
      return { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10' };
    case 'SUPPORT_TAG':
      return {
        icon: MessageSquare,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
      };
    default:
      return { icon: Info, color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
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
  if (notif.reference_type === 'ai_failure_diagnostics') return `/tech/sentry`;
  if (notif.reference_type === 'audit_log') return '/tech/audit-logs';
  if (notif.reference_type === 'ticket')
    return `/support/tickets/${notif.reference_id}`;
  return '/tech/dashboard';
};

export default function TechNotifications() {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('tech_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'target_department=eq.tech',
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: 'target_department=eq.tech',
        },
        (payload) => {
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
      .eq('target_department', 'tech')
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'mentions') return notif.category === 'SUPPORT_TAG';
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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
            <Bell className="h-6 w-6 text-neutral-500" />
            Tech Notifications
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Real-time system alerts, API logs, and deployment events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllAsRead}
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
          >
            Mark all as read
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row">
        <div className="flex space-x-1 border-b border-neutral-200 pr-4 dark:border-neutral-800 sm:border-b-0 sm:border-r">
          {['all', 'unread', 'mentions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {tab}
              {tab === 'unread' && (
                <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[10px] text-white dark:bg-white dark:text-black">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <AnimatePresence>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const {
                  icon: Icon,
                  color,
                  bg,
                } = getIconForCategory(notif.category);
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex gap-4 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                      !notif.read ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''
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
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                            )}
                          </div>
                          <p className="mt-1 font-mono text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {notif.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 whitespace-nowrap text-xs text-neutral-400">
                            <Clock className="h-3 w-3" />{' '}
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <Link
                          href={getLinkForNotification(notif)}
                          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
                        >
                          Investigate
                        </Link>
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-white"
                          >
                            Resolve & Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <CheckCircle2 className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Systems Nominal
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  You have no {activeTab !== 'all' ? activeTab : ''} tech
                  alerts.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
