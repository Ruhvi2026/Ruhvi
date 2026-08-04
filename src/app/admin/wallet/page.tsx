'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, Search, RefreshCw, Edit2, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface WalletUser {
  id: string;
  full_name: string | null;
  email: string;
  wallet_balance: number;
  reward_coins: number;
}

export default function AdminWalletPage() {
  const [users, setUsers] = useState<WalletUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWallet, setEditWallet] = useState('');
  const [editCoins, setEditCoins] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, wallet_balance, reward_coins')
        .order('wallet_balance', { ascending: false });
      setUsers((data as WalletUser[]) || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('users').update({
        wallet_balance: parseFloat(editWallet) || 0,
        reward_coins: parseInt(editCoins) || 0,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
      setUsers((prev) => prev.map((u) => u.id === userId
        ? { ...u, wallet_balance: parseFloat(editWallet) || 0, reward_coins: parseInt(editCoins) || 0 }
        : u
      ));
      setEditingId(null);
    } catch {
      alert('Failed to update balances.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() =>
    users.filter((u) =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  );

  const totalWallet = users.reduce((s, u) => s + Number(u.wallet_balance), 0);
  const totalCoins = users.reduce((s, u) => s + Number(u.reward_coins), 0);
  const usersWithBalance = users.filter((u) => u.wallet_balance > 0).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Wallet & Coins</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage customer store credit and reward coins</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg hover:bg-white/10 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Outstanding Wallet', value: `₹${totalWallet.toLocaleString('en-IN')}`, color: 'text-emerald-400' },
          { label: 'Total Reward Coins', value: `🪙 ${totalCoins.toLocaleString('en-IN')}`, color: 'text-amber-400' },
          { label: 'Users With Balance', value: usersWithBalance.toString(), color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-[#131726] border border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Table */}
      <div className="bg-[#131726] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading wallet data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Customer</th>
                  <th className="px-5 py-3 text-right font-semibold">Wallet Balance</th>
                  <th className="px-5 py-3 text-right font-semibold">Reward Coins</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-slate-200 font-medium">{user.full_name || 'Anonymous'}</div>
                      <div className="text-slate-600 text-[10px]">{user.email}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === user.id ? (
                        <input
                          type="number"
                          value={editWallet}
                          onChange={(e) => setEditWallet(e.target.value)}
                          className="w-24 px-2 py-1 bg-white/5 border border-emerald-500/30 rounded-lg text-white text-right focus:outline-none"
                        />
                      ) : (
                        <span className={`font-semibold ${user.wallet_balance > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          ₹{Number(user.wallet_balance).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === user.id ? (
                        <input
                          type="number"
                          value={editCoins}
                          onChange={(e) => setEditCoins(e.target.value)}
                          className="w-24 px-2 py-1 bg-white/5 border border-amber-500/30 rounded-lg text-white text-right focus:outline-none"
                        />
                      ) : (
                        <span className={`font-semibold ${user.reward_coins > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          🪙 {Number(user.reward_coins).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleSave(user.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Save className="w-3 h-3" />
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(user.id);
                            setEditWallet(user.wallet_balance.toString());
                            setEditCoins(user.reward_coins.toString());
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors border border-white/10 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
