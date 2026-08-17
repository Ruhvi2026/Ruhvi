import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Coins, Wallet, Share2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refer a Friend | Ruhvi Jewels',
  description:
    'Invite your friends to Ruhvi and earn Reward Coins and Wallet Balance.',
};

export default function ReferralPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl space-y-12 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-gold-600">
            Ruhvi Rewards
          </span>
          <h1 className="font-serif text-4xl font-bold text-stone-900 sm:text-5xl">
            Refer a Friend
          </h1>
          <p className="mx-auto max-w-2xl text-stone-600">
            Invite your friends to Ruhvi and get rewarded. Share the love for
            fine jewellery!
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-xl sm:p-12">
          <h2 className="text-center font-serif text-2xl font-bold text-stone-900">
            How It Works
          </h2>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* For You */}
            <div className="flex flex-col items-center space-y-4 rounded-2xl border border-stone-100 bg-stone-50 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                <Coins className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">You Get</h3>
              <p className="text-sm text-stone-600">
                <strong className="text-gold-700">
                  500 Reward Coins (₹50 value)
                </strong>{' '}
                once your friend&apos;s order is delivered and passes the 7-day
                return window.
              </p>
            </div>

            {/* For Friend */}
            <div className="flex flex-col items-center space-y-4 rounded-2xl border border-stone-100 bg-stone-50 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 text-gold-600">
                <Wallet className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">They Get</h3>
              <p className="text-sm text-stone-600">
                <strong className="text-gold-700">
                  ₹100 in Wallet balance
                </strong>{' '}
                — a ₹50 signup bonus (given to every new customer) plus an extra
                ₹50 for using your referral.
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-stone-200 pt-6 text-center">
            <p className="mx-auto max-w-xl text-sm text-stone-500">
              Reward Coins expire 100 days from issue. Wallet balance never
              expires and has no minimum order value. Wallet balance is
              non-withdrawable and can only be used for purchases on Ruhvi.
            </p>
            <div className="flex justify-center pt-4">
              <Link
                href="/account"
                className="flex items-center space-x-2 rounded-xl bg-stone-900 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-colors hover:bg-stone-800"
              >
                <Share2 className="h-4 w-4" />
                <span>Get Your Referral Link</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
