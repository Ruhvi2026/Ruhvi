'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function RewardCoinsPage() {
  const { user, profile } = useAuth();
  const coins = Number(profile?.reward_coins) || 0;

  // 10 coins = ₹1
  const rupeeValue = coins / 10;

  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLedger() {
      if (!user) {
        // Fallback demo ledger for unauthenticated/guest preview
        setLedger([
          {
            id: 'txn-1',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            type: 'earned',
            amount: 450,
            description: '10% Reward on Order #R-837492',
            isCredit: true,
            expiresAt: '08 Nov 2026',
          },
          {
            id: 'txn-2',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            type: 'earned',
            amount: 3000,
            description: 'Referral Bonus: Invited Rahul Verma',
            isCredit: true,
            expiresAt: '01 Nov 2026',
          },
          {
            id: 'txn-3',
            created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
            type: 'redeemed',
            amount: 1500,
            description: 'Redeemed on Order #R-102938',
            isCredit: false,
            expiresAt: null,
          },
        ]);
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('reward_coin_ledger')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform Supabase rows to match ledger UI fields
        const formatted = (data || []).map((row: any) => {
          const isCredit = row.type === 'earned' || row.type === 'cashback';
          // Estimate expiry (100 days from creation)
          const expiryDate = isCredit
            ? new Date(
                new Date(row.created_at).getTime() + 100 * 24 * 60 * 60 * 1000
              ).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : null;
          return {
            id: row.id,
            date: new Date(row.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            type: row.type,
            amount: row.amount,
            description:
              row.description || (isCredit ? 'Coins Earned' : 'Coins Redeemed'),
            isCredit,
            expiresAt: expiryDate,
          };
        });

        setLedger(formatted);
      } catch (err) {
        console.error('Error fetching coin ledger:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLedger();
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/account"
        className="inline-flex items-center text-xs font-semibold text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Account
      </Link>

      {/* Coins Balance Card */}
      <div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-r from-yellow-900 to-yellow-800 p-8 text-yellow-50 shadow-xl sm:p-10 md:flex-row">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-yellow-500 opacity-10 blur-3xl"></div>

        <div className="z-10 flex items-center space-x-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-600 bg-yellow-700/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-yellow-300"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-wider text-yellow-200">
              Reward Coins Balance
            </p>
            <div className="flex items-baseline space-x-3">
              <h1 className="font-serif text-4xl font-bold sm:text-5xl">
                {coins}
              </h1>
              <span className="text-lg font-semibold text-yellow-300">
                ≈ ₹{rupeeValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="z-10 max-w-xs space-y-2 rounded-xl border border-yellow-800 bg-yellow-950/40 p-4 text-xs backdrop-blur-sm">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <p className="leading-relaxed text-yellow-100/90">
              Earn <strong className="text-yellow-300">10% back</strong> in
              reward coins on every purchase. Minimum order ₹250 to redeem.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Coin History
          </h2>

          <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-xs text-stone-500">
                Loading coin transactions...
              </div>
            ) : ledger.length === 0 ? (
              <div className="p-10 text-center text-xs text-stone-500">
                No coin transactions found.
              </div>
            ) : (
              ledger.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-5 transition-colors hover:bg-stone-50 sm:p-6"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${txn.isCredit ? 'bg-yellow-100 text-yellow-600' : 'bg-stone-100 text-stone-600'}`}
                    >
                      {txn.isCredit ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">
                        {txn.description}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-500">
                        {txn.date} • {txn.type.toUpperCase()}
                      </p>
                      {txn.expiresAt && txn.isCredit && (
                        <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
                          Expires: {txn.expiresAt}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className={`whitespace-nowrap text-base font-bold ${txn.isCredit ? 'text-yellow-600' : 'text-stone-900'}`}
                  >
                    {txn.isCredit ? '+' : '-'} {txn.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            How it works
          </h2>

          <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
            <div className="flex items-start space-x-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
              <p>
                Coins are credited after the 7-day return window of your order
                closes.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
              <p>
                Coins expire 100 days after they are credited. We will notify
                you before they expire.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
              <p>
                10 Coins = ₹1 value. They can be stacked with coupons and wallet
                balance during checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
