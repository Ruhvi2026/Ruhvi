'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Globe,
  Bell,
  MessageSquare,
  Shield,
  MapPin,
  CreditCard,
  FileText,
  Info,
  Trash2,
  Lock,
  Smartphone,
  Check,
  ChevronRight,
  AlertTriangle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { SpatialPage } from '@/components/design-system/SpatialPage';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  // 1. Appearance State
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  // 2. Language State
  const [language, setLanguage] = useState<'en' | 'bn'>('en');

  // 3. Notification Preferences State
  const [orderNotifs, setOrderNotifs] = useState({
    confirmation: true,
    shipping: true,
    delivery: true,
    cancellation: true,
    refunds: true,
  });

  const [marketingNotifs, setMarketingNotifs] = useState({
    offers: true,
    discounts: true,
    newCollections: true,
    flashSales: false,
    recommendations: true,
  });

  const [channels, setChannels] = useState({
    email: true,
    whatsapp: true,
    push: false,
  });

  // 4. WhatsApp & Email Preferences
  const [commPreferences, setCommPreferences] = useState({
    transactional: true,
    support: true,
    marketing: false,
  });

  // 5. Modals State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Active sessions mock for luxury feel
  const [activeSessions] = useState([
    {
      id: 'session-1',
      device: 'Chrome on Windows 11 (Current)',
      ip: '103.212.**.**',
      location: 'Kolkata, India',
      isCurrent: true,
      lastActive: 'Just now',
    },
    {
      id: 'session-2',
      device: 'Safari on iPhone 15 Pro',
      ip: '103.212.**.**',
      location: 'Kolkata, India',
      isCurrent: false,
      lastActive: '2 days ago',
    },
  ]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setChangingPass(true);
      const { updatePassword } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        toast.success('Password updated successfully');
        setShowPasswordModal(false);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error('Session not found. Please log in again.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const { deleteUser } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        await signOut();
        toast.success('Your account has been deleted');
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.message ||
          'Recent login required to delete account. Please sign out and sign back in.'
      );
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <SpatialPage className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        {/* Header and Breadcrumbs */}
        <div>
          <div className="mb-3 flex items-center space-x-2 text-xs text-stone-500">
            <Link href="/account" className="transition hover:text-gold-600">
              Account
            </Link>
            <span>/</span>
            <span className="font-semibold text-stone-800">Settings</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gold-600">
                Account Preferences
              </p>
              <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
                Settings & Preferences
              </h1>
              <p className="mt-1 text-xs text-stone-500 sm:text-sm">
                Manage your appearance, notifications, privacy, saved addresses,
                and security settings.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Appearance */}
        <section className="shadow-xs rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-6">
          <div className="flex items-center space-x-3 border-b border-stone-200/50 pb-4">
            <div className="rounded-xl bg-gold-100/60 p-2 text-gold-700">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Appearance
              </h2>
              <p className="text-xs text-stone-500">
                Customize how Ruhvi looks on your current device.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* System */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex flex-col items-center justify-between rounded-xl border p-4 text-center transition-all ${
                theme === 'system'
                  ? 'border-gold-500 bg-gold-50/50 ring-2 ring-gold-400/30'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                <Laptop className="h-5 w-5" />
              </div>
              <span className="font-serif text-xs font-bold text-stone-900">
                System Default
              </span>
              <span className="mt-0.5 text-[10px] text-stone-400">
                Matches OS theme
              </span>
              {theme === 'system' && (
                <span className="mt-2 inline-flex items-center text-[10px] font-bold text-gold-600">
                  <Check className="mr-1 h-3 w-3" /> Active
                </span>
              )}
            </button>

            {/* Light */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center justify-between rounded-xl border p-4 text-center transition-all ${
                theme === 'light'
                  ? 'border-gold-500 bg-gold-50/50 ring-2 ring-gold-400/30'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Sun className="h-5 w-5" />
              </div>
              <span className="font-serif text-xs font-bold text-stone-900">
                Warm Ivory (Light)
              </span>
              <span className="mt-0.5 text-[10px] text-stone-400">
                Polished cream surfaces
              </span>
              {theme === 'light' && (
                <span className="mt-2 inline-flex items-center text-[10px] font-bold text-gold-600">
                  <Check className="mr-1 h-3 w-3" /> Active
                </span>
              )}
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center justify-between rounded-xl border p-4 text-center transition-all ${
                theme === 'dark'
                  ? 'border-gold-500 bg-gold-50/50 ring-2 ring-gold-400/30'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-800 text-gold-400">
                <Moon className="h-5 w-5" />
              </div>
              <span className="font-serif text-xs font-bold text-stone-900">
                Night Velvet (Dark)
              </span>
              <span className="mt-0.5 text-[10px] text-stone-400">
                Muted charcoal tones
              </span>
              {theme === 'dark' && (
                <span className="mt-2 inline-flex items-center text-[10px] font-bold text-gold-600">
                  <Check className="mr-1 h-3 w-3" /> Active
                </span>
              )}
            </button>
          </div>
        </section>

        {/* Section 2: Language */}
        <section className="shadow-xs rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-6">
          <div className="flex items-center space-x-3 border-b border-stone-200/50 pb-4">
            <div className="rounded-xl bg-gold-100/60 p-2 text-gold-700">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Language
              </h2>
              <p className="text-xs text-stone-500">
                Select your preferred language for navigation and notifications.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setLanguage('en');
                toast.success('Language set to English');
              }}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                language === 'en'
                  ? 'border-gold-500 bg-gold-50/50 ring-2 ring-gold-400/30'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div>
                <p className="font-serif text-xs font-bold text-stone-900">
                  English (India)
                </p>
                <p className="text-[10px] text-stone-400">Default</p>
              </div>
              {language === 'en' && <Check className="h-4 w-4 text-gold-600" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setLanguage('bn');
                toast.success('ভাষা পরিবর্তন করা হয়েছে (বাংলা)');
              }}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                language === 'bn'
                  ? 'border-gold-500 bg-gold-50/50 ring-2 ring-gold-400/30'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div>
                <p className="font-serif text-xs font-bold text-stone-900">
                  বাংলা (Bengali)
                </p>
                <p className="text-[10px] text-stone-400">আঞ্চলিক সংস্করণ</p>
              </div>
              {language === 'bn' && <Check className="h-4 w-4 text-gold-600" />}
            </button>
          </div>
        </section>

        {/* Section 3: Notification Preferences */}
        <section className="shadow-xs rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-6">
          <div className="flex items-center space-x-3 border-b border-stone-200/50 pb-4">
            <div className="rounded-xl bg-gold-100/60 p-2 text-gold-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Notification Preferences
              </h2>
              <p className="text-xs text-stone-500">
                Choose the updates and communication you wish to receive.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            {/* Delivery Channels */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Communication Channels
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                  <span className="text-xs font-medium text-stone-800">
                    Email
                  </span>
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) =>
                      setChannels({ ...channels, email: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-gold-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                  <span className="text-xs font-medium text-stone-800">
                    WhatsApp
                  </span>
                  <input
                    type="checkbox"
                    checked={channels.whatsapp}
                    onChange={(e) =>
                      setChannels({ ...channels, whatsapp: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-gold-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                  <span className="text-xs font-medium text-stone-800">
                    Push Notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={channels.push}
                    onChange={(e) =>
                      setChannels({ ...channels, push: e.target.checked })
                    }
                    className="h-4 w-4 rounded accent-gold-600"
                  />
                </label>
              </div>
            </div>

            {/* Order Notifications */}
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Order Updates (Transactional)
              </h3>
              <div className="mt-3 space-y-2">
                {[
                  {
                    key: 'confirmation',
                    label: 'Order Confirmation & Receipt',
                  },
                  { key: 'shipping', label: 'Dispatched & Tracking Updates' },
                  {
                    key: 'delivery',
                    label: 'Out for Delivery & Delivery Confirmation',
                  },
                  {
                    key: 'refunds',
                    label: 'Return & Refund Processing Updates',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-100 bg-white px-4 py-2.5 transition hover:bg-stone-50"
                  >
                    <span className="text-xs font-medium text-stone-800">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(orderNotifs as any)[item.key]}
                      onChange={(e) =>
                        setOrderNotifs({
                          ...orderNotifs,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded accent-gold-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Marketing Notifications */}
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Promotions & Exclusive Offers
              </h3>
              <div className="mt-3 space-y-2">
                {[
                  {
                    key: 'offers',
                    label: 'Special Festival & VIP Member Offers',
                  },
                  {
                    key: 'newCollections',
                    label: 'New Jewellery Collection Launches',
                  },
                  {
                    key: 'flashSales',
                    label: 'Limited Time Gold Plated Deals',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-stone-100 bg-white px-4 py-2.5 transition hover:bg-stone-50"
                  >
                    <span className="text-xs font-medium text-stone-800">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={(marketingNotifs as any)[item.key]}
                      onChange={(e) =>
                        setMarketingNotifs({
                          ...marketingNotifs,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded accent-gold-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Privacy & Security */}
        <section className="shadow-xs rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-6">
          <div className="flex items-center space-x-3 border-b border-stone-200/50 pb-4">
            <div className="rounded-xl bg-gold-100/60 p-2 text-gold-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Privacy & Security
              </h2>
              <p className="text-xs text-stone-500">
                Manage your credentials, login activity, and account protection.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {/* Password */}
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center space-x-3">
                <Lock className="h-4 w-4 text-stone-500" />
                <div>
                  <p className="font-serif text-xs font-bold text-stone-900">
                    Password
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Change your account password securely.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Change Password
              </button>
            </div>

            {/* Active Sessions */}
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="mb-3 font-serif text-xs font-bold text-stone-900">
                Active Devices & Sessions
              </p>
              <div className="space-y-3">
                {activeSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-medium text-stone-800">
                        {sess.device}
                        {sess.isCurrent && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {sess.location} • {sess.lastActive}
                      </p>
                    </div>
                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={() => toast.success('Signed out from device')}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone: Delete Account */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif text-xs font-bold text-rose-900">
                    Delete Account
                  </p>
                  <p className="text-[10px] text-rose-700/80">
                    Permanently remove your profile, order history, and wallet
                    records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="shadow-xs rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Saved Addresses & Payment Methods Shortcuts */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/account/addresses"
            className="shadow-xs group flex items-center justify-between rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-5 transition hover:border-gold-300"
          >
            <div className="flex items-center space-x-3.5">
              <div className="rounded-xl bg-gold-100/60 p-2.5 text-gold-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-stone-900">
                  Saved Addresses
                </h3>
                <p className="text-xs text-stone-500">
                  Manage Home, Work & Delivery locations
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-700" />
          </Link>

          <div className="shadow-xs flex items-center justify-between rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-5">
            <div className="flex items-center space-x-3.5">
              <div className="rounded-xl bg-gold-100/60 p-2.5 text-gold-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-stone-900">
                  Saved Payment Methods
                </h3>
                <p className="text-xs text-stone-500">
                  Masked Cards (Visa •••• 4821) & UPI
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Tokenized
            </span>
          </div>
        </section>

        {/* Section 6: Legal & About */}
        <section className="shadow-xs rounded-2xl border border-gold-200/50 bg-[#FCFBF7] p-6">
          <div className="flex items-center space-x-3 border-b border-stone-200/50 pb-4">
            <div className="rounded-xl bg-gold-100/60 p-2 text-gold-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900">
                Legal & Brand Policies
              </h2>
              <p className="text-xs text-stone-500">
                Review our terms of service, returns policy, and jewellery
                warranty.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Link
              href="/terms-and-conditions"
              className="rounded-lg p-2 text-stone-700 transition hover:bg-stone-100 hover:text-gold-700"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy-policy"
              className="rounded-lg p-2 text-stone-700 transition hover:bg-stone-100 hover:text-gold-700"
            >
              Privacy Policy
            </Link>
            <Link
              href="/return-policy"
              className="rounded-lg p-2 text-stone-700 transition hover:bg-stone-100 hover:text-gold-700"
            >
              Return Policy
            </Link>
            <Link
              href="/shipping-policy"
              className="rounded-lg p-2 text-stone-700 transition hover:bg-stone-100 hover:text-gold-700"
            >
              Shipping Policy
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-stone-200/40 pt-4 text-[11px] text-stone-400 sm:flex-row">
            <div className="flex items-center space-x-2">
              <span className="font-serif font-bold text-stone-700">
                RUHVI JEWELS
              </span>
              <span>• Version 1.0.0</span>
            </div>
            <p>© 2026 Ruhvi Jewels. All rights reserved.</p>
          </div>
        </section>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="z-60 backdrop-blur-xs fixed inset-0 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl">
            <h3 className="font-serif text-base font-bold text-stone-900">
              Update Password
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-stone-700">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-stone-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>
              <div className="flex justify-end space-x-2 border-t border-stone-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl px-4 py-2 font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="shadow-xs rounded-xl bg-gold-600 px-4 py-2 font-bold text-white transition hover:bg-gold-700 disabled:opacity-50"
                >
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="z-60 backdrop-blur-xs fixed inset-0 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-serif text-base font-bold text-rose-900">
                Delete Account
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              Are you sure you want to delete your Ruhvi account? This action is
              irreversible. All saved orders, addresses, and store credits will
              be permanently lost.
            </p>
            <div className="flex justify-end space-x-2 border-t border-stone-100 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="shadow-xs rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SpatialPage>
  );
}
