'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  HelpCircle,
  PlusCircle,
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Building2,
  Smartphone,
} from 'lucide-react';

interface WalletTxn {
  id: string;
  created_at: string;
  type: 'credit' | 'debit' | 'cashback';
  amount: number;
  description?: string;
  order_id?: string | null;
}

export default function WalletPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(true);

  // Add Money Modal State
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(350);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'upi' | 'card' | 'netbanking'
  >('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const presetAmounts = [350, 500, 1000, 2500, 5000, 10000];

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    if (profile && typeof profile.wallet_balance !== 'undefined') {
      setBalance(Number(profile.wallet_balance) || 0);
    }
  }, [profile?.wallet_balance]);

  useEffect(() => {
    async function fetchLedger() {
      if (!user) {
        // Fallback demo ledger for unauthenticated/guest preview
        setTransactions([
          {
            id: 'txn-0',
            created_at: new Date().toISOString(),
            type: 'credit',
            amount: 350.0,
            description: 'Added ₹350 to Ruhvi Wallet',
          },
          {
            id: 'txn-1',
            created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
            type: 'cashback',
            amount: 150.0,
            description: '5% Cashback on Order #R-837492',
          },
          {
            id: 'txn-2',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            type: 'credit',
            amount: 1100.0,
            description: 'Refund for Order #R-293847 (Store Credit)',
          },
          {
            id: 'txn-3',
            created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
            type: 'debit',
            amount: 500.0,
            description: 'Paid for Order #R-102938',
          },
        ]);
        setLoadingTxns(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_wallet_transactions', {
          p_user_id: user.id,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          setTransactions(data as WalletTxn[]);
          // Calculate ledger balance
          const ledgerSum = (data as WalletTxn[]).reduce((acc, curr) => {
            const amt = Number(curr.amount) || 0;
            if (curr.type === 'credit' || curr.type === 'cashback')
              return acc + amt;
            if (curr.type === 'debit') return acc - amt;
            return acc;
          }, 0);

          if (
            !profile?.wallet_balance ||
            Number(profile.wallet_balance) === 0
          ) {
            setBalance(ledgerSum);
          }
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error('Error fetching wallet ledger:', err);
      } finally {
        setLoadingTxns(false);
      }
    }

    fetchLedger();

    // Setup realtime subscription on wallet_ledger if user exists
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`wallet-ledger-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_ledger',
        },
        () => {
          fetchLedger();
          refreshProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.wallet_balance]);

  const effectiveAmount = customAmount
    ? parseFloat(customAmount) || 0
    : selectedAmount;

  // Calculate cashback bonus logic (e.g. 5% extra on 5,000+)
  const calculateBonus = (amt: number) => {
    if (amt >= 10000) return 600;
    if (amt >= 5000) return 250;
    if (amt >= 2500) return 100;
    return 0;
  };

  const bonusAmount = calculateBonus(effectiveAmount);
  const totalCreditAmount = effectiveAmount + bonusAmount;

  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveAmount < 100) {
      setTopUpError('Minimum top-up amount is ₹100.');
      return;
    }
    if (effectiveAmount > 100000) {
      setTopUpError('Maximum top-up amount per transaction is ₹1,00,000.');
      return;
    }

    setIsProcessing(true);
    setTopUpError(null);
    setTopUpSuccess(null);

    try {
      if (!user) {
        // Guest mode simulation
        setTimeout(() => {
          setBalance((prev) => prev + totalCreditAmount);
          const newTxn: WalletTxn = {
            id: `txn-sim-${Date.now()}`,
            created_at: new Date().toISOString(),
            type: 'credit',
            amount: totalCreditAmount,
            description:
              bonusAmount > 0
                ? `Added ₹${effectiveAmount} (+₹${bonusAmount} Bonus)`
                : `Added ₹${effectiveAmount} to Wallet`,
          };
          setTransactions((prev) => [newTxn, ...prev]);
          setIsProcessing(false);
          setTopUpSuccess(
            `₹${totalCreditAmount.toLocaleString('en-IN')} added to your Ruhvi Wallet successfully!`
          );
        }, 1200);
        return;
      }

      // 1. Call secure API route to process top-up
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: effectiveAmount }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Failed to top up wallet');

      // 2. Refresh Auth profile to get updated balance
      await refreshProfile();

      // 3. Re-fetch ledger
      const supabase = createClient();
      const { data: updatedLedger } = await supabase.rpc(
        'get_wallet_transactions',
        { p_user_id: user.id }
      );

      if (updatedLedger) {
        setTransactions(updatedLedger as WalletTxn[]);
      }

      setBalance((prev) => prev + totalCreditAmount);
      setTopUpSuccess(
        `₹${totalCreditAmount.toLocaleString('en-IN')} credited to your Ruhvi Wallet!`
      );
      setCustomAmount('');
      setSelectedAmount(1000);
    } catch (err: any) {
      console.error('Top-up error:', err);
      setTopUpError(
        err?.message || 'Payment processing failed. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-semibold text-stone-500 transition-colors hover:text-stone-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Account
        </Link>
      </div>

      {/* Wallet Balance Card */}
      <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl border border-emerald-700/40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-8 text-emerald-50 shadow-2xl sm:p-10 md:flex-row">
        <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>

        <div className="z-10 flex items-center space-x-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-800/80 shadow-inner">
            <Wallet className="h-8 w-8 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
              Available Balance
            </p>
            <h1 className="mt-1 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              ₹
              {balance.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h1>
            <div className="mt-1.5 space-y-1">
              <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-300/90">
                <Sparkles className="h-3 w-3 shrink-0 text-amber-300" /> 100%
                Usable on all Fine Jewellery with Coins
              </p>
              <p className="font-mono text-[10px] text-emerald-200/60">
                * Wallet amount is non-withdrawable to bank accounts
              </p>
            </div>
          </div>
        </div>

        <div className="z-10 flex w-full flex-col items-center space-y-3 md:w-auto md:items-end">
          <button
            onClick={() => setShowAddMoneyModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-950 shadow-lg transition-all hover:scale-105 hover:from-amber-300 hover:to-amber-400 md:w-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Money to Wallet</span>
          </button>
          <p className="text-center text-[10px] text-emerald-200/90 md:text-right">
            Instant Top-Up via UPI, Cards & NetBanking
          </p>
        </div>
      </div>

      {/* Promos Banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 p-4 sm:p-5">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-800">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-stone-900">Wallet Cashback Offer</p>
            <p className="mt-0.5 text-stone-600">
              Top up ₹5,000+ & get an instant{' '}
              <span className="font-bold text-amber-900">₹250 Bonus</span>{' '}
              credited to your wallet!
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedAmount(5000);
            setCustomAmount('');
            setShowAddMoneyModal(true);
          }}
          className="shrink-0 rounded-xl bg-amber-950 px-4 py-2 text-xs font-bold text-amber-100 transition hover:bg-black"
        >
          Top Up ₹5,000
        </button>
      </div>

      {/* Main Grid: Transactions vs Info */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Transaction History */}
        <div className="space-y-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-stone-900">
              Transaction History
            </h2>
            <span className="text-xs font-medium text-stone-500">
              {transactions.length} Records
            </span>
          </div>

          <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {loadingTxns ? (
              <div className="space-y-2 p-8 text-center text-xs text-stone-500">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
                <p>Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="space-y-3 p-10 text-center">
                <Wallet className="mx-auto h-10 w-10 text-stone-300" />
                <p className="text-sm font-semibold text-stone-700">
                  No wallet transactions yet
                </p>
                <p className="mx-auto max-w-sm text-xs text-stone-500">
                  Add money to your Ruhvi Wallet to get instant checkouts and
                  guaranteed 5% cashback on purchases.
                </p>
                <button
                  onClick={() => setShowAddMoneyModal(true)}
                  className="mt-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-950"
                >
                  Add Money Now
                </button>
              </div>
            ) : (
              transactions.map((txn) => {
                const isCredit =
                  txn.type === 'credit' || txn.type === 'cashback';
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-5 transition-colors hover:bg-stone-50 sm:p-6"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          txn.type === 'cashback'
                            ? 'bg-amber-100 text-amber-700'
                            : isCredit
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900">
                          {txn.description ||
                            (txn.type === 'cashback'
                              ? 'Cashback Bonus'
                              : isCredit
                                ? 'Wallet Top-Up'
                                : 'Order Payment')}
                        </p>
                        <p className="mt-1 text-[11px] text-stone-500">
                          {formatDate(txn.created_at)} •{' '}
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {txn.type}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div
                      className={`whitespace-nowrap text-base font-bold ${
                        isCredit ? 'text-emerald-700' : 'text-stone-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}₹
                      {Number(txn.amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Benefits Sidebar */}
        <div className="space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Wallet Benefits
          </h2>

          <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-xs text-stone-600 shadow-sm">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-stone-900">Zero Expiry</p>
                <p className="mt-0.5 text-stone-500">
                  Your wallet balance never expires and remains safe
                  indefinitely.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-stone-900">1-Click Checkout</p>
                <p className="mt-0.5 text-stone-500">
                  Bypass bank OTPs during flash sales for instant order
                  confirmation.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              <div>
                <p className="font-bold text-stone-900">Instant Refunds</p>
                <p className="mt-0.5 text-stone-500">
                  Opt for store credit on returns to receive refunds instantly
                  without waiting 5-7 bank days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg space-y-6 overflow-hidden rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    Add Money to Wallet
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Current Balance: ₹{balance.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddMoneyModal(false);
                  setTopUpSuccess(null);
                  setTopUpError(null);
                }}
                className="p-1 font-bold text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {topUpSuccess ? (
              <div className="space-y-4 py-6 text-center">
                <div className="mx-auto flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-bold text-stone-900">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-stone-600">{topUpSuccess}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddMoneyModal(false);
                    setTopUpSuccess(null);
                  }}
                  className="w-full rounded-xl bg-emerald-900 py-3 text-xs font-bold text-white transition hover:bg-emerald-950"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddMoney} className="space-y-6">
                {topUpError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{topUpError}</span>
                  </div>
                )}

                {/* Preset Amounts */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                    Select Top-Up Amount
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {presetAmounts.map((amt) => {
                      const isSelected =
                        selectedAmount === amt && !customAmount;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setSelectedAmount(amt);
                            setCustomAmount('');
                          }}
                          className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                            isSelected
                              ? 'scale-105 border-emerald-900 bg-emerald-900 text-white shadow-md'
                              : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          +₹{amt.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    Or Enter Custom Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min={100}
                      max={100000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="e.g. 3500"
                      className="w-full rounded-xl border border-stone-300 py-3 pl-8 pr-4 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Cashback bonus calculation alert */}
                {bonusAmount > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span>Cashback Bonus Unlocked!</span>
                    </div>
                    <span className="font-bold text-emerald-700">
                      +₹{bonusAmount} Extra
                    </span>
                  </div>
                )}

                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 font-medium transition ${
                        paymentMethod === 'upi'
                          ? 'border-emerald-700 bg-emerald-50 font-bold text-emerald-950'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Smartphone className="h-4 w-4 text-emerald-600" />
                      <span>UPI / GPay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 font-medium transition ${
                        paymentMethod === 'card'
                          ? 'border-emerald-700 bg-emerald-50 font-bold text-emerald-950'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      <span>Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 font-medium transition ${
                        paymentMethod === 'netbanking'
                          ? 'border-emerald-700 bg-emerald-50 font-bold text-emerald-950'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      <span>NetBanking</span>
                    </button>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="space-y-2 rounded-2xl border border-stone-200/80 bg-stone-50 p-4 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Top-Up Amount:</span>
                    <span className="font-semibold text-stone-900">
                      ₹{effectiveAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {bonusAmount > 0 && (
                    <div className="flex justify-between font-semibold text-emerald-700">
                      <span>Bonus Cashback:</span>
                      <span>+₹{bonusAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-stone-900">
                    <span>Total Wallet Credit:</span>
                    <span className="text-emerald-700">
                      ₹{totalCreditAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessing || effectiveAmount < 100}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-950 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-emerald-300" />
                      <span>
                        Pay ₹{effectiveAmount.toLocaleString('en-IN')} Securly
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
