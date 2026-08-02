'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Copy, Check, Users, Gift, ArrowRight } from 'lucide-react';

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  
  const referralCode = 'RHV-A1B2C3';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : `https://ruhvi.vercel.app/?ref=${referralCode}`;

  // Mock referrals data
  const referrals = [
    {
      id: 'ref-1',
      name: 'Rahul Verma',
      date: '20 Jul 2026',
      status: 'completed', // completed, pending, expired
      coins: 500,
    },
    {
      id: 'ref-2',
      name: 'Priya Sharma',
      date: '28 Jul 2026',
      status: 'pending',
      coins: 500,
    },
    {
      id: 'ref-3',
      name: 'Amit Patel',
      date: '10 Jun 2026',
      status: 'expired',
      coins: 0,
    }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link href="/account" className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Account
      </Link>

      {/* Referral Hero Card */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden text-center text-purple-50">
        <div className="absolute top-0 left-0 -ml-16 -mt-16 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mr-16 -mb-16 w-64 h-64 bg-purple-400 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-700/50 flex items-center justify-center border border-purple-600">
            <Gift className="w-8 h-8 text-purple-300" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">Refer a Friend, Get 500 Coins</h1>
            <p className="text-purple-200 text-sm">Invite friends to Ruhvi. When they make their first purchase, you get 500 Reward Coins (worth ₹50) after their return window closes.</p>
          </div>

          <div className="mt-8 bg-purple-950/40 p-2 pl-4 rounded-xl border border-purple-800 backdrop-blur-sm flex items-center justify-between shadow-inner">
            <span className="font-mono text-purple-100 font-medium truncate pr-4 text-sm">{referralLink}</span>
            <div className="flex items-center space-x-2 shrink-0">
              <button 
                onClick={handleCopy}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-700 hover:bg-purple-600 text-purple-50 transition-colors"
                title="Copy Link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button 
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-stone-400" />
            <span>Your Referrals</span>
          </h2>
          
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
            {referrals.map((ref) => (
              <div key={ref.id} className="p-5 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-stone-900">{ref.name}</p>
                  <p className="text-[11px] text-stone-500 mt-1">Invited on {ref.date}</p>
                </div>
                <div className="text-right">
                  {ref.status === 'completed' && (
                    <>
                      <p className="text-sm font-bold text-emerald-600">+{ref.coins} Coins</p>
                      <p className="text-[10px] text-emerald-700/70 font-semibold mt-0.5 bg-emerald-50 inline-block px-2 py-0.5 rounded">Completed</p>
                    </>
                  )}
                  {ref.status === 'pending' && (
                    <>
                      <p className="text-sm font-bold text-amber-600">Pending</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">Awaiting return window</p>
                    </>
                  )}
                  {ref.status === 'expired' && (
                    <>
                      <p className="text-sm font-bold text-stone-400 line-through">+{ref.coins} Coins</p>
                      <p className="text-[10px] text-stone-500 mt-0.5 bg-stone-100 inline-block px-2 py-0.5 rounded">Order Cancelled/Returned</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">How it works</h2>
          
          <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 space-y-4 text-sm text-stone-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">1</div>
              <p>Share your unique referral link with a friend.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">2</div>
              <p>They click the link and sign up for a new account.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">3</div>
              <p>When they place their first order (minimum ₹100), it enters the <strong className="font-semibold text-stone-800">Pending</strong> state.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">4</div>
              <p>Once their 7-day return window closes without a return, you get 500 coins!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
