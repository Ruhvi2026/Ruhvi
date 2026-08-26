'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Gift,
  MapPin,
  Check,
  Plus,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Address } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { auth } from '@/lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { ecommerceEvent } from '@/lib/gtag';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, profile, loading: authLoading } = useAuth();

  const isLoggedIn = Boolean(user || profile);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(true);

  const [needsMobileVerification, setNeedsMobileVerification] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  // Fetch saved user addresses from Supabase when user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      const fetchAddressesAndProfile = async () => {
        try {
          const supabase = createClient();
          const userIdFilter = [
            user?.id,
            profile?.id,
            auth?.currentUser?.uid,
          ].filter(Boolean);

          if (userIdFilter.length > 0) {
            // Fetch addresses
            const { data, error } = await supabase
              .from('addresses')
              .select('*')
              .in('user_id', userIdFilter)
              .order('is_default', { ascending: false });

            if (!error && data && data.length > 0) {
              setAddresses(data as Address[]);
              const defaultAddr =
                data.find((a: any) => a.is_default) || data[0];
              setSelectedAddressId(defaultAddr.id);
              setShowNewAddressForm(false);
            } else {
              setAddresses([]);
              setShowNewAddressForm(true);
            }

            // Fetch profile verification status
            const { data: profileData } = await supabase
              .from('users')
              .select('phone_verified, email_verified, email')
              .in('id', userIdFilter)
              .single();

            if (profileData) {
              setNeedsMobileVerification(!profileData.phone_verified);
              setNeedsEmailVerification(
                !!(profileData.email && !profileData.email_verified)
              );
            }
          }
        } catch (err) {
          console.error('Error loading saved addresses or profile:', err);
          setShowNewAddressForm(true);
        }
      };
      fetchAddressesAndProfile();
    } else {
      setAddresses([]);
      setShowNewAddressForm(true);
      setNeedsMobileVerification(false);
      setNeedsEmailVerification(false);
    }
  }, [isLoggedIn, user, profile]);

  // GA4 begin_checkout event
  useEffect(() => {
    if (items.length > 0) {
      ecommerceEvent('begin_checkout', {
        currency: 'INR',
        value: subtotal,
        items: items.map((item) => ({
          item_id: item.product_id,
          item_name: item.product?.name,
          price: item.product?.price || item.price_at_add,
          quantity: item.quantity,
        })),
      });
    }
  }, [items, subtotal]);

  // Surface payment outcome when redirected back from the PhonePe gateway
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'failed') {
      toast.error(
        'Payment failed. Please try again or choose a different payment method.'
      );
    } else if (payment === 'pending') {
      toast.error('Payment was not completed. Please try again.');
    }
    if (payment) {
      window.history.replaceState({}, '', window.location.pathname);
      // Reconcile checkout state after a gateway return: clear the pending
      // order key on success; keep it on failure/pending so a retry reuses the
      // same pending order instead of creating a duplicate.
      if (payment === 'success') {
        window.localStorage.removeItem('checkout_order_id');
      }
    }
  }, []);

  // New Address Form State
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Gift Options State
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'phonepe' | 'cod'>(
    'phonepe'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const parent = e.currentTarget.parentElement;
    if (!parent) return;
    const radios = Array.from(
      parent.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]:not([disabled])'
      )
    );
    const currentIdx = radios.indexOf(e.currentTarget);
    let nextIdx: number | null = null;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        nextIdx = currentIdx > 0 ? currentIdx - 1 : radios.length - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        nextIdx = currentIdx < radios.length - 1 ? currentIdx + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        nextIdx = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIdx = radios.length - 1;
        break;
    }
    if (nextIdx !== null && radios[nextIdx]) {
      const nextRadio = radios[nextIdx];
      nextRadio.focus();
      nextRadio.click();
    }
  };

  // Bot Protection State
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // OTP modal refs for dialog semantics & focus management
  const otpModalRef = useRef<HTMLDivElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Prevents the order-create path from running twice for the same cart session
  const orderCreateInFlight = useRef(false);

  // OTP Modal: dialog semantics, ESC to close, and a basic focus trap
  useEffect(() => {
    if (!showOtpModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOtpModal(false);
        setOtpCode('');
        return;
      }
      if (e.key === 'Tab') {
        const modal = otpModalRef.current;
        if (!modal) return;
        const focusables = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(
      () => otpInputRef.current?.focus(),
      50
    );

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [showOtpModal]);

  // Money Features State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [useCoins, setUseCoins] = useState(false);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('coupons')
          .select('*')
          .eq('is_active', true);
        if (data) {
          setAvailableCoupons(data);
        }
      } catch (err) {
        console.error('Failed to load coupons:', err);
      }
    };
    fetchCoupons();
  }, []);

  const walletBalance = Number(profile?.wallet_balance) || 0;
  const coinsBalance = Number(profile?.reward_coins) || 0; // 10 coins = ₹1
  const maxCoinsRedeemableValue = Math.floor(coinsBalance / 10);

  // Shipping & Cost calculations
  const FREE_SHIPPING_THRESHOLD = 500;
  const shippingCharge =
    subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : 49;

  // Coupon Math
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;

  // Coins Math (min order ₹250 after coupon to use coins)
  const subtotalAfterCoupon = Math.max(0, subtotal - couponDiscount);
  let coinsDiscount = 0;
  if (useCoins && subtotalAfterCoupon >= 250) {
    // You can only redeem coins up to the remaining subtotal (excluding shipping)
    coinsDiscount = Math.min(maxCoinsRedeemableValue, subtotalAfterCoupon);
  }

  // Pre-Wallet Total
  const codCharge = paymentMethod === 'cod' ? 49 : 0;
  const preWalletTotal =
    Math.max(0, subtotalAfterCoupon - coinsDiscount) +
    shippingCharge +
    codCharge;

  // Wallet Math
  let walletDiscount = 0;
  if (useWallet) {
    walletDiscount = Math.min(walletBalance, preWalletTotal);
  }

  const totalPayable = Math.max(0, preWalletTotal - walletDiscount);

  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) || addresses[0];

  const applyCouponCode = async (code: string) => {
    setCouponCode(code);
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal,
          userEmail: user?.email || profile?.email,
          userPhone: (user as any)?.phoneNumber || profile?.phone,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setAppliedCoupon({
          code: code.toUpperCase(),
          discount: data.discount,
        });
        toast.success('Coupon applied successfully!');
      } else {
        toast.error(data.error || 'Invalid or expired coupon code.');
        setAppliedCoupon(null);
      }
    } catch (err) {
      toast.error('Failed to validate coupon.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    await applyCouponCode(couponCode);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newAddress.full_name ||
      !newAddress.phone ||
      !newAddress.line1 ||
      !newAddress.city ||
      !newAddress.pincode
    ) {
      alert('Please fill in all required address fields.');
      return;
    }

    const userId = user?.id || profile?.id || auth?.currentUser?.uid;
    const addressData = {
      ...newAddress,
      is_default: addresses.length === 0,
    };

    let created: Address;

    // Persist to the address book when authenticated (non-blocking on failure)
    if (isLoggedIn && userId) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('addresses')
          .insert({ user_id: userId, ...addressData })
          .select('*')
          .single();

        if (error) {
          console.error('Error saving address to Supabase:', error);
          created = {
            id: `addr-${Date.now()}`,
            user_id: userId,
            ...addressData,
          };
        } else {
          created = data as Address;
        }
      } catch (err) {
        console.error('Error saving address to Supabase:', err);
        created = {
          id: `addr-${Date.now()}`,
          user_id: userId,
          ...addressData,
        };
      }
    } else {
      created = {
        id: `addr-${Date.now()}`,
        user_id: userId || 'guest',
        ...addressData,
      };
    }

    setAddresses((prev) => [...prev, created]);
    setSelectedAddressId(created.id);
    setShowNewAddressForm(false);
    setNewAddress({
      label: 'Home',
      full_name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select or add a shipping address.');
      return;
    }

    if (paymentMethod === 'cod' && !isLoggedIn) {
      toast.error('Login is required to place a Cash on Delivery order.');
      return;
    }

    if (paymentMethod === 'cod' && !turnstileToken) {
      toast.error('Please complete the security check.');
      return;
    }

    // Idempotency guard: never run the order-create path twice for the same
    // cart session (prevents duplicate orders from double-submits).
    if (orderCreateInFlight.current) {
      toast.error('Your order is already being processed. Please wait.');
      return;
    }
    orderCreateInFlight.current = true;

    // Reuse a pending order id from a previous gateway attempt so a redirect
    // back + retry does not create a duplicate order for the same cart session.
    let pendingOrderId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('checkout_order_id')
        : null;
    if (!pendingOrderId && typeof window !== 'undefined') {
      pendingOrderId = `chk_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      window.localStorage.setItem('checkout_order_id', pendingOrderId);
    }

    setIsProcessing(true);

    // GA4 add_shipping_info & add_payment_info events
    const checkoutItems = items.map((item) => ({
      item_id: item.product_id,
      item_name: item.product?.name,
      price: item.product?.price || item.price_at_add,
      quantity: item.quantity,
    }));

    ecommerceEvent('add_shipping_info', {
      currency: 'INR',
      value: subtotal,
      shipping_tier: shippingCharge === 0 ? 'Free' : 'Standard',
      items: checkoutItems,
    });

    ecommerceEvent('add_payment_info', {
      currency: 'INR',
      value: totalPayable,
      payment_type: paymentMethod,
      items: checkoutItems,
    });

    try {
      if (
        paymentMethod === 'phonepe' ||
        (paymentMethod === 'cod' && totalPayable > 2000)
      ) {
        const isPartialCod = paymentMethod === 'cod';
        const phonePeAmount = isPartialCod ? totalPayable * 0.1 : totalPayable;

        // 1. Initialize PhonePe payment on backend API
        const res = await fetch('/api/checkout/phonepe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: phonePeAmount,
            mobileNumber: selectedAddress.phone,
            items,
            address: selectedAddress,
            paymentMethod,
            giftWrap,
            giftMessage,
            subtotal,
            shippingCharge,
            codCharge,
            total: totalPayable,
            wallet_used: walletDiscount,
            coins_redeemed: coinsDiscount,
            coupon_discount: couponDiscount,
            isPartialCod,
            prepaidAmount: isPartialCod ? phonePeAmount : undefined,
            idempotencyKey: pendingOrderId,
          }),
        });

        const orderData = await res.json();
        if (!res.ok) {
          throw new Error(
            orderData.error || 'Failed to initialize PhonePe payment'
          );
        }

        // Persist the created order id so a gateway return can't create a duplicate
        const createdOrderId = orderData.orderId || orderData.order?.id || null;
        if (createdOrderId && typeof window !== 'undefined') {
          window.localStorage.setItem('checkout_order_id', createdOrderId);
        }

        if (orderData.redirectUrl && !orderData.isSimulated) {
          // Redirect to PhonePe Secure Gateway URL
          window.location.href = orderData.redirectUrl;
          return;
        }

        // Test / Simulated payment fallback
        await finalizeOrder({
          phonepe_merchant_transaction_id:
            orderData.merchantTransactionId || `MT_${Date.now()}`,
          phonepe_transaction_id: `T_SIM_${Date.now()}`,
          phonepe_payment_state: 'COMPLETED',
          isPartialCod,
          prepaidAmount: isPartialCod ? phonePeAmount : undefined,
        });
      } else {
        // COD order
        const verifyRes = await fetch('/api/checkout/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: turnstileToken,
            phone: selectedAddress.phone,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error(
            verifyData.error ||
              'Security verification failed. Please try again.'
          );
        }

        // Initialize Firebase reCAPTCHA
        if (!(window as any).recaptchaVerifier) {
          const recaptchaContainer = document.getElementById(
            'recaptcha-container'
          );
          if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '<div id="recaptcha-anchor"></div>';
          }
          (window as any).recaptchaVerifier = new RecaptchaVerifier(
            auth,
            'recaptcha-anchor',
            {
              size: 'invisible',
            }
          );
        }

        // Send OTP
        const formattedPhone = selectedAddress.phone.startsWith('+')
          ? selectedAddress.phone
          : `+91${selectedAddress.phone.replace(/\D/g, '').slice(-10)}`;
        const confirmation = await signInWithPhoneNumber(
          auth,
          formattedPhone,
          (window as any).recaptchaVerifier
        );

        setConfirmationResult(confirmation);
        setShowOtpModal(true);
        setIsProcessing(false);
        orderCreateInFlight.current = false;
      }
    } catch (err: any) {
      console.error('COD payment / OTP error:', err);
      toast.error(
        err.message || 'Payment processing failed. Please try again.'
      );
      setIsProcessing(false);
      orderCreateInFlight.current = false;
      if (paymentMethod === 'cod') {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6 || !confirmationResult) return;
    setIsVerifyingOtp(true);
    try {
      await confirmationResult.confirm(otpCode);
      setShowOtpModal(false);
      // OTP verified, now create the order
      await finalizeOrder();
    } catch (err: any) {
      console.error(err);
      toast.error('Invalid OTP. Please check the code and try again.');
      setIsVerifyingOtp(false);
    }
  };

  const finalizeOrder = async (phonepeDetails?: any) => {
    try {
      const orderIdempotencyKey =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('checkout_order_id')
          : null;

      const response = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          address: selectedAddress,
          paymentMethod,
          giftWrap,
          giftMessage,
          subtotal,
          shippingCharge,
          codCharge,
          wallet_used: walletDiscount,
          coins_redeemed: coinsDiscount,
          coupon_discount: couponDiscount,
          total: totalPayable,
          ...(orderIdempotencyKey
            ? { idempotencyKey: orderIdempotencyKey }
            : {}),
          ...phonepeDetails,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Order placed successfully; clear the idempotency key
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('checkout_order_id');
      }

      // Store created order in localStorage for orders history demo view
      const existingOrders = JSON.parse(
        localStorage.getItem('ruhvi_orders_v1') || '[]'
      );
      localStorage.setItem(
        'ruhvi_orders_v1',
        JSON.stringify([data.order, ...existingOrders])
      );

      clearCart();
      router.push(`/order-success/${data.order?.id || data.orderId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save order.');
      setIsProcessing(false);
      orderCreateInFlight.current = false;
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          Your Cart is Empty
        </h2>
        <p className="text-xs text-stone-500">
          Please add items to your cart before proceeding to checkout.
        </p>
        <button
          onClick={() => router.push('/products')}
          className="rounded-lg bg-amber-950 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-100"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:px-8 lg:pb-10">
        <div className="mb-8 flex items-center space-x-3 border-b border-stone-200 pb-6">
          <button
            onClick={() => router.push('/cart')}
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Checkout
          </h1>
        </div>

        {/* Checkout Progress Indicator */}
        <div className="mb-8" role="list" aria-label="Checkout progress steps">
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-4 w-4" />
              </div>
              <span className="mt-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                Cart
              </span>
            </div>
            <div className="mx-2 mb-5 h-0.5 flex-1 rounded bg-emerald-600" />
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-900 bg-amber-950 text-white">
                <span className="text-xs font-bold">2</span>
              </div>
              <span className="mt-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                Details &amp; Address
              </span>
            </div>
            <div className="mx-2 mb-5 h-0.5 flex-1 rounded bg-stone-200" />
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-stone-300 bg-white text-stone-400">
                <span className="text-xs font-bold">3</span>
              </div>
              <span className="mt-1.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                Payment &amp; Review
              </span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs font-medium text-stone-500">
            Step <span className="font-bold text-stone-700">2</span> of 3
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Checkout Steps */}
          <div className="space-y-8 lg:col-span-2">
            {/* Step 1: Shipping Address */}
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <h3 className="flex items-center space-x-2 text-sm font-semibold uppercase tracking-wider text-stone-900">
                  <MapPin className="h-4 w-4 text-amber-800" />
                  <span>1. Delivery Address</span>
                </h3>
                <button
                  onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                  className="flex items-center space-x-1 text-xs font-semibold text-amber-800 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Saved Addresses List */}
              <div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Saved delivery addresses"
              >
                {addresses.map((addr) => {
                  const isAddressSelected = selectedAddressId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      role="radio"
                      aria-checked={isAddressSelected}
                      tabIndex={isAddressSelected ? 0 : -1}
                      onClick={() => setSelectedAddressId(addr.id)}
                      onKeyDown={(e) => {
                        const radios = Array.from(
                          (
                            e.currentTarget.parentNode as HTMLElement
                          ).querySelectorAll<HTMLElement>('[role="radio"]')
                        );
                        const currentIdx = radios.indexOf(e.currentTarget);
                        let nextIdx: number | null = null;
                        switch (e.key) {
                          case 'ArrowUp':
                          case 'ArrowLeft':
                            e.preventDefault();
                            nextIdx =
                              currentIdx > 0
                                ? currentIdx - 1
                                : radios.length - 1;
                            break;
                          case 'ArrowDown':
                          case 'ArrowRight':
                            e.preventDefault();
                            nextIdx =
                              currentIdx < radios.length - 1
                                ? currentIdx + 1
                                : 0;
                            break;
                          case 'Home':
                            e.preventDefault();
                            nextIdx = 0;
                            break;
                          case 'End':
                            e.preventDefault();
                            nextIdx = radios.length - 1;
                            break;
                        }
                        if (nextIdx !== null) {
                          const nextRadio = radios[nextIdx];
                          nextRadio.focus();
                          nextRadio.click();
                        }
                      }}
                      className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
                        isAddressSelected
                          ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900'
                          : 'border-stone-200 bg-stone-50/50 hover:border-stone-300'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <span className="rounded bg-stone-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-stone-800">
                          {addr.label}
                        </span>
                        {isAddressSelected && (
                          <Check className="h-4 w-4 font-bold text-amber-900" />
                        )}
                      </div>
                      <div className="text-xs font-semibold text-stone-900">
                        {addr.full_name}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-stone-600">
                        {addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}
                        {addr.city}, {addr.state} - {addr.pincode}
                      </div>
                      <div className="mt-2 font-mono text-xs text-stone-400">
                        {addr.phone}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add New Address Form Modal/Dropdown */}
              {showNewAddressForm && (
                <form
                  onSubmit={handleAddAddress}
                  className="mt-4 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <h4 className="text-xs font-bold uppercase text-stone-800">
                    Add Delivery Address
                  </h4>
                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="checkout-full-name"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="checkout-full-name"
                        autoComplete="name"
                        required
                        value={newAddress.full_name}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            full_name: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-phone"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="checkout-phone"
                        autoComplete="tel"
                        required
                        value={newAddress.phone}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            phone: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="checkout-address-line1"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        id="checkout-address-line1"
                        autoComplete="address-line1"
                        required
                        value={newAddress.line1}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            line1: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="checkout-address-line2"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        id="checkout-address-line2"
                        autoComplete="address-line2"
                        value={newAddress.line2}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            line2: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-city"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        City *
                      </label>
                      <input
                        type="text"
                        id="checkout-city"
                        autoComplete="address-level2"
                        required
                        value={newAddress.city}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, city: e.target.value })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-state"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        State *
                      </label>
                      <input
                        type="text"
                        id="checkout-state"
                        autoComplete="address-level1"
                        required
                        value={newAddress.state}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            state: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-pincode"
                        className="mb-1 block font-semibold text-stone-700"
                      >
                        Pincode *
                      </label>
                      <input
                        type="text"
                        id="checkout-pincode"
                        autoComplete="postal-code"
                        required
                        value={newAddress.pincode}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            pincode: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-amber-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Step 2: Gift Wrap & Personalized Notes */}
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-4">
                <Gift className="h-4 w-4 text-amber-800" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900">
                  2. Gift Packaging & Message
                </h3>
              </div>

              <label className="flex cursor-pointer items-center space-x-3">
                <input
                  type="checkbox"
                  checked={giftWrap}
                  onChange={(e) => setGiftWrap(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-900"
                />
                <span className="text-xs font-semibold text-stone-800">
                  Add Signature Ruhvi Velvet Box Gift Wrap & Personalized
                  Greeting Card
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  FREE
                </span>
              </label>

              {giftWrap && (
                <div className="pt-2">
                  <label
                    htmlFor="checkout-gift-message"
                    className="mb-1 block text-xs font-semibold text-stone-800"
                  >
                    Personalized Gift Message
                  </label>
                  <textarea
                    id="checkout-gift-message"
                    rows={3}
                    placeholder="Enter your personalized gift message for the recipient..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Step 2.5: Identity Verification */}
            {(needsMobileVerification || needsEmailVerification) && (
              <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
                <div className="flex items-center space-x-2 border-b border-rose-100 pb-4">
                  <AlertCircle className="h-4 w-4 text-rose-700" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-900">
                    Action Required: Verify Identity
                  </h3>
                </div>
                <p className="text-xs text-rose-800">
                  For your security, please verify your{' '}
                  {needsMobileVerification ? 'mobile number' : ''}
                  {needsMobileVerification && needsEmailVerification
                    ? ' and '
                    : ''}
                  {needsEmailVerification ? 'email address' : ''} to continue
                  with your checkout.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/account/settings')}
                    className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-800"
                  >
                    Verify Now
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment Method */}
            <div
              className={`space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm ${needsMobileVerification || needsEmailVerification ? 'pointer-events-none opacity-50' : ''}`}
            >
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-4">
                <CreditCard className="h-4 w-4 text-amber-800" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-900">
                  3. Select Payment Method
                </h3>
              </div>

              <div
                className="space-y-3"
                role="radiogroup"
                aria-label="Payment method"
              >
                {/* Wallet Option */}
                {walletBalance > 0 && (
                  <label
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                      useWallet
                        ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5.3 7.7 2 2 0 0 1-2.7-2.7H5a2 2 0 0 1-2-2V9" />
                          <path d="M22 12v3h-3a2 2 0 0 1 0-4h3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-stone-900">
                          Pay with Ruhvi Wallet (Balance: ₹
                          {walletBalance.toFixed(2)})
                        </div>
                        <div className="mt-0.5 text-xs font-semibold text-emerald-700">
                          Get 5% guaranteed cashback when you use your wallet!
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => {
                        setUseWallet(e.target.checked);
                        if (
                          e.target.checked &&
                          walletBalance >= preWalletTotal
                        ) {
                          // If wallet covers the entire cost, COD cannot be selected (or is redundant)
                          if (paymentMethod === 'cod')
                            setPaymentMethod('phonepe');
                        }
                      }}
                      className="h-4 w-4 rounded accent-emerald-700"
                    />
                  </label>
                )}

                {/* PhonePe Option */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'phonepe'}
                  tabIndex={paymentMethod === 'phonepe' ? 0 : -1}
                  onClick={() => setPaymentMethod('phonepe')}
                  onKeyDown={handlePaymentKeyDown}
                  disabled={useWallet && walletBalance >= preWalletTotal}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    paymentMethod === 'phonepe'
                      ? 'border-gold-700 bg-gold-50 ring-1 ring-gold-700'
                      : 'border-stone-200 hover:border-stone-300'
                  } disabled:pointer-events-none disabled:opacity-50`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 font-serif text-base font-bold text-gold-800">
                      Pe
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                        <span>PhonePe Payment Gateway</span>
                        <span className="rounded border border-gold-300/60 bg-gold-100 px-1.5 py-0.5 text-xs font-bold text-gold-800">
                          UPI / Cards / Wallet
                        </span>
                      </div>
                      <div className="text-xs text-stone-500">
                        Pay via PhonePe, GPay, Paytm, UPI Apps, Credit/Debit
                        Cards & NetBanking
                      </div>
                    </div>
                  </div>
                  {paymentMethod === 'phonepe' && (
                    <Check className="h-4 w-4 font-bold text-gold-700" />
                  )}
                </button>

                {/* COD Option */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'cod'}
                  tabIndex={paymentMethod === 'cod' ? 0 : -1}
                  onClick={() => {
                    if (!isLoggedIn) {
                      toast.error(
                        'Login is required to place a Cash on Delivery order.'
                      );
                      return;
                    }
                    setPaymentMethod('cod');
                  }}
                  onKeyDown={handlePaymentKeyDown}
                  disabled={useWallet && walletBalance >= preWalletTotal}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                    !isLoggedIn
                      ? 'border-stone-200 bg-stone-50/80 opacity-80'
                      : paymentMethod === 'cod'
                        ? 'cursor-pointer border-amber-900 bg-amber-950/5 ring-1 ring-amber-900'
                        : 'cursor-pointer border-stone-200 hover:border-stone-300'
                  } disabled:pointer-events-none disabled:opacity-50`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${!isLoggedIn ? 'bg-stone-200 text-stone-500' : 'bg-amber-100 text-amber-900'}`}
                    >
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-stone-900">
                        <span>Cash on Delivery (COD)</span>
                        {!isLoggedIn && (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                              Log-in Required
                            </span>
                            <Link
                              href="/login?redirectTo=/checkout"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center rounded bg-amber-950 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-900"
                            >
                              Log In
                            </Link>
                          </div>
                        )}
                        {totalPayable > 2000 && isLoggedIn && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                            10% Deposit Required
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        {!isLoggedIn
                          ? 'Available for logged-in users only. Please log in or choose online payment.'
                          : totalPayable > 2000
                            ? `Pay ₹${(totalPayable * 0.1).toFixed(2)} upfront via online payment. The remaining balance (₹${(totalPayable * 0.9).toFixed(2)} + ₹49 COD processing charge) will be collected upon delivery.`
                            : 'Pay cash upon delivery (+ ₹49 COD processing charge)'}
                      </div>
                    </div>
                  </div>
                  {paymentMethod === 'cod' && isLoggedIn && (
                    <Check className="h-4 w-4 font-bold text-amber-900" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="border-b border-stone-100 pb-4 font-serif text-lg font-bold text-stone-900">
                Order Breakdown
              </h3>

              {/* Items list preview */}
              <div className="max-h-48 space-y-3 overflow-y-auto pr-1 text-xs">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-stone-700"
                  >
                    <div className="line-clamp-1 flex-1 pr-2">
                      <span className="font-semibold">{item.quantity}x</span>{' '}
                      {item.product?.name}
                    </div>
                    <div className="flex-shrink-0 font-bold text-stone-900">
                      ₹
                      {(
                        (item.product?.price || item.price_at_add) *
                        item.quantity
                      ).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-stone-100 pt-4 text-xs sm:text-sm">
                {/* Coupon Input */}
                <form
                  onSubmit={handleApplyCoupon}
                  className="flex items-center space-x-2 pb-2"
                >
                  <label htmlFor="checkout-coupon" className="sr-only">
                    Promo code
                  </label>
                  <input
                    id="checkout-coupon"
                    type="text"
                    placeholder="Got a Promo Code?"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={!!appliedCoupon}
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-50"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                      className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!couponCode || validatingCoupon}
                      className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-50"
                    >
                      {validatingCoupon ? 'Wait' : 'Apply'}
                    </button>
                  )}
                </form>

                {/* Available Coupons Option List */}
                {availableCoupons.length > 0 && !appliedCoupon && (
                  <div className="mt-2 space-y-2 border-b border-stone-100 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Available Coupons
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {availableCoupons.map((coupon) => (
                        <button
                          key={coupon.id}
                          type="button"
                          onClick={() => applyCouponCode(coupon.code)}
                          className="flex flex-col items-start rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-2.5 text-left transition hover:bg-amber-50"
                        >
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-amber-900">
                            {coupon.code}
                          </span>
                          <span className="mt-1 text-xs font-bold text-stone-800">
                            {coupon.title}
                          </span>
                          <span className="mt-0.5 text-xs leading-tight text-stone-500">
                            {coupon.description}
                          </span>
                          {coupon.min_order_value > 0 && (
                            <span className="mt-1 text-xs font-semibold text-amber-800">
                              Min Order: ₹{coupon.min_order_value}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coins Toggle */}
                {coinsBalance > 0 && subtotalAfterCoupon >= 250 && (
                  <label className="mb-2 flex cursor-pointer items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                    <div className="flex items-center space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-yellow-600"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                      </svg>
                      <span className="text-xs font-semibold text-yellow-800">
                        Use {coinsDiscount * 10} Reward Coins (-₹{coinsDiscount}
                        )
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => setUseCoins(e.target.checked)}
                      className="h-4 w-4 rounded accent-yellow-600"
                    />
                  </label>
                )}
                {coinsBalance > 0 && subtotalAfterCoupon < 250 && (
                  <div className="mb-2 rounded-xl border border-stone-100 bg-stone-50 p-3">
                    <p className="flex items-center text-xs text-stone-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        className="mr-1 text-yellow-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                      </svg>
                      Add ₹{(250 - subtotalAfterCoupon).toFixed(2)} more to use
                      your {coinsBalance} reward coins.
                    </p>
                  </div>
                )}

                <div className="flex justify-between border-t border-stone-100 pt-3 text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span className="font-semibold">
                      -₹{couponDiscount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {useCoins && coinsDiscount > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Reward Coins Redeemed</span>
                    <span className="font-semibold">
                      -₹{coinsDiscount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {giftWrap && (
                  <div className="flex justify-between text-stone-600">
                    <span>Gift Wrap &amp; Greeting Card</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      FREE
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600">
                  <span>Shipping Fee</span>
                  <span>
                    {shippingCharge === 0 ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        FREE
                      </span>
                    ) : (
                      `₹${shippingCharge}`
                    )}
                  </span>
                </div>

                {paymentMethod === 'cod' &&
                  (!useWallet || walletBalance < preWalletTotal) && (
                    <div className="flex justify-between text-stone-600">
                      <span>COD Processing Fee</span>
                      <span className="font-semibold text-amber-900">₹49</span>
                    </div>
                  )}

                {useWallet && walletDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Paid from Wallet</span>
                    <span className="font-semibold">
                      -₹{walletDiscount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between border-t border-stone-200 pt-4">
                  <span className="font-serif text-base font-bold text-stone-900">
                    Total Payable
                  </span>
                  <span className="font-serif text-xl font-bold text-amber-950">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {paymentMethod === 'cod' && (
                <div className="mb-4 flex min-h-[65px] justify-center">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                    }}
                    onError={() =>
                      toast.error('Security check failed. Please refresh.')
                    }
                    onExpire={() => {
                      setTurnstileToken(null);
                      turnstileRef.current?.reset();
                    }}
                    options={{
                      theme: 'auto',
                    }}
                  />
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full rounded-xl bg-amber-950 py-4 text-xs font-bold uppercase tracking-widest text-amber-100 shadow-lg transition-all hover:scale-[1.02] hover:bg-amber-900 disabled:opacity-50"
              >
                {isProcessing
                  ? 'Processing Order...'
                  : paymentMethod === 'phonepe'
                    ? 'Pay via PhonePe'
                    : paymentMethod === 'cod' && totalPayable > 2000
                      ? `Pay 10% Deposit (₹${(totalPayable * 0.1).toFixed(2)})`
                      : 'Place COD Order'}
              </button>

              <div className="space-y-2 text-center text-xs text-stone-400">
                <div className="flex items-center justify-center space-x-1.5">
                  <Truck className="h-4 w-4 text-amber-800" />
                  <p className="font-medium text-stone-500">
                    Arrives by{' '}
                    {new Date(
                      Date.now() + 5 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {''} — free insured shipping
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-800" />
                  <p>100% Safe & Secure Checkout</p>
                </div>
                <div className="flex items-center justify-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-800" />
                  <Link
                    href="/return-policy"
                    className="font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    7-Day Return Guarantee
                  </Link>
                </div>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <span className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    UPI
                  </span>
                  <span className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                    Visa
                  </span>
                  <span className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                    MC
                  </span>
                  <span className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                    GPay
                  </span>
                  <span className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                    NetBanking
                  </span>
                </div>
              </div>

              <div id="recaptcha-container"></div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            ref={otpModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="otp-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <h3
              id="otp-modal-title"
              className="mb-2 font-serif text-xl font-bold text-stone-900"
            >
              Verify Your Phone Number
            </h3>
            <p className="mb-6 text-xs text-stone-600">
              We've sent a 6-digit verification code to{' '}
              <span className="font-bold">{selectedAddress?.phone}</span>.
              Please enter it below to confirm your Cash on Delivery order.
            </p>

            <input
              ref={otpInputRef}
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="mb-4 w-full rounded-xl border border-stone-300 px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpCode('');
                }}
                className="flex-1 rounded-xl py-3 text-xs font-bold uppercase tracking-wider text-stone-600 transition-colors hover:bg-stone-100"
                disabled={isVerifyingOtp}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="flex-1 rounded-xl bg-amber-950 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-colors hover:bg-amber-900 disabled:opacity-50"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky checkout bar (hidden on desktop) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
        <div className="flex items-center justify-between space-x-3">
          <div className="shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Total Payable
            </div>
            <div className="font-serif text-lg font-bold text-amber-950">
              ₹{totalPayable.toLocaleString('en-IN')}
            </div>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing}
            className="flex-1 rounded-xl bg-amber-950 py-3 text-xs font-bold uppercase tracking-widest text-amber-100 shadow-lg transition-all hover:bg-amber-900 disabled:opacity-50"
          >
            {isProcessing
              ? 'Processing...'
              : paymentMethod === 'phonepe'
                ? 'Proceed to Pay'
                : 'Place Order'}
          </button>
        </div>
      </div>
    </>
  );
}
