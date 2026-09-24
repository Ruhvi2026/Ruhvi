'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Bell,
  Package,
  Users,
  Tag,
  Star,
  Settings,
  AlertCircle,
  FileText,
  KeyRound,
  Ticket,
  Clock,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: any;
  created_at: string;
}

export default function SystemAlertsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('audit_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        (payload: any) => {
          fetchLogs();
          toast('New System Notification', {
            icon: '🔔',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data) setLogs(data);
    } catch (err: any) {
      toast.error('Failed to load system notifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'orders':
      case 'products':
        return <Package className="h-5 w-5 text-emerald-500" />;
      case 'users':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'categories':
      case 'collections':
        return <Star className="h-5 w-5 text-amber-500" />;
      case 'coupons':
      case 'promotions':
        return <Tag className="h-5 w-5 text-rose-500" />;
      case 'blog_posts':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'api_keys':
        return <KeyRound className="h-5 w-5 text-slate-500" />;
      case 'support_tickets':
        return <Ticket className="h-5 w-5 text-indigo-500" />;
      case 'store_settings':
        return <Settings className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'insert':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatMessage = (log: AuditLog) => {
    const actor = log.actor_email || 'System';
    const entity = log.entity_type
      .replace('_', ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    const action = log.action.charAt(0).toUpperCase() + log.action.slice(1);

    return (
      <span>
        <span className="font-semibold text-slate-900">{actor}</span>{' '}
        {log.action}d {log.action === 'delete' ? 'a' : 'a'}{' '}
        <span className="font-medium text-slate-800">{entity}</span> (ID:{' '}
        {log.entity_id})
      </span>
    );
  };

  const filteredLogs =
    categoryFilter === 'all'
      ? logs
      : logs.filter((log) => {
          if (
            categoryFilter === 'operations' &&
            ['orders', 'products', 'categories', 'collections'].includes(
              log.entity_type
            )
          )
            return true;
          if (
            categoryFilter === 'marketing' &&
            ['coupons', 'promotions'].includes(log.entity_type)
          )
            return true;
          if (
            categoryFilter === 'support' &&
            ['support_tickets'].includes(log.entity_type)
          )
            return true;
          if (
            categoryFilter === 'tech' &&
            ['api_keys', 'store_settings'].includes(log.entity_type)
          )
            return true;
          if (
            categoryFilter === 'cms' &&
            ['blog_posts'].includes(log.entity_type)
          )
            return true;
          if (categoryFilter === 'users' && ['users'].includes(log.entity_type))
            return true;
          return false;
        });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center text-2xl font-bold tracking-tight text-slate-900">
            <Bell className="mr-2 h-6 w-6 text-emerald-600" />
            System Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time activity feed for operations, support, tech, and content
            changes.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <Filter className="ml-2 h-4 w-4 text-slate-400" />
          <select
            className="cursor-pointer border-none bg-transparent py-1.5 pl-2 pr-8 text-sm text-slate-700 focus:ring-0"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Activities</option>
            <option value="operations">Operations & Catalog</option>
            <option value="support">Support Tickets</option>
            <option value="marketing">Marketing & Promos</option>
            <option value="cms">Content (CMS)</option>
            <option value="tech">Tech & Settings</option>
            <option value="users">Users</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading system alerts...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <Bell className="mb-3 h-12 w-12 text-slate-200" />
            <h3 className="text-lg font-medium text-slate-900">
              No activities found
            </h3>
            <p className="mt-1 text-slate-500">
              There are no recent events in this category.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <li
                key={log.id}
                className="p-4 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0 rounded-lg border border-slate-100 bg-slate-50 p-2">
                    {getEntityIcon(log.entity_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-600">
                      {formatMessage(log)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
