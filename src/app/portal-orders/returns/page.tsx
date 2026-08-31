'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, CheckCircle, XCircle, Package, Search, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ReturnRecord {
  id: string;
  order_id: string;
  order?: { order_number: string; total: number };
  reason: string;
  status: string;
  refund_method: string;
  item_condition: string;
  comments?: string;
  requested_at: string;
  resolved_at?: string;
}

export default function ReturnsManagementPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => { fetchReturns(); }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('returns')
        .select('*, order:orders(order_number, total)')
        .order('requested_at', { ascending: false });
      setReturns((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (returnId: string, action: 'approve' | 'reject' | 'receive') => {
    setActionId(returnId);
    try {
      const res = await fetch('/api/admin/orders/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId, action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchReturns();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; cls: string }> = {
      requested: { label: 'Requested', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      approved: { label: 'Approved', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      rejected: { label: 'Rejected', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
      completed: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    };
    const c = config[status] || { label: status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Returns Management</h1>
          <p className="mt-0.5 text-xs text-slate-500">{returns.length} total requests</p>
        </div>
        <button onClick={fetchReturns} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center text-slate-500">Loading...</div>
      ) : returns.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-16 text-center">
          <RotateCcw className="mx-auto mb-4 h-12 w-12 text-slate-700" />
          <h2 className="text-lg font-semibold text-white">No Return Requests</h2>
          <p className="mt-1 text-sm text-slate-400">All returns have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((ret) => (
            <div key={ret.id} className="rounded-xl border border-white/5 bg-[#131726] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white">Order #{ret.order?.order_number || ret.order_id.slice(0, 8)}</h3>
                    {getStatusBadge(ret.status)}
                  </div>
                  <p className="text-xs text-slate-400">Reason: {ret.reason}</p>
                  {ret.comments && <p className="text-xs text-slate-500">Notes: {ret.comments}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Condition: {ret.item_condition}</span>
                    <span>Refund: {ret.refund_method}</span>
                    <span>Requested: {new Date(ret.requested_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {ret.status === 'requested' && (
                    <>
                      <button
                        onClick={() => handleAction(ret.id, 'approve')}
                        disabled={actionId === ret.id}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(ret.id, 'reject')}
                        disabled={actionId === ret.id}
                        className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                  {ret.status === 'approved' && (
                    <button
                      onClick={() => handleAction(ret.id, 'receive')}
                      disabled={actionId === ret.id}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Mark Received
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}