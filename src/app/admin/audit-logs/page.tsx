'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { FileText, Search, RefreshCw, User, ShoppingBag, Package, Shield, Settings, Tag } from 'lucide-react';
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

const ACTION_ICONS: Record<string, React.ElementType> = {
  order:    ShoppingBag,
  product:  Package,
  user:     User,
  coupon:   Tag,
  settings: Settings,
  auth:     Shield,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  update: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  delete: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  login:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  other:  'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function getActionColor(action: string): string {
  if (action.includes('create') || action.includes('add')) return ACTION_COLORS.create;
  if (action.includes('update') || action.includes('edit') || action.includes('change')) return ACTION_COLORS.update;
  if (action.includes('delete') || action.includes('remove')) return ACTION_COLORS.delete;
  if (action.includes('login') || action.includes('auth')) return ACTION_COLORS.login;
  return ACTION_COLORS.other;
}

// Since a dedicated audit_logs table may not exist yet, we build a synthetic log from orders
export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [isTableCreated, setIsTableCreated] = useState(false);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Try to fetch from audit_logs table first
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      // If the error code is not '42P01' (undefined_table), it means the table exists
      if (!auditError || auditError.code !== '42P01') {
        setIsTableCreated(true);
        setLogs((auditData as AuditLog[]) || []);
      } else {
        setIsTableCreated(false);
        // Fallback: synthesize from orders table
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_number, status, created_at, updated_at, user_id')
          .order('created_at', { ascending: false })
          .limit(100);

        const synthetic: AuditLog[] = (orders || []).map((o: any) => ({
          id: `order-${o.id}`,
          actor_id: o.user_id || 'system',
          actor_email: 'customer',
          action: 'order.created',
          entity_type: 'order',
          entity_id: o.order_number,
          created_at: o.created_at,
        }));
        setLogs(synthetic);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() =>
    logs.filter((l) => {
      const matchEntity = entityFilter === 'all' || l.entity_type === entityFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || l.action?.toLowerCase().includes(q) || l.entity_id?.toLowerCase().includes(q) || l.actor_email?.toLowerCase().includes(q);
      return matchEntity && matchSearch;
    }),
    [logs, search, entityFilter]
  );

  const entityTypes = ['all', ...Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean)))];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-500 text-xs mt-0.5">Activity trail for all admin actions</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Note */}
      {!isTableCreated && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-400 font-medium">
            💡 For full audit logging, create an <code className="bg-blue-500/10 px-1 rounded">audit_logs</code> table in Supabase. 
            Currently showing synthesized activity from order data.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search action, entity, actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {entityTypes.map((t) => (
            <button
              key={t}
              onClick={() => setEntityFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                entityFilter === t
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {t === 'all' ? 'All Events' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No audit logs found</p>
            <p className="text-slate-600 text-xs mt-1">
              Create an audit_logs table in Supabase for full event tracking
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Timestamp</th>
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
                    <tr key={log.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3 text-slate-500 font-mono text-[10px]">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                            <User className="w-3 h-3 text-slate-400" />
                          </div>
                          <span className="text-slate-300 font-medium">
                            {log.actor_email || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border font-mono ${colorCls}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="capitalize">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-slate-600 font-mono text-[10px]">#{log.entity_id}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-[10px]">
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
