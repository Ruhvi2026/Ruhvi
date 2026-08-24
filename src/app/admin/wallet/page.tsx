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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc('admin_get_all_users');
      setUsers(
        ((data as WalletUser[]) || []).sort(
          (a, b) => b.wallet_balance - a.wallet_balance
        )
      );
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
      const newWallet = parseFloat(editWallet) || 0;
      const newCoins = parseInt(editCoins) || 0;
      await supabase.rpc('admin_update_user_balance', {
        target_user_id: userId,
        new_wallet: newWallet,
        new_coins: newCoins,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, wallet_balance: newWallet, reward_coins: newCoins }
            : u
        )
      );
      setEditingId(null);
    } catch {
      alert('Failed to update balances.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
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
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Wallet & Coins</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage customer store credit and reward coins
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Outstanding Wallet',
            value: `₹${totalWallet.toLocaleString('en-IN')}`,
            color: 'text-emerald-400',
          },
          {
            label: 'Total Reward Coins',
            value: `🪙 ${totalCoins.toLocaleString('en-IN')}`,
            color: 'text-amber-400',
          },
          {
            label: 'Users With Balance',
            value: usersWithBalance.toString(),
            color: 'text-blue-400',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/5 bg-[#131726] p-4"
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {s.label}
            </p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading wallet data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left font-semibold">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Wallet Balance
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Reward Coins
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-200">
                        {user.full_name || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === user.id ? (
                        <input
                          type="number"
                          value={editWallet}
                          onChange={(e) => setEditWallet(e.target.value)}
                          className="w-24 rounded-lg border border-emerald-500/30 bg-white/5 px-2 py-1 text-right text-white focus:outline-none"
                        />
                      ) : (
                        <span
                          className={`font-semibold ${user.wallet_balance > 0 ? 'text-emerald-400' : 'text-slate-500'}`}
                        >
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
                          className="w-24 rounded-lg border border-amber-500/30 bg-white/5 px-2 py-1 text-right text-white focus:outline-none"
                        />
                      ) : (
                        <span
                          className={`font-semibold ${user.reward_coins > 0 ? 'text-amber-400' : 'text-slate-500'}`}
                        >
                          🪙 {Number(user.reward_coins).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSave(user.id)}
                            disabled={saving}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                          >
                            <Save className="h-3 w-3" />
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(user.id);
                            setEditWallet(user.wallet_balance.toString());
                            setEditCoins(user.reward_coins.toString());
                          }}
                          className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition-colors hover:bg-white/10"
                        >
                          <Edit2 className="h-3 w-3" />
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
