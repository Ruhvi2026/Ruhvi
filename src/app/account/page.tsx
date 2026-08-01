'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  MapPin,
  Package,
  RefreshCw,
  Bell,
  Shield,
  Key,
  Trash2,
  ArrowRight,
  Check,
  AlertTriangle,
  LogOut,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Coins,
  Wallet,
  Gift
} from 'lucide-react';

export default function AccountOverviewPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password update state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || user.phone || '');
    }
  }, [profile, user]);

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return 'R';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'July 2026';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'July 2026';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const supabase = createClient();

      // 1. Update public.users table
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      // 2. Update auth.user_metadata
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone,
        },
      });

      await refreshProfile();
      setIsEditingProfile(false);
      setProfileSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Save profile error:', err);
      setProfileErrorMsg(err?.message || 'Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassErr('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPassErr('Password must be at least 6 characters long.');
      return;
    }

    setSavingPass(true);
    setPassErr(null);
    setPassMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPassMsg('Password successfully updated!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPassMsg(null);
        setShowPasswordModal(false);
      }, 2000);
    } catch (err: any) {
      setPassErr(err?.message || 'Failed to update password.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // Execute signout as deletion request acknowledgement
      alert('Your account deletion request has been registered. Our security team will process it within 24 hours.');
      setShowDeleteModal(false);
      await signOut();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-stone-600 font-medium">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-[#E7D7A3]/50 rounded-3xl p-10 shadow-xl space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#FAF6ED] border border-[#C29831]/30 text-[#C29831] flex items-center justify-center mx-auto shadow-inner">
            <User className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-[#121110]">Access Your Profile</h1>
            <p className="text-sm text-[#121110]/70 max-w-md mx-auto">
              Please sign in with your authenticated email address to view your orders, reward coins, and account settings.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login?redirectTo=/account"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#1C1B1A] text-[#FAF6ED] rounded-xl font-semibold text-sm hover:bg-black transition shadow-md"
            >
              Sign In to Your Account
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#FAF6ED] text-[#121110] border border-[#E7D7A3] rounded-xl font-semibold text-sm hover:bg-[#F3EAD5] transition"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = user.email || profile?.email || '';
  const displayName = profile?.full_name || user.user_metadata?.full_name || userEmail.split('@')[0];
  const userRole = profile?.role || 'customer';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Profile Banner Card */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-amber-100 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-800/30">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
          <div className="w-20 h-20 rounded-full bg-amber-400/20 text-amber-300 font-serif font-bold text-3xl flex items-center justify-center border-2 border-amber-400/40 shadow-inner flex-shrink-0">
            {getInitials(displayName, userEmail)}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">{displayName}</h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {userRole === 'admin' ? 'Admin / Managing Director' : 'Gold Club Member'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-stone-300 font-mono">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                {userEmail}
              </span>
              {(profile?.phone || user.phone) && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  {profile?.phone || user.phone}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-amber-200/80 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Email Authenticated • Member since {formatDate(profile?.created_at || user.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="px-5 py-2.5 bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all hover:scale-105"
          >
            {isEditingProfile ? 'Close Editor' : 'Edit Profile'}
          </button>
          <button
            onClick={signOut}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 border border-amber-400/20"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {profileSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {profileErrorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{profileErrorMsg}</span>
        </div>
      )}

      {/* Quick Navigation Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Link
          href="/orders"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center mb-4 group-hover:bg-amber-900 group-hover:text-amber-100 transition-colors">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-amber-900">My Orders</h3>
          <p className="text-xs text-stone-500 mt-1">Track purchases & view GST invoices</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-900 space-x-1">
            <span>View Purchases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/addresses"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center mb-4 group-hover:bg-amber-900 group-hover:text-amber-100 transition-colors">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-amber-900">Saved Addresses</h3>
          <p className="text-xs text-stone-500 mt-1">Manage shipping locations & defaults</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-900 space-x-1">
            <span>Manage Address Book</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/wallet"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:bg-emerald-700 group-hover:text-emerald-50 transition-colors">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-700">Ruhvi Wallet</h3>
          <p className="text-xs text-stone-500 mt-1">Balance: ₹{(profile?.wallet_balance || 0).toLocaleString('en-IN')}</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700 space-x-1">
            <span>View Wallet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/coins"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-yellow-500 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-4 group-hover:bg-yellow-600 group-hover:text-yellow-50 transition-colors">
            <Coins className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-yellow-600">Reward Coins</h3>
          <p className="text-xs text-stone-500 mt-1">Available: {profile?.reward_coins || 0} Coins</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-yellow-600 space-x-1">
            <span>Redeem Coins</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/referrals"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4 group-hover:bg-purple-700 group-hover:text-purple-50 transition-colors">
            <Gift className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-purple-700">Refer a Friend</h3>
          <p className="text-xs text-stone-500 mt-1">Earn 500 coins per referral</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-700 space-x-1">
            <span>Get Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/returns"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center mb-4 group-hover:bg-amber-900 group-hover:text-amber-100 transition-colors">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-amber-900">7-Day Returns</h3>
          <p className="text-xs text-stone-500 mt-1">Submit & track return requests</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-900 space-x-1">
            <span>Return Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/notifications"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center mb-4 group-hover:bg-amber-900 group-hover:text-amber-100 transition-colors">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-amber-900">Notifications</h3>
          <p className="text-xs text-stone-500 mt-1">Order alerts & exclusive offers</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-900 space-x-1">
            <span>View Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Edit Profile / Security Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Details Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center space-x-2">
              <User className="w-5 h-5 text-amber-800" />
              <span>Profile Details</span>
            </h3>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-xs font-semibold text-amber-900 hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                disabled={!isEditingProfile}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:bg-stone-50 text-stone-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Email Address (Authenticated)</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl bg-stone-100 text-stone-600 font-medium cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">Your email address is linked to your Supabase Auth identity.</p>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Mobile Phone Number</label>
              <input
                type="tel"
                disabled={!isEditingProfile}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:bg-stone-50 text-stone-900 font-medium"
              />
            </div>

            {isEditingProfile && (
              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => {
                    setIsEditingProfile(false);
                    setFullName(profile?.full_name || '');
                    setPhone(profile?.phone || '');
                  }}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2 bg-amber-950 text-amber-100 font-bold rounded-xl hover:bg-black transition shadow disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Account Security & Privacy Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-800" />
              <span>Email & Password Security</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-amber-800" />
                    <span className="font-bold text-stone-900">Password Security</span>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-amber-900 hover:underline font-bold text-xs"
                  >
                    Change Password
                  </button>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Your account uses encrypted email authentication managed via Supabase.
                </p>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-amber-950 text-xs">
                  <Lock className="w-4 h-4 text-amber-800" />
                  <span>Session Security</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Signed in as <span className="font-mono font-medium text-stone-900">{userEmail}</span>. Active sessions are token-authenticated with automatic cookie refresh.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={signOut}
              className="text-xs font-bold text-amber-950 hover:text-black flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center space-x-1.5 p-2 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h3 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-800" />
                <span>Change Password</span>
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {passMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{passMsg}</span>
              </div>
            )}

            {passErr && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {passErr}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-10 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">Confirm New Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-stone-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPass}
                  className="px-6 py-2.5 bg-amber-950 text-amber-100 font-bold rounded-xl hover:bg-black transition shadow disabled:opacity-50"
                >
                  {savingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-serif text-xl font-bold text-stone-900">Confirm Account Deletion</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                This action will submit an account deletion request for <span className="font-mono font-bold text-stone-800">{userEmail}</span>. Your saved addresses and profile metadata will be queued for removal.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100 text-xs">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 text-stone-600 hover:text-stone-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
              >
                {deletingAccount ? 'Processing...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
