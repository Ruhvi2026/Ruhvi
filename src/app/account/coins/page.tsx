'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle } from 'lucide-react';

export default function RewardCoinsPage() {
  const [coins, setCoins] = useState(3450);

  // 10 coins = ₹1
  const rupeeValue = coins / 10;

  // Mock ledger data
  const ledger = [
    {
      id: 'txn-1',
      date: 'Today, 10:30 AM',
      type: 'earned',
      amount: 450,
      description: '10% Reward on Order #R-837492',
      isCredit: true,
      expiresAt: '08 Nov 2026',
    },
    {
      id: 'txn-2',
      date: '24 Jul 2026',
      type: 'earned',
      amount: 3000,
      description: 'Referral Bonus: Invited Rahul Verma',
      isCredit: true,
      expiresAt: '01 Nov 2026',
    },
    {
      id: 'txn-3',
      date: '10 Jun 2026',
      type: 'redeemed',
      amount: 1500,
      description: 'Redeemed on Order #R-102938',
      isCredit: false,
      expiresAt: null,
    },
    {
      id: 'txn-4',
      date: '01 Jun 2026',
      type: 'expired',
      amount: 250,
      description: 'Coins Expired',
      isCredit: false,
      expiresAt: null,
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link href="/account" className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Account
      </Link>

      {/* Coins Balance Card */}
      <div className="bg-gradient-to-r from-yellow-900 to-yellow-800 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 text-yellow-50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-yellow-500 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="flex items-center space-x-6 z-10">
          <div className="w-16 h-16 rounded-2xl bg-yellow-700/50 flex items-center justify-center border border-yellow-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
          </div>
          <div>
            <p className="text-yellow-200 text-sm font-semibold mb-1 uppercase tracking-wider">Reward Coins Balance</p>
            <div className="flex items-baseline space-x-3">
              <h1 className="font-serif text-4xl sm:text-5xl font-bold">{coins}</h1>
              <span className="text-yellow-300 font-semibold text-lg">≈ ₹{rupeeValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="z-10 bg-yellow-950/40 p-4 rounded-xl border border-yellow-800 backdrop-blur-sm max-w-xs text-xs space-y-2">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-yellow-100/90 leading-relaxed">Earn <strong className="text-yellow-300">10% back</strong> in reward coins on every purchase. Minimum order ₹250 to redeem.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">Coin History</h2>
          
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
            {ledger.map((txn) => (
              <div key={txn.id} className="p-5 sm:p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${txn.isCredit ? 'bg-yellow-100 text-yellow-600' : 'bg-stone-100 text-stone-600'}`}>
                    {txn.isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{txn.description}</p>
                    <p className="text-[11px] text-stone-500 mt-1">{txn.date} • {txn.type.toUpperCase()}</p>
                    {txn.expiresAt && txn.isCredit && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Expires: {txn.expiresAt}</p>
                    )}
                  </div>
                </div>
                <div className={`text-base font-bold whitespace-nowrap ${txn.isCredit ? 'text-yellow-600' : 'text-stone-900'}`}>
                  {txn.isCredit ? '+' : '-'} {txn.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">How it works</h2>
          
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 space-y-4 text-sm text-stone-600">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              <p>Coins are credited after the 7-day return window of your order closes.</p>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              <p>Coins expire 100 days after they are credited. We will notify you before they expire.</p>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              <p>10 Coins = ₹1 value. They can be stacked with coupons and wallet balance during checkout.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
