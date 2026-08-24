'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  Wallet,
  X,
  Key,
  Mail,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendPasswordResetLink, setAuthPassword } from '../actions/auth';

export interface UserRecord {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: 'customer' | 'staff' | 'manager' | 'admin';
  wallet_balance: number;
  reward_coins: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'all' | 'customer' | 'staff' | 'admin'
  >('all');

  // Role Edit Modal
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    'customer' | 'staff' | 'manager' | 'admin'
  >('customer');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Balance Adjust Modal
  const [adjustingUser, setAdjustingUser] = useState<UserRecord | null>(null);
  const [walletAmount, setWalletAmount] = useState<string>('');
  const [coinsAmount, setCoinsAmount] = useState<string>('');
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  // Set Password Modal
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('admin_get_all_users');

      if (error) throw error;
      setUsers((data as UserRecord[]) || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError('Failed to load users from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setIsUpdatingRole(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: editingUser.id,
        new_role: selectedRole,
      });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, role: selectedRole } : u
        )
      );
      setEditingUser(null);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      alert(
        'Failed to update user role. Make sure you have admin permissions.'
      );
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleSaveBalance = async () => {
    if (!adjustingUser) return;
    setIsUpdatingBalance(true);
    try {
      const newWallet =
        walletAmount !== ''
          ? parseFloat(walletAmount)
          : adjustingUser.wallet_balance;
      const newCoins =
        coinsAmount !== ''
          ? parseInt(coinsAmount, 10)
          : adjustingUser.reward_coins;

      const supabase = createClient();
      const { error } = await supabase.rpc('admin_update_user_balance', {
        target_user_id: adjustingUser.id,
        new_wallet: newWallet,
        new_coins: newCoins,
      });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === adjustingUser.id
            ? { ...u, wallet_balance: newWallet, reward_coins: newCoins }
            : u
        )
      );
      setAdjustingUser(null);
    } catch (err: any) {
      console.error('Failed to adjust balances:', err);
      alert('Failed to update user balances.');
      setIsUpdatingBalance(false);
    }
  };

  const handleSendResetLink = async (email: string) => {
    if (
      !confirm(
        `Are you sure you want to send a password reset link to ${email}?`
      )
    )
      return;
    try {
      const res = await sendPasswordResetLink(email);
      if (res.error) throw new Error(res.error);
      alert(`Password reset link sent to ${email} successfully!`);
    } catch (err: any) {
      console.error('Failed to send reset link:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordUser || !newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await setAuthPassword(passwordUser.id, newPassword);
      if (res.error) throw new Error(res.error);

      alert(`Password updated successfully for ${passwordUser.email}!`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      console.error('Failed to update password:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.full_name?.toLowerCase() || '').includes(
        searchQuery.toLowerCase()
      ) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone || '').includes(searchQuery);

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'customer' && user.role === 'customer') ||
      (roleFilter === 'staff' &&
        (user.role === 'staff' || user.role === 'manager')) ||
      (roleFilter === 'admin' && user.role === 'admin');

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Admin
          </span>
        );
      case 'manager':
      case 'staff':
        return (
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Staff
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Customer
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Page Title & Refresh */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/5 pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center space-x-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            <Users className="h-3.5 w-3.5" />
            <span>User & Privilege Manager</span>
          </div>
          <h1 className="text-2xl font-bold text-white">User Directory</h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage customer accounts, staff permissions, wallets, and reward
            coins.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center space-x-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total Registered Users
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Customers
          </p>
          <p className="mt-1 text-2xl font-bold text-white">
            {users.filter((u) => u.role === 'customer').length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Admins & Staff
          </p>
          <p className="mt-1 text-2xl font-bold text-purple-400">
            {users.filter((u) => u.role !== 'customer').length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Total User Wallets
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            ₹
            {users
              .reduce((acc, u) => acc + (Number(u.wallet_balance) || 0), 0)
              .toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Controls: Search & Role Filters */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#131726] p-4 md:flex-row">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex w-full items-center space-x-1 rounded-xl bg-white/5 p-1 text-xs font-semibold md:w-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              roleFilter === 'all'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('customer')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              roleFilter === 'customer'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Customers ({users.filter((u) => u.role === 'customer').length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              roleFilter === 'admin'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Admins ({users.filter((u) => u.role === 'admin').length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500">
          Loading user directory from Supabase...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#131726] py-16 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-slate-700" />
          <p className="font-medium text-slate-400">No users found.</p>
          <p className="mt-1 text-xs text-slate-600">
            Try adjusting your search query or role filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#131726]">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Wallet Balance</th>
                <th className="p-4 text-right">Reward Coins</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-400">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-white/5"
                >
                  <td className="p-4 pl-6">
                    <div className="font-semibold text-slate-200">
                      {user.full_name || 'Anonymous User'}
                    </div>
                    <div className="font-mono text-[10px] text-slate-600">
                      {user.email}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-500">
                    {user.phone || 'N/A'}
                  </td>
                  <td className="p-4">{getRoleBadge(user.role)}</td>
                  <td className="p-4 text-right font-bold text-white">
                    ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-right font-bold text-amber-400">
                    🪙 {Number(user.reward_coins || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="space-x-2 whitespace-nowrap p-4 pr-6 text-right">
                    <button
                      onClick={() => handleSendResetLink(user.email)}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-400 transition-colors hover:bg-sky-500/20"
                      title="Send Password Reset Link"
                    >
                      <Mail className="h-3 w-3 text-sky-500" /> Link
                    </button>
                    <button
                      onClick={() => {
                        setPasswordUser(user);
                        setNewPassword('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-semibold text-indigo-400 transition-colors hover:bg-indigo-500/20"
                      title="Set Password Directly"
                    >
                      <Key className="h-3 w-3 text-indigo-400" /> Pass
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setSelectedRole(user.role);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-semibold text-slate-300 transition-colors hover:bg-white/10"
                    >
                      <Shield className="h-3 w-3 text-slate-500" /> Role
                    </button>
                    <button
                      onClick={() => {
                        setAdjustingUser(user);
                        setWalletAmount(user.wallet_balance.toString());
                        setCoinsAmount(user.reward_coins.toString());
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      <Wallet className="h-3 w-3 text-amber-500" /> Funds
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#1e2235] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">Update User Role</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-400">
              <p>
                <strong className="text-slate-200">User:</strong>{' '}
                {editingUser.full_name || 'Anonymous'}
              </p>
              <p>
                <strong className="text-slate-200">Email:</strong>{' '}
                {editingUser.email}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Select New Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="customer" className="bg-[#1e2235] text-white">
                  Customer (Standard User)
                </option>
                <option value="staff" className="bg-[#1e2235] text-white">
                  Staff (Catalog & Fulfillment)
                </option>
                <option value="manager" className="bg-[#1e2235] text-white">
                  Manager (Full Operations)
                </option>
                <option value="admin" className="bg-[#1e2235] text-white">
                  Administrator (Full Control)
                </option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isUpdatingRole}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isUpdatingRole ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Funds/Coins Modal */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#1e2235] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">
                Adjust Wallet & Reward Coins
              </h3>
              <button
                onClick={() => setAdjustingUser(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-400">
              <p>
                <strong className="text-slate-200">User:</strong>{' '}
                {adjustingUser.full_name || 'Anonymous'}
              </p>
              <p>
                <strong className="text-slate-200">Email:</strong>{' '}
                {adjustingUser.email}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-500">
                  Wallet Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-500">
                  Reward Coins (🪙)
                </label>
                <input
                  type="number"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setAdjustingUser(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBalance}
                disabled={isUpdatingBalance}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isUpdatingBalance ? 'Saving...' : 'Update Balances'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#1e2235] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white">
                Set User Password
              </h3>
              <button
                onClick={() => setPasswordUser(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-400">
              <p>
                <strong className="text-slate-200">User:</strong>{' '}
                {passwordUser.full_name || 'Anonymous'}
              </p>
              <p>
                <strong className="text-slate-200">Email:</strong>{' '}
                {passwordUser.email}
              </p>
              <p className="mt-2 italic text-rose-400">
                Warning: This will overwrite their existing password immediately
                without requiring current password confirmation.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                New Password
              </label>
              <input
                type="text"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPasswordUser(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassword}
                disabled={isUpdatingPassword || newPassword.length < 6}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
