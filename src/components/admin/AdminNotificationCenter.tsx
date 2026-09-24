'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  ShoppingBag,
  Bug,
  Ticket,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export function AdminNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [counts, setCounts] = useState({
    orders: 0,
    tickets: 0,
    bugs: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCounts = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const [ordersRes, ticketsRes, bugsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStr),
        supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStr),
        supabase
          .from('ai_failure_diagnostics')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStr),
      ]);

      setCounts({
        orders: ordersRes.count || 0,
        tickets: ticketsRes.count || 0,
        bugs: bugsRes.count || 0,
      });
    } catch (error) {
      console.error('Failed to fetch admin summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    const ordersChannel = supabase
      .channel('admin_orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          setCounts((prev) => ({ ...prev, orders: prev.orders + 1 }));
        }
      )
      .subscribe();

    const ticketsChannel = supabase
      .channel('admin_tickets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        () => {
          setCounts((prev) => ({ ...prev, tickets: prev.tickets + 1 }));
        }
      )
      .subscribe();

    const bugsChannel = supabase
      .channel('admin_bugs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_failure_diagnostics' },
        () => {
          setCounts((prev) => ({ ...prev, bugs: prev.bugs + 1 }));
        }
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(bugsChannel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const totalActivity = counts.orders + counts.tickets + counts.bugs;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        title="Admin Overview"
      >
        <Bell className="h-5 w-5" />
        {totalActivity > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#131726]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-[#131726] p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Today's Summary
            </h3>
            <button
              onClick={fetchCounts}
              className="text-slate-500 hover:text-slate-300"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <Link
              href="/admin/orders"
              className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-200">
                  New Orders
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-400">
                  {counts.orders}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </div>
            </Link>

            <Link
              href="/admin/support-analytics"
              className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Ticket className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-200">
                  Support Tickets
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-400">
                  {counts.tickets}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </div>
            </Link>

            <Link
              href="/admin/system-alerts"
              className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                  <Bug className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-200">
                  System Bugs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-rose-400">
                  {counts.bugs}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
