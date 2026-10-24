'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Upload,
  Camera,
  Trash2,
  Loader2,
  ImageIcon,
  Coins,
  Tag,
  Crown,
  Zap,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import { Order, ReturnRequest } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function OrderReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const router = useRouter();
  const { user, profile } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Value Loss & Retention Calculations
  const isVip = Boolean(profile?.is_vip);
  const orderSubtotal = Number(order?.subtotal || order?.total || 0);
  const orderTotal = Number(order?.total || 0);
  const walletUsed = Number(order?.wallet_used || 0);

  // External direct money paid (UPI, Card, Netbanking, COD) - excludes wallet and coins
  const externalCashPaid = Math.max(0, orderTotal - walletUsed);

  // Anti-Loop Guard: 5% bonus is STRICTLY applied only to the external cash/gateway amount
  const walletBonusAmount =
    externalCashPaid > 0 ? Math.floor(externalCashPaid * 0.05) : 0;
  const totalWalletCredit = orderTotal + walletBonusAmount;
  const hasExternalCash = externalCashPaid > 0;

  const earnedCoins = Math.floor(orderSubtotal * (isVip ? 20 : 10));
  const coinsCashbackValue = Math.floor(earnedCoins / 10);
  const couponDiscount = Number(order?.coupon_discount || 0);

  // Form State
  const [reason, setReason] = useState('Size mismatch');
  const [tagIntact, setTagIntact] = useState(false);
  const [refundMethod, setRefundMethod] = useState<'original' | 'wallet'>(
    'original'
  );
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Defect Photo Attachment State
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size must be under 10 MB.');
      return;
    }

    setUploadingImage(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          setAttachmentUrl(data.secure_url);
          toast.success('Defect photo uploaded successfully.');
          return;
        }
      }

      // Client DataURL fallback if session is guest or rate limited
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachmentUrl(dataUrl);
        toast.success('Photo attached locally for return review.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Upload fallback to data URL:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachmentUrl(dataUrl);
        toast.success('Photo attached for review.');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentUrl('');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchOrder() {
      if (!user) {
        try {
          const saved = localStorage.getItem('ruhvi_orders_v1');
          if (saved) {
            const parsed: Order[] = JSON.parse(saved);
            const match = parsed.find(
              (o) => o.id === orderId || o.order_number === orderId
            );
            if (isMounted && match) setOrder(match);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setLoading(false);
        }
        return;
      }

      try {
        const supabase = createClient();
        let { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, product(*))')
          .eq('id', orderId)
          .maybeSingle();

        if (!data && !error) {
          const byNumber = await supabase
            .from('orders')
            .select('*, order_items(*, product(*))')
            .eq('order_number', orderId)
            .maybeSingle();
          data = byNumber.data;
          error = byNumber.error;
        }

        if (error) throw error;
        if (isMounted && data) setOrder(data as Order);
      } catch (err) {
        console.error('Error fetching real order:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, user]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagIntact) {
      setErrorMessage(
        'Returns can only be accepted if the security/authenticity tag remains intact.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    if (user) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('returns').insert({
          order_id: order?.id || orderId,
          user_id: user.id,
          reason,
          status: 'requested',
          item_condition: 'tag_intact',
          refund_method: refundMethod,
          comments,
          attachment_url: attachmentUrl || null,
        });

        if (error) throw error;

        // Dispath proactive alert to Support & Orders channels in background
        try {
          fetch('/api/internal-chat/proactive-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'RETURN_REQUESTED',
              department: 'support',
              orderId: order?.id || orderId,
              orderNumber: order?.order_number,
              customerName: user?.email ? user.email.split('@')[0] : 'Customer',
              customerPhone: (order as any)?.shipping_address?.phone,
              reason,
              customerNote: comments,
              photoUrl: attachmentUrl || undefined,
              itemName:
                (order as any)?.order_items?.[0]?.product?.title ||
                'Fine Jewellery Piece',
            }),
          }).catch(() => {});
        } catch {}

        toast.success('Return request submitted successfully.');
        setTimeout(() => {
          setIsSubmitting(false);
          router.push('/account/returns');
        }, 600);
        return;
      } catch (err) {
        console.error('Failed to submit return:', err);
        setErrorMessage(
          'Failed to submit return request. Please contact support@ruhvi.in.'
        );
        setIsSubmitting(false);
        return;
      }
    }

    // Guest fallback — store locally
    const newReturn: ReturnRequest = {
      id: `ret-${Date.now()}`,
      order_id: order?.id || orderId,
      order_number: order?.order_number || 'RHV-2026-8942',
      reason,
      item_condition: 'tag_intact',
      refund_method: refundMethod,
      comments,
      attachment_url: attachmentUrl || null,
      status: 'requested',
      requested_at: new Date().toISOString(),
      order: order || undefined,
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem('ruhvi_returns_v1') || '[]'
      );
      localStorage.setItem(
        'ruhvi_returns_v1',
        JSON.stringify([newReturn, ...existing])
      );
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/account/returns');
    }, 600);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-stone-500">
        Loading order return eligibility...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-stone-200 pb-6">
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="flex items-center space-x-3 font-serif text-3xl font-bold text-stone-900">
            <RefreshCw className="h-7 w-7 text-amber-900" />
            <span>7-Day Return Request</span>
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Order:{' '}
            <span className="font-mono font-bold text-stone-900">
              {order?.order_number || orderId}
            </span>
          </p>
        </div>
      </div>

      {/* Policy banner */}
      <div className="flex items-start space-x-3 rounded-xl border border-amber-900/10 bg-amber-950/5 p-4 text-xs text-amber-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-800" />
        <div className="space-y-1">
          <span className="font-bold">
            Ruhvi 7-Day Hassle-Free Return Guarantee
          </span>
          <p className="text-xs leading-relaxed text-stone-600">
            All fine jewellery items are eligible for return within 7 days of
            delivery provided the security seal and authenticity tag are intact
            and un-tampered.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Return Request Form */}
      <form
        onSubmit={handleSubmitReturn}
        className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h3 className="border-b border-stone-100 pb-3 font-serif text-lg font-bold text-stone-900">
          Return Request Details
        </h3>

        <div className="space-y-4 text-xs">
          {/* Reason Selector */}
          <div>
            <label className="mb-1 block font-semibold text-stone-700">
              Reason for Return *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Size mismatch">
                Size mismatch / Incorrect fit
              </option>
              <option value="Defective or damaged">
                Defective or damaged piece
              </option>
              <option value="Wrong item received">Wrong item received</option>
              <option value="Not as pictured">
                Design differs from expectations
              </option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          {/* Photo Evidence / Defect Image Upload */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <label className="block font-semibold text-stone-800">
                  Defect / Item Photo Evidence
                </label>
                <p className="text-xs text-stone-500">
                  {reason === 'Defective or damaged' ||
                  reason === 'Wrong item received'
                    ? '📸 Attaching a photo showing the damaged area or tag is strongly recommended to fast-track courier reverse pickup approval.'
                    : 'Attach a photo showing the intact authenticity tag or item condition (Optional).'}
                </p>
              </div>
              <span className="rounded bg-stone-200/60 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                JPG, PNG, WebP · Max 10MB
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadError && (
              <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {attachmentUrl ? (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-stone-300 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    <img
                      src={attachmentUrl}
                      alt="Defect proof preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Photo Attached Successfully</span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-stone-500">
                      Evidence ready for quality review
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-800"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove / Re-upload</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white p-5 text-center transition-colors hover:border-amber-700 hover:bg-amber-50/20"
              >
                {uploadingImage ? (
                  <div className="flex items-center gap-2 py-2 text-xs font-semibold text-amber-900">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-800" />
                    <span>Uploading defect evidence to secure storage...</span>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-900/10 text-amber-900">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-stone-800">
                      Click to Capture Photo or Choose File
                    </span>
                    <span className="mt-1 text-[11px] text-stone-500">
                      Take a clear photo with your phone camera or select from
                      gallery
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Tag Condition Verification Checkbox */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <label className="flex cursor-pointer items-start space-x-3">
              <input
                type="checkbox"
                required
                checked={tagIntact}
                onChange={(e) => setTagIntact(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-amber-900"
              />
              <div>
                <span className="font-bold text-stone-900">
                  I confirm that the original Ruhvi security seal & authenticity
                  tag is unbroken and intact *
                </span>
                <p className="mt-0.5 text-xs text-stone-500">
                  Items with broken or tampered security tags cannot be accepted
                  under GSTR return rules.
                </p>
              </div>
            </label>
          </div>

          {/* Value Loss & Retention Disclaimer Banner */}
          <div className="rounded-2xl border border-amber-900/20 bg-gradient-to-br from-amber-50/70 via-amber-100/20 to-white p-5 shadow-sm">
            <div className="flex items-start gap-3 border-b border-amber-900/10 pb-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-900/10 text-amber-900">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="flex items-center gap-2 font-serif text-sm font-bold text-amber-950">
                  <span>Benefits & Rewards You Forfeit Upon Return</span>
                  <span className="rounded-full bg-amber-900/10 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                    Value Loss Notice
                  </span>
                </h4>
                <p className="mt-0.5 text-xs text-stone-600">
                  Submitting this return request will automatically claw back
                  the promotional savings and loyalty progress earned on Order #
                  {order?.order_number || orderId}:
                </p>
              </div>
            </div>

            {/* 4 Benefit Cards Grid */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Coins Loss */}
              <div className="rounded-xl border border-amber-900/10 bg-white/80 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Coins className="h-4 w-4" />
                  <span>
                    -{earnedCoins.toLocaleString('en-IN')} Reward Coins
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  Earned {isVip ? '2X Privé VIP (20%)' : '10%'} coin cashback
                  worth ~₹{coinsCashbackValue} will be deducted from your
                  account.
                </p>
              </div>

              {/* Coupon Loss */}
              <div className="rounded-xl border border-amber-900/10 bg-white/80 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Tag className="h-4 w-4" />
                  <span>
                    {couponDiscount > 0
                      ? `-₹${couponDiscount.toLocaleString('en-IN')} Promo Coupon Lost`
                      : 'One-Time Coupon Reversal'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  One-time promotional discounts and welcome coupons cannot be
                  re-issued or restored upon return.
                </p>
              </div>

              {/* Privé Tier Milestone */}
              <div className="rounded-xl border border-amber-900/10 bg-white/80 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Crown className="h-4 w-4" />
                  <span>Privé VIP Tier Milestone</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  Spend milestones contributing toward your Ruhvi Privé VIP
                  status renewal will be subtracted.
                </p>
              </div>

              {/* Referral & Promo Reversal */}
              <div className="rounded-xl border border-amber-900/10 bg-white/80 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Gift className="h-4 w-4" />
                  <span>Referral Credits Reversal</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  Any referral rewards or affiliate credits linked to this
                  purchase will be rescinded.
                </p>
              </div>
            </div>

            {/* Smart Retention Offer: Ruhvi Wallet Instant Credit (Anti-Loop Guarded) */}
            {hasExternalCash ? (
              <div className="mt-4 rounded-xl border border-emerald-700/30 bg-emerald-950/[0.04] p-3.5">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        Recommended: Instant Refund via Ruhvi Wallet
                        <span className="py-0.2 rounded bg-emerald-600 px-1.5 font-sans text-[10px] font-semibold text-white">
                          +5% Bonus
                        </span>
                      </span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                        Zero bank waiting! Instant credit the moment parcel is
                        picked up + extra{' '}
                        <strong className="text-emerald-800">
                          ₹{walletBonusAmount.toLocaleString('en-IN')} bonus
                          cashback
                        </strong>{' '}
                        (5% on ₹{externalCashPaid.toLocaleString('en-IN')}{' '}
                        direct payment) added to your wallet.
                      </p>
                      {walletUsed > 0 && (
                        <p className="mt-1 text-[10px] text-stone-500">
                          * Note: Used wallet balance of ₹
                          {walletUsed.toLocaleString('en-IN')} is restored 1:1.
                          The 5% bonus applies strictly to your direct payment
                          portion to prevent repeat return loops.
                        </p>
                      )}
                    </div>
                  </div>

                  {refundMethod !== 'wallet' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRefundMethod('wallet');
                        toast.success(
                          `Switched to Instant Wallet Refund (+₹${walletBonusAmount} Bonus)!`
                        );
                      }}
                      className="w-full flex-shrink-0 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 sm:w-auto"
                    >
                      Switch & Get +₹{walletBonusAmount}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Bonus Active (+₹{walletBonusAmount})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-900/20 bg-amber-50/50 p-3.5">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-900/10 text-amber-900">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                        Instant 100% Wallet Balance Restoration
                        <span className="py-0.2 rounded bg-amber-900/10 px-1.5 font-sans text-[10px] font-semibold text-amber-900">
                          Instant Credit
                        </span>
                      </span>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">
                        Since this order was paid 100% using Ruhvi Wallet
                        balance, your full balance of{' '}
                        <strong className="text-stone-900">
                          ₹{orderTotal.toLocaleString('en-IN')}
                        </strong>{' '}
                        will be restored to your wallet immediately upon return
                        pickup with zero banking delay.
                      </p>
                      <p className="mt-1 text-[10px] text-stone-500">
                        * 5% promotional bonus applies exclusively to external
                        card/UPI/COD payments to maintain anti-loop security.
                      </p>
                    </div>
                  </div>

                  {refundMethod !== 'wallet' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRefundMethod('wallet');
                        toast.success('Selected Instant Wallet Restoration!');
                      }}
                      className="w-full flex-shrink-0 rounded-lg bg-amber-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-800 sm:w-auto"
                    >
                      Select Wallet (Instant)
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">
                      <CheckCircle2 className="h-4 w-4 text-amber-800" />
                      Instant Restoration Active
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Refund Method Selector */}
          <div>
            <label className="mb-2 block font-semibold text-stone-700">
              Preferred Refund Method *
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                onClick={() => setRefundMethod('original')}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  refundMethod === 'original'
                    ? 'border-amber-900 bg-amber-950/5 font-semibold ring-1 ring-amber-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="text-stone-900">Original Payment Source</div>
                  <div className="text-xs text-stone-500">
                    Refund back to original UPI/Card/Bank (5-7 days)
                  </div>
                </div>
                {refundMethod === 'original' && (
                  <CheckCircle2 className="h-4 w-4 text-amber-900" />
                )}
              </div>

              <div
                onClick={() => setRefundMethod('wallet')}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  refundMethod === 'wallet'
                    ? 'border-amber-900 bg-amber-950/5 font-semibold ring-1 ring-amber-900'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-stone-900">
                    <span>Ruhvi Store Credit / Wallet</span>
                    {hasExternalCash && (
                      <span className="py-0.2 rounded border border-emerald-300 bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-800">
                        +5% Bonus (+₹{walletBonusAmount})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500">
                    {hasExternalCash
                      ? `Instant credit upon return pickup + ₹${walletBonusAmount} bonus (5% on ₹${externalCashPaid} direct payment)`
                      : `Instant 100% wallet restoration upon return pickup (₹${orderTotal.toLocaleString('en-IN')})`}
                  </div>
                </div>
                {refundMethod === 'wallet' && (
                  <CheckCircle2 className="h-4 w-4 text-amber-900" />
                )}
              </div>
            </div>
          </div>

          {/* Comments & Additional details */}
          <div>
            <label className="mb-1 block font-semibold text-stone-700">
              Additional Comments / Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Describe any specifics regarding the issue or pickup instructions..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full rounded-xl border border-stone-300 p-3 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => router.push(`/orders/${orderId}`)}
            className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-amber-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100 shadow transition-all hover:bg-amber-900 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
