'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, MapPin, Package, RefreshCw, Bell, Shield, Key, Trash2, ArrowRight, Check, AlertTriangle } from 'lucide-react';

export default function AccountOverviewPage() {
  const [profile, setProfile] = useState({
    full_name: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    phone: '+91 98765 43210',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDeleteAccount = () => {
    alert('Account deletion request submitted. An email confirmation has been sent.');
    setShowDeleteModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Profile Banner Card */}
      <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-amber-100 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full bg-amber-400/20 text-amber-300 font-serif font-bold text-3xl flex items-center justify-center border-2 border-amber-400/40">
            AS
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">{profile.full_name}</h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border border-amber-500/30">
                Gold Club Member
              </span>
            </div>
            <p className="text-xs text-stone-300 font-mono">{profile.email} • {profile.phone}</p>
            <p className="text-[11px] text-stone-400">Member since July 2026</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="px-5 py-2.5 bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all hover:scale-105"
        >
          Edit Profile
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Profile details updated successfully!</span>
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
            <span>View Orders</span>
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
          <p className="text-xs text-stone-500 mt-1">Manage delivery locations & defaults</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-900 space-x-1">
            <span>Manage Address Book</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/wallet"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:bg-emerald-700 group-hover:text-emerald-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5.3 7.7 2 2 0 0 1-2.7-2.7H5a2 2 0 0 1-2-2V9"/><path d="M22 12v3h-3a2 2 0 0 1 0-4h3z"/></svg>
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-emerald-700">Ruhvi Wallet</h3>
          <p className="text-xs text-stone-500 mt-1">Get 5% cashback on wallet payments</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-emerald-700 space-x-1">
            <span>View Balance</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/coins"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-4 group-hover:bg-yellow-600 group-hover:text-yellow-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-yellow-600">Reward Coins</h3>
          <p className="text-xs text-stone-500 mt-1">Earn 10% back on every purchase</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-yellow-600 space-x-1">
            <span>Redeem Coins</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/account/referrals"
          className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4 group-hover:bg-purple-700 group-hover:text-purple-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 className="font-bold text-sm text-stone-900 group-hover:text-purple-700">Refer a Friend</h3>
          <p className="text-xs text-stone-500 mt-1">Earn 500 coins for each friend</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-purple-700 space-x-1">
            <span>Get Referral Link</span>
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
          <p className="text-xs text-stone-500 mt-1">Updates on orders & offers</p>
          <div className="mt-4 flex items-center text-xs font-semibold text-amber-900 space-x-1">
            <span>View Inbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Edit Profile / Security Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-4 flex items-center space-x-2">
            <User className="w-5 h-5 text-amber-800" />
            <span>Profile Details</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-500"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Mobile Phone Number</label>
              <input
                type="tel"
                disabled={!isEditing}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-50"
              />
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-950 text-amber-100 font-bold rounded-lg hover:bg-amber-900"
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Account Security & Danger Zone */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-amber-800" />
              <span>Security & Privacy</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="flex items-center space-x-3">
                  <Key className="w-4 h-4 text-amber-800" />
                  <div>
                    <div className="font-semibold text-stone-900">Password & Authentication</div>
                    <div className="text-[10px] text-stone-500">Secured via Supabase Auth</div>
                  </div>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-amber-900 hover:underline font-semibold text-[11px]"
                >
                  Change
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center space-x-1.5 p-2 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Request Account Deletion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-serif text-xl font-bold text-stone-900">Confirm Account Deletion</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                This action will delete your account profile and saved addresses. Anonymized invoice records will be retained for legal GST compliance.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-stone-100 text-xs">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
