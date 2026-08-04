'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw, 
  UserCheck, 
  Shield, 
  Wallet, 
  Coins, 
  Edit, 
  Check, 
  X,
  Plus,
  Minus,
  Key,
  Mail
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
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'staff' | 'admin'>('all');

  // Role Edit Modal
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<'customer' | 'staff' | 'manager' | 'admin'>('customer');
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

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
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole, updated_at: new Date().toISOString() })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: selectedRole } : u));
      setEditingUser(null);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      alert('Failed to update user role. Make sure you have admin permissions.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleSaveBalance = async () => {
    if (!adjustingUser) return;
    setIsUpdatingBalance(true);
    try {
      const newWallet = walletAmount !== '' ? parseFloat(walletAmount) : adjustingUser.wallet_balance;
      const newCoins = coinsAmount !== '' ? parseInt(coinsAmount, 10) : adjustingUser.reward_coins;

      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({ 
          wallet_balance: newWallet, 
          reward_coins: newCoins,
          updated_at: new Date().toISOString() 
        })
        .eq('id', adjustingUser.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === adjustingUser.id ? { ...u, wallet_balance: newWallet, reward_coins: newCoins } : u));
      setAdjustingUser(null);
    } catch (err: any) {
      console.error('Failed to adjust balances:', err);
      alert('Failed to update user balances.');
      setIsUpdatingBalance(false);
    }
  };

  const handleSendResetLink = async (email: string) => {
    if (!confirm(`Are you sure you want to send a password reset link to ${email}?`)) return;
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone || '').includes(searchQuery);

    const matchesRole = 
      roleFilter === 'all' || 
      (roleFilter === 'customer' && user.role === 'customer') ||
      (roleFilter === 'staff' && (user.role === 'staff' || user.role === 'manager')) ||
      (roleFilter === 'admin' && user.role === 'admin');

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-rose-200">Admin</span>;
      case 'manager':
      case 'staff':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-200">Staff</span>;
      default:
        return <span className="bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-stone-200">Customer</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6ED] flex flex-col pb-16">
      {/* Header */}
      <header className="bg-[#1C1B1A] text-[#FAF6ED] px-6 py-4 flex items-center justify-between border-b border-[#E7D7A3]/30 shadow-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#E7D7A3]" />
          <span className="font-serif text-xl font-bold tracking-wider text-[#E7D7A3]">RUHVI ADMIN CONSOLE</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/admin/dashboard" className="flex items-center gap-1 bg-[#FAF6ED]/10 px-3 py-1.5 rounded-lg hover:bg-[#FAF6ED]/20 transition text-[#FAF6ED]">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 w-full">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-stone-200 pb-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-amber-500/10 text-amber-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/20 mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>User & Privilege Manager</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-stone-900">User Directory</h1>
            <p className="text-xs text-stone-500 mt-1">Manage customer accounts, staff permissions, wallets, and reward coins.</p>
          </div>
          
          <button 
            onClick={fetchUsers} 
            className="flex items-center space-x-2 text-stone-700 hover:text-amber-900 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-stone-200 text-xs font-bold uppercase tracking-wider"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200 text-sm">
            {error}
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Registered Users</p>
            <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Customers</p>
            <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{users.filter(u => u.role === 'customer').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Admins & Staff</p>
            <p className="text-2xl font-serif font-bold text-purple-900 mt-1">{users.filter(u => u.role !== 'customer').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total User Wallets</p>
            <p className="text-2xl font-serif font-bold text-emerald-900 mt-1">₹{users.reduce((acc, u) => acc + (Number(u.wallet_balance) || 0), 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Controls: Search & Role Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-800"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl w-full md:w-auto text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${roleFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('customer')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${roleFilter === 'customer' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Customers ({users.filter(u => u.role === 'customer').length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${roleFilter === 'admin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
            >
              Admins ({users.filter(u => u.role === 'admin').length})
            </button>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-16 text-stone-500 text-sm">Loading user directory from Supabase...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm">
            <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-medium">No users found.</p>
            <p className="text-stone-400 text-xs mt-1">Try adjusting your search query or role filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500 font-semibold">
                  <th className="p-4 pl-6">User</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Wallet Balance</th>
                  <th className="p-4 text-right">Reward Coins</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-semibold text-stone-900">{user.full_name || 'Anonymous User'}</div>
                      <div className="text-stone-400 font-mono text-[10px]">{user.email}</div>
                    </td>
                    <td className="p-4 font-mono text-stone-600">
                      {user.phone || 'N/A'}
                    </td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4 text-right font-bold text-stone-900">
                      ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right font-bold text-amber-900">
                      🪙 {Number(user.reward_coins || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right pr-6 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleSendResetLink(user.email)}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-900 font-semibold rounded-lg transition-colors border border-sky-200 inline-flex items-center gap-1"
                        title="Send Password Reset Link"
                      >
                        <Mail className="w-3 h-3 text-sky-700" /> Link
                      </button>
                      <button
                        onClick={() => {
                          setPasswordUser(user);
                          setNewPassword('');
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold rounded-lg transition-colors border border-indigo-200 inline-flex items-center gap-1"
                        title="Set Password Directly"
                      >
                        <Key className="w-3 h-3 text-indigo-700" /> Pass
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setSelectedRole(user.role);
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg transition-colors border border-stone-200 inline-flex items-center gap-1"
                      >
                        <Shield className="w-3 h-3 text-stone-600" /> Role
                      </button>
                      <button
                        onClick={() => {
                          setAdjustingUser(user);
                          setWalletAmount(user.wallet_balance.toString());
                          setCoinsAmount(user.reward_coins.toString());
                        }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 font-semibold rounded-lg transition-colors border border-amber-200 inline-flex items-center gap-1"
                      >
                        <Wallet className="w-3 h-3 text-amber-800" /> Funds
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Role Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">Update User Role</h3>
              <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-1">
              <p><strong className="text-stone-900">User:</strong> {editingUser.full_name || 'Anonymous'}</p>
              <p><strong className="text-stone-900">Email:</strong> {editingUser.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">Select New Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-800"
              >
                <option value="customer">Customer (Standard User)</option>
                <option value="staff">Staff (Catalog & Fulfillment)</option>
                <option value="manager">Manager (Full Operations)</option>
                <option value="admin">Administrator (Full Control)</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isUpdatingRole}
                className="px-4 py-2 bg-amber-950 text-white text-xs font-bold rounded-xl hover:bg-amber-900 disabled:opacity-50"
              >
                {isUpdatingRole ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Funds/Coins Modal */}
      {adjustingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">Adjust Wallet & Reward Coins</h3>
              <button onClick={() => setAdjustingUser(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-1">
              <p><strong className="text-stone-900">User:</strong> {adjustingUser.full_name || 'Anonymous'}</p>
              <p><strong className="text-stone-900">Email:</strong> {adjustingUser.email}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Wallet Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Reward Coins (🪙)</label>
                <input
                  type="number"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-800"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setAdjustingUser(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBalance}
                disabled={isUpdatingBalance}
                className="px-4 py-2 bg-amber-950 text-white text-xs font-bold rounded-xl hover:bg-amber-900 disabled:opacity-50"
              >
                {isUpdatingBalance ? 'Saving...' : 'Update Balances'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {passwordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-stone-900">Set User Password</h3>
              <button onClick={() => setPasswordUser(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-1">
              <p><strong className="text-stone-900">User:</strong> {passwordUser.full_name || 'Anonymous'}</p>
              <p><strong className="text-stone-900">Email:</strong> {passwordUser.email}</p>
              <p className="text-rose-600 italic mt-2">Warning: This will overwrite their existing password immediately without requiring current password confirmation.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">New Password</label>
              <input
                type="text"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-800"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setPasswordUser(null)}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-xl hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePassword}
                disabled={isUpdatingPassword || newPassword.length < 6}
                className="px-4 py-2 bg-indigo-900 text-white text-xs font-bold rounded-xl hover:bg-indigo-800 disabled:opacity-50"
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
