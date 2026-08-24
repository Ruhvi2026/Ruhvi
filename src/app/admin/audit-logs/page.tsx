'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  User,
  ShoppingBag,
  Package,
  Shield,
  Settings,
  Tag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ComponentType<any>> = {
  order: ShoppingBag,
  product: Package,
  user: User,
  coupon: Tag,
  settings: Settings,
  auth: Shield,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  update: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  delete: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  login: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  other: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function getActionColor(action: string): string {
  if (action.includes('create') || action.includes('add'))
    return ACTION_COLORS.create;
  if (
    action.includes('update') ||
    action.includes('edit') ||
    action.includes('change')
  )
    return ACTION_COLORS.update;
  if (action.includes('delete') || action.includes('remove'))
    return ACTION_COLORS.delete;
  if (action.includes('login') || action.includes('auth'))
    return ACTION_COLORS.login;
  return ACTION_COLORS.other;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        const matchEntity =
          entityFilter === 'all' || l.entity_type === entityFilter;
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          l.action?.toLowerCase().includes(q) ||
          l.entity_id?.toLowerCase().includes(q) ||
          l.actor_email?.toLowerCase().includes(q);
        return matchEntity && matchSearch;
      }),
    [logs, search, entityFilter]
  );

  const entityTypes = [
    'all',
    ...Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean))),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Logs</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Activity trail for all admin actions
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search action, entity, actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {entityTypes.map((t) => (
            <button
              key={t}
              onClick={() => setEntityFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                entityFilter === t
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t === 'all' ? 'All Events' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading audit logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              No audit logs found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left font-semibold">
                    Timestamp
                  </th>
                  <th className="px-5 py-3 text-left font-semibold">Actor</th>
                  <th className="px-5 py-3 text-left font-semibold">Action</th>
                  <th className="px-5 py-3 text-left font-semibold">Entity</th>
                  <th className="px-5 py-3 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((log) => {
                  const Icon = ACTION_ICONS[log.entity_type] || FileText;
                  const colorCls = getActionColor(log.action);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/2 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-500">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700">
                            <User className="h-3 w-3 text-slate-400" />
                          </div>
                          <span className="font-medium text-slate-300">
                            {log.actor_email || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${colorCls}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="capitalize">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="font-mono text-[10px] text-slate-600">
                              #{log.entity_id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-600">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
