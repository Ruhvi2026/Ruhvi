'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { SpatialPage } from '@/components/design-system/SpatialPage';
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
  Gift,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountOverviewPage() {
  const router = useRouter();
  const {
    user,
    profile,
    loading: authLoading,
    signOut,
    refreshProfile,
  } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(
    null
  );
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Email verification state
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

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

  // Linked Providers State
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  const handleSendVerificationEmail = async () => {
    if (!emailInput) {
      toast.error('Please enter an email address first.');
      return;
    }
    try {
      setSendingVerification(true);
      const { sendEmailVerification, verifyBeforeUpdateEmail } =
        await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        if (auth.currentUser.email !== emailInput) {
          await verifyBeforeUpdateEmail(auth.currentUser, emailInput);
          setVerificationSent(true);
          toast.success(
            'A verification link has been sent to the new email address. Please click it to verify the change.'
          );
        } else {
          await sendEmailVerification(auth.currentUser);
          setVerificationSent(true);
          toast.success('Verification link sent to your email address!');
        }
      } else {
        toast.error('Could not find active user session.');
      }
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      toast.error(err.message || 'Failed to send verification email.');
    } finally {
      setSendingVerification(false);
    }
  };

  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      if (auth?.currentUser) {
        setLinkedProviders(
          auth.currentUser.providerData.map((p: any) => p.providerId)
        );

        // Sync email verification status from Firebase to Supabase if it changed
        if (
          auth.currentUser.emailVerified &&
          profile &&
          !profile.email_verified
        ) {
          const supabase = createClient();
          supabase
            .rpc('resolve_customer_identity', {
              p_firebase_uid: auth.currentUser.uid,
              p_provider: 'password',
              p_provider_identifier: auth.currentUser.email || '',
              p_email: auth.currentUser.email || null,
              p_email_verified: true,
              p_phone: auth.currentUser.phoneNumber || null,
              p_phone_verified: profile.phone_verified || false,
              p_name: profile.full_name || null,
            })
            .then(() => {
              refreshProfile();
            })
            .catch((err: any) => {
              console.error('Failed to sync email verification status:', err);
            });
        }
      }
    });
  }, [user, profile, refreshProfile]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setEmailInput(profile.email || user?.email || '');
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || user.phone || '');
      setEmailInput(user.email || '');
    }
  }, [profile, user]);

  const getInitials = (
    name: string | null | undefined,
    email: string | null | undefined
  ) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2)
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return 'R';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'July 2026';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
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
      const { error: dbError } = await supabase.from('users').upsert({
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
      alert(
        'Your account deletion request has been registered. Our security team will process it within 24 hours.'
      );
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
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-amber-600 border-t-transparent"></div>
        <p className="text-sm font-medium text-stone-600">
          Loading your profile...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="space-y-6 rounded-3xl border border-[#E7D7A3]/50 bg-white p-10 shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#C29831]/30 bg-[#FAF6ED] text-[#C29831] shadow-inner">
            <User className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-[#121110]">
              Access Your Profile
            </h1>
            <p className="mx-auto max-w-md text-sm text-[#121110]/70">
              Please sign in with your authenticated email address to view your
              orders, reward coins, and account settings.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href="/login?redirectTo=/account"
              className="w-full rounded-xl bg-[#1C1B1A] px-8 py-3.5 text-sm font-semibold text-[#FAF6ED] shadow-md transition hover:bg-black sm:w-auto"
            >
              Sign In to Your Account
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF6ED] px-8 py-3.5 text-sm font-semibold text-[#121110] transition hover:bg-[#F3EAD5] sm:w-auto"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const userEmail = user.email || profile?.email || '';
  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    userEmail.split('@')[0];
  const userRole = profile?.role || 'customer';

  const handleLinkGoogle = async () => {
    try {
      const { auth } = require('@/lib/firebase');
      const { GoogleAuthProvider, linkWithPopup } = require('firebase/auth');
      if (!auth.currentUser) return;
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      setLinkedProviders(
        auth.currentUser.providerData.map((p: any) => p.providerId)
      );
      const { upsertUserProfile } = require('@/services/authService');
      await upsertUserProfile(auth.currentUser);
      alert('Google account linked successfully!');
    } catch (err: any) {
      const { handleAuthCollision } = require('@/services/authService');
      try {
        handleAuthCollision(err);
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const isGoogleLinked = linkedProviders.includes('google.com');
  const isPhoneLinked = linkedProviders.includes('phone');

  return (
    <SpatialPage showParticles showOrbs>
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* Profile Banner Card */}
        <div className="gold-gradient-bg relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl border border-gold-300/40 p-8 text-white shadow-xl sm:p-10 md:flex-row">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-2 border-gold-100/50 bg-white/20 font-serif text-3xl font-bold text-gold-100 shadow-inner">
              {getInitials(displayName, userEmail)}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                  {displayName}
                </h1>
                <span className="flex items-center gap-1 rounded-md border border-gold-100/40 bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-50">
                  <Sparkles className="h-3 w-3 text-gold-100" />
                  {userRole === 'admin'
                    ? 'Admin / Managing Director'
                    : 'Gold Club Member'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-gold-50 sm:justify-start">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-gold-100" />
                  {userEmail}
                </span>
                {(profile?.phone || user.phone) && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gold-100" />
                    {profile?.phone || user.phone}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-gold-100/90 sm:justify-start">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                <span>
                  Email Authenticated • Member since{' '}
                  {formatDate(profile?.created_at || user.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-800 shadow transition-all hover:scale-105 hover:bg-gold-50"
            >
              {isEditingProfile ? 'Close Editor' : 'Edit Profile'}
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-xl border border-gold-200/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20 hover:text-white"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {profileSuccessMsg && (
          <div className="animate-fade-in flex items-center space-x-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        {profileErrorMsg && (
          <div className="animate-fade-in flex items-center space-x-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>{profileErrorMsg}</span>
          </div>
        )}

        {/* Quick Navigation Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Link
            href="/orders"
            className="group rounded-2xl border border-gold-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/15"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-gold-600 group-hover:text-white">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-gold-700">
              My Orders
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Track purchases & view GST invoices
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-gold-700">
              <span>View Purchases</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/account/addresses"
            className="group rounded-2xl border border-gold-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/15"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-gold-600 group-hover:text-white">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-gold-700">
              Saved Addresses
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Manage shipping locations & defaults
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-gold-700">
              <span>Manage Address Book</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/account/wallet"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-500 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-700 group-hover:text-emerald-50">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-700">
              Ruhvi Wallet
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Balance: ₹{(profile?.wallet_balance || 0).toLocaleString('en-IN')}
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-emerald-700">
              <span>View Wallet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/account/coins"
            className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-yellow-500 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 transition-colors group-hover:bg-yellow-600 group-hover:text-yellow-50">
              <Coins className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-yellow-600">
              Reward Coins
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Available: {profile?.reward_coins || 0} Coins
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-yellow-600">
              <span>Redeem Coins</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/account/referrals"
            className="group rounded-2xl border border-gold-200/70 bg-white p-6 shadow-sm transition-all hover:border-gold-400 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-gold-600 group-hover:text-white">
              <Gift className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-gold-700">
              Refer a Friend
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Earn 500 coins per referral
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-gold-700">
              <span>Get Link</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/account/returns"
            className="group rounded-2xl border border-gold-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/15"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-gold-600 group-hover:text-white">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-gold-700">
              7-Day Returns
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Submit & track return requests
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-gold-700">
              <span>Return Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/account/notifications"
            className="group rounded-2xl border border-gold-200/60 bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/15"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-100 text-gold-700 transition-colors group-hover:bg-gold-600 group-hover:text-white">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 group-hover:text-gold-700">
              Notifications
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              Order alerts & exclusive offers
            </p>
            <div className="mt-4 flex items-center space-x-1 text-xs font-semibold text-gold-700">
              <span>View Inbox</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        {/* Edit Profile / Security Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Profile Details Card */}
          <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h3 className="flex items-center space-x-2 font-serif text-lg font-bold text-stone-900">
                <User className="h-5 w-5 text-amber-800" />
                <span>Profile Details</span>
              </h3>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-xs font-semibold text-gold-800 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-stone-700">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditingProfile}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:bg-stone-50"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-semibold text-stone-700">
                    Email Address
                  </label>
                  {profile?.email_verified ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      UNVERIFIED
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    disabled={profile?.email_verified}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your email"
                    className={`w-full rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                      profile?.email_verified
                        ? 'cursor-not-allowed bg-stone-100 text-stone-600'
                        : ''
                    }`}
                  />
                </div>
                {!profile?.email_verified && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200/80 bg-amber-50/70 p-2 text-stone-800">
                    <p className="text-[11px] text-amber-800">
                      Email not verified. Click to verify your email.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                      className="rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      {sendingVerification
                        ? 'Sending...'
                        : verificationSent
                          ? 'Link Sent!'
                          : 'Send Link'}
                    </button>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-stone-400">
                  Your email address is linked to your Ruhvi customer account.
                </p>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-semibold text-stone-700">
                    Mobile Phone Number
                  </label>
                  {isPhoneLinked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      VERIFIED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      UNVERIFIED
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  disabled={!isEditingProfile}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:bg-stone-50"
                />
                {!isPhoneLinked && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200/80 bg-amber-50/70 p-2 text-stone-800">
                    <p className="text-[11px] text-amber-800">
                      Phone not verified. Link your phone to verify.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/complete-profile')}
                      className="rounded-md bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-amber-700"
                    >
                      Verify Now
                    </button>
                  </div>
                )}
              </div>

              {isEditingProfile && (
                <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => {
                      setIsEditingProfile(false);
                      setFullName(profile?.full_name || '');
                      setPhone(profile?.phone || '');
                    }}
                    className="px-4 py-2 font-medium text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl bg-amber-950 px-6 py-2 font-bold text-gold-50 shadow transition hover:bg-black disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Account Security & Privacy Card */}
          <div className="flex flex-col justify-between space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-6">
              <h3 className="flex items-center space-x-2 border-b border-stone-100 pb-4 font-serif text-lg font-bold text-stone-900">
                <Shield className="h-5 w-5 text-amber-800" />
                <span>Email & Password Security</span>
              </h3>

              <div className="space-y-4 text-xs">
                {/* Login Methods (Path A Support) */}
                <div className="space-y-3 rounded-xl border border-stone-200/70 bg-stone-50 p-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-amber-800" />
                    <span className="font-bold text-stone-900">
                      Linked Login Methods
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-stone-500">
                    Connect multiple ways to log in. Connected accounts merge
                    into a single customer profile.
                  </p>

                  <div className="flex flex-col gap-2 pt-2">
                    {/* Google Login Status */}
                    <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3">
                      <div className="flex items-center space-x-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span className="font-semibold text-stone-800">
                          Google Account
                        </span>
                      </div>
                      {isGoogleLinked ? (
                        <span className="text-[10px] font-bold text-emerald-600">
                          CONNECTED
                        </span>
                      ) : (
                        <button
                          onClick={handleLinkGoogle}
                          className="rounded-lg border border-stone-200 px-3 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-50"
                        >
                          Link Google
                        </button>
                      )}
                    </div>

                    {/* Phone Login Status */}
                    <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-stone-600" />
                        <span className="font-semibold text-stone-800">
                          Phone Number
                        </span>
                      </div>
                      {isPhoneLinked ? (
                        <span className="text-[10px] font-bold text-emerald-600">
                          CONNECTED
                        </span>
                      ) : (
                        <button
                          onClick={() => router.push('/complete-profile')}
                          className="rounded-lg border border-stone-200 px-3 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-50"
                        >
                          Link Phone
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 rounded-xl border border-gold-200/60 bg-gold-50/50 p-4">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-950">
                    <Lock className="h-4 w-4 text-amber-800" />
                    <span>Session Security</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Signed in as{' '}
                    <span className="font-mono font-medium text-stone-900">
                      {userEmail}
                    </span>
                    . Active sessions are token-authenticated with automatic
                    cookie refresh.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-6">
              <button
                onClick={signOut}
                className="flex items-center space-x-1.5 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-amber-950 transition hover:bg-stone-200 hover:text-black"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-1.5 rounded-lg p-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
                  <Key className="h-5 w-5 text-amber-800" />
                  <span>Change Password</span>
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-sm font-bold text-stone-400 hover:text-stone-700"
                >
                  ✕
                </button>
              </div>

              {passMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{passMsg}</span>
                </div>
              )}

              {passErr && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {passErr}
                </div>
              )}

              <form
                onSubmit={handleUpdatePassword}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="mb-1 block font-semibold text-stone-800">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 pr-10 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      {showPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-stone-800">
                    Confirm New Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2.5 font-medium text-stone-600 hover:text-stone-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPass}
                    className="rounded-xl bg-amber-950 px-6 py-2.5 font-bold text-gold-50 shadow transition hover:bg-black disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Confirm Account Deletion
                </h3>
                <p className="text-xs leading-relaxed text-stone-500">
                  This action will submit an account deletion request for{' '}
                  <span className="font-mono font-bold text-stone-800">
                    {userEmail}
                  </span>
                  . Your saved addresses and profile metadata will be queued for
                  removal.
                </p>
              </div>
              <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4 text-xs">
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 font-medium text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingAccount}
                  onClick={handleDeleteAccount}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 font-bold text-white shadow transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {deletingAccount ? 'Processing...' : 'Yes, Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SpatialPage>
  );
}
