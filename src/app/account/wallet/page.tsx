'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle } from 'lucide-react';

export default function WalletPage() {
  const [balance, setBalance] = useState(1250.00);

  // Mock ledger data
  const ledger = [
    {
      id: 'txn-1',
      date: 'Today, 10:30 AM',
      type: 'cashback',
      amount: 150.00,
      description: '5% Cashback on Order #R-837492',
      isCredit: true,
    },
    {
      id: 'txn-2',
      date: '24 Jul 2026',
      type: 'credit',
      amount: 1100.00,
      description: 'Refund for Order #R-293847 (Store Credit)',
      isCredit: true,
    },
    {
      id: 'txn-3',
      date: '10 Jun 2026',
      type: 'debit',
      amount: 500.00,
      description: 'Paid for Order #R-102938',
      isCredit: false,
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link href="/account" className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Account
      </Link>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 text-emerald-50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="flex items-center space-x-6 z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-700/50 flex items-center justify-center border border-emerald-600">
            <Wallet className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <p className="text-emerald-200 text-sm font-semibold mb-1 uppercase tracking-wider">Available Balance</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">₹{balance.toFixed(2)}</h1>
          </div>
        </div>

        <div className="z-10 bg-emerald-950/40 p-4 rounded-xl border border-emerald-800 backdrop-blur-sm max-w-xs text-xs space-y-2">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-100/90 leading-relaxed">Pay with Wallet on your next order and get <strong className="text-emerald-300">5% guaranteed cashback</strong> (up to ₹500).</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">Transaction History</h2>
          
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
            {ledger.map((txn) => (
              <div key={txn.id} className="p-5 sm:p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${txn.isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-100 text-stone-600'}`}>
                    {txn.isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">{txn.description}</p>
                    <p className="text-[11px] text-stone-500 mt-1">{txn.date} • {txn.type.toUpperCase()}</p>
                  </div>
                </div>
                <div className={`text-base font-bold whitespace-nowrap ${txn.isCredit ? 'text-emerald-600' : 'text-stone-900'}`}>
                  {txn.isCredit ? '+' : '-'}₹{txn.amount.toFixed(2)}
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
              <p>Wallet balance never expires and can be used on any order.</p>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              <p>Refunds opted as Store Credit appear here instantly, whereas original payment method refunds take 5-7 days.</p>
            </div>
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
              <p>Wallet balance cannot be withdrawn to a bank account.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
