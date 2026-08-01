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
  Smartphone
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
  const [balance, setBalance] = useState<number>(350);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(true);

  // Add Money Modal State
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(350);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const presetAmounts = [350, 500, 1000, 2500, 5000, 10000];

  useEffect(() => {
    if (profile) {
      setBalance(Number(profile.wallet_balance) || 0);
    }
  }, [profile]);

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
        const { data, error } = await supabase
          .from('wallet_ledger')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setTransactions(data as WalletTxn[]);
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
  }, [user]);

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

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
            description: bonusAmount > 0 ? `Added ₹${effectiveAmount} (+₹${bonusAmount} Bonus)` : `Added ₹${effectiveAmount} to Wallet`,
          };
          setTransactions((prev) => [newTxn, ...prev]);
          setIsProcessing(false);
          setTopUpSuccess(`₹${totalCreditAmount.toLocaleString('en-IN')} added to your Ruhvi Wallet successfully!`);
        }, 1200);
        return;
      }

      const supabase = createClient();

      // 1. Insert main credit transaction to wallet_ledger (triggers user table balance update automatically)
      const { error: ledgerError } = await supabase.from('wallet_ledger').insert([
        {
          user_id: user.id,
          amount: totalCreditAmount,
          type: bonusAmount > 0 ? 'cashback' : 'credit',
        },
      ]);

      if (ledgerError) throw ledgerError;

      // 2. Refresh Auth profile to get updated balance
      await refreshProfile();

      // 3. Re-fetch ledger
      const { data: updatedLedger } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (updatedLedger) {
        setTransactions(updatedLedger as WalletTxn[]);
      }

      setBalance((prev) => prev + totalCreditAmount);
      setTopUpSuccess(`₹${totalCreditAmount.toLocaleString('en-IN')} credited to your Ruhvi Wallet!`);
      setCustomAmount('');
      setSelectedAmount(1000);
    } catch (err: any) {
      console.error('Top-up error:', err);
      setTopUpError(err?.message || 'Payment processing failed. Please try again.');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Account
        </Link>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-emerald-50 border border-emerald-700/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-6 z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800/80 flex items-center justify-center border border-emerald-500/40 shadow-inner shrink-0">
            <Wallet className="w-8 h-8 text-emerald-300" />
          </div>
          <div>
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">Available Balance</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold mt-1 tracking-tight">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <div className="mt-1.5 space-y-1">
              <p className="text-[11px] text-emerald-300/90 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" /> 100% Usable on all Fine Jewellery with Coins
              </p>
              <p className="text-[10px] text-emerald-200/60 font-mono">
                * Wallet amount is non-withdrawable to bank accounts
              </p>
            </div>
          </div>
        </div>

        <div className="z-10 flex flex-col items-center md:items-end space-y-3 w-full md:w-auto">
          <button
            onClick={() => setShowAddMoneyModal(true)}
            className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 border border-amber-300"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Money to Wallet</span>
          </button>
          <p className="text-[10px] text-emerald-200/90 text-center md:text-right">
            Instant Top-Up via UPI, Cards & NetBanking
          </p>
        </div>
      </div>

      {/* Promos Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10 border border-amber-300/60 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-stone-900">Wallet Cashback Offer</p>
            <p className="text-stone-600 mt-0.5">Top up ₹5,000+ & get an instant <span className="font-bold text-amber-900">₹250 Bonus</span> credited to your wallet!</p>
          </div>
        </div>
        <button
          onClick={() => {
            setSelectedAmount(5000);
            setCustomAmount('');
            setShowAddMoneyModal(true);
          }}
          className="px-4 py-2 bg-amber-950 text-amber-100 rounded-xl font-bold text-xs hover:bg-black transition shrink-0"
        >
          Top Up ₹5,000
        </button>
      </div>

      {/* Main Grid: Transactions vs Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Transaction History */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-stone-900">Transaction History</h2>
            <span className="text-xs text-stone-500 font-medium">{transactions.length} Records</span>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden divide-y divide-stone-100">
            {loadingTxns ? (
              <div className="p-8 text-center text-xs text-stone-500 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Wallet className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm font-semibold text-stone-700">No wallet transactions yet</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Add money to your Ruhvi Wallet to get instant checkouts and guaranteed 5% cashback on purchases.
                </p>
                <button
                  onClick={() => setShowAddMoneyModal(true)}
                  className="mt-2 px-5 py-2.5 bg-emerald-900 text-white text-xs font-bold rounded-xl hover:bg-emerald-950 transition"
                >
                  Add Money Now
                </button>
              </div>
            ) : (
              transactions.map((txn) => {
                const isCredit = txn.type === 'credit' || txn.type === 'cashback';
                return (
                  <div
                    key={txn.id}
                    className="p-5 sm:p-6 flex items-center justify-between hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          txn.type === 'cashback'
                            ? 'bg-amber-100 text-amber-700'
                            : isCredit
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-900">
                          {txn.description || (txn.type === 'cashback' ? 'Cashback Bonus' : isCredit ? 'Wallet Top-Up' : 'Order Payment')}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-1">
                          {formatDate(txn.created_at)} •{' '}
                          <span className="uppercase font-semibold tracking-wider text-[10px]">
                            {txn.type}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-base font-bold whitespace-nowrap ${
                        isCredit ? 'text-emerald-700' : 'text-stone-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Benefits Sidebar */}
        <div className="space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">Wallet Benefits</h2>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4 text-xs text-stone-600">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-stone-900">Zero Expiry</p>
                <p className="text-stone-500 mt-0.5">Your wallet balance never expires and remains safe indefinitely.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-stone-900">1-Click Checkout</p>
                <p className="text-stone-500 mt-0.5">Bypass bank OTPs during flash sales for instant order confirmation.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-stone-900">Instant Refunds</p>
                <p className="text-stone-500 mt-0.5">Opt for store credit on returns to receive refunds instantly without waiting 5-7 bank days.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">Add Money to Wallet</h3>
                  <p className="text-[11px] text-stone-500">Current Balance: ₹{balance.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddMoneyModal(false);
                  setTopUpSuccess(null);
                  setTopUpError(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {topUpSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-serif text-xl font-bold text-stone-900">Payment Successful!</h4>
                  <p className="text-xs text-stone-600">{topUpSuccess}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddMoneyModal(false);
                    setTopUpSuccess(null);
                  }}
                  className="w-full py-3 bg-emerald-900 text-white rounded-xl font-bold text-xs hover:bg-emerald-950 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddMoney} className="space-y-6">
                {topUpError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{topUpError}</span>
                  </div>
                )}

                {/* Preset Amounts */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Select Top-Up Amount
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {presetAmounts.map((amt) => {
                      const isSelected = selectedAmount === amt && !customAmount;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setSelectedAmount(amt);
                            setCustomAmount('');
                          }}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-emerald-900 text-white border-emerald-900 shadow-md scale-105'
                              : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
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
                  <label className="block text-xs font-semibold text-stone-700">Or Enter Custom Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                    <input
                      type="number"
                      min={100}
                      max={100000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="e.g. 3500"
                      className="w-full pl-8 pr-4 py-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-stone-900"
                    />
                  </div>
                </div>

                {/* Cashback bonus calculation alert */}
                {bonusAmount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Cashback Bonus Unlocked!</span>
                    </div>
                    <span className="font-bold text-emerald-700">+₹{bonusAmount} Extra</span>
                  </div>
                )}

                {/* Payment Method Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition ${
                        paymentMethod === 'upi'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                      <span>UPI / GPay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition ${
                        paymentMethod === 'card'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-medium transition ${
                        paymentMethod === 'netbanking'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>NetBanking</span>
                    </button>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Top-Up Amount:</span>
                    <span className="font-semibold text-stone-900">₹{effectiveAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {bonusAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Bonus Cashback:</span>
                      <span>+₹{bonusAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                    <span>Total Wallet Credit:</span>
                    <span className="text-emerald-700">₹{totalCreditAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessing || effectiveAmount < 100}
                  className="w-full py-4 bg-emerald-900 text-white font-bold text-sm rounded-xl hover:bg-emerald-950 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-emerald-300" />
                      <span>Pay ₹{effectiveAmount.toLocaleString('en-IN')} Securly</span>
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
