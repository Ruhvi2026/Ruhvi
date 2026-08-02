'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { ShieldCheck, Truck, CreditCard, Banknote, Gift, MapPin, Check, Plus, AlertCircle, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Address } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(true);

  // Fetch saved user addresses from Supabase when user is logged in
  useEffect(() => {
    if (user) {
      const fetchAddresses = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });

          if (!error && data && data.length > 0) {
            setAddresses(data as Address[]);
            const defaultAddr = data.find((a: any) => a.is_default) || data[0];
            setSelectedAddressId(defaultAddr.id);
            setShowNewAddressForm(false);
          } else {
            setAddresses([]);
            setShowNewAddressForm(true);
          }
        } catch (err) {
          console.error('Error loading saved addresses:', err);
          setShowNewAddressForm(true);
        }
      };
      fetchAddresses();
    } else {
      setAddresses([]);
      setShowNewAddressForm(true);
    }
  }, [user]);

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
  const [paymentMethod, setPaymentMethod] = useState<'phonepe' | 'cod'>('phonepe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Bot Protection State
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Money Features State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [useWallet, setUseWallet] = useState(false);

  const walletBalance = Number(profile?.wallet_balance) || 0;
  const coinsBalance = Number(profile?.reward_coins) || 0; // 10 coins = ₹1
  const maxCoinsRedeemableValue = Math.floor(coinsBalance / 10);

  // Shipping & Cost calculations
  const FREE_SHIPPING_THRESHOLD = 500;
  const shippingCharge = subtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0 ? 0 : 49;
  
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
  const preWalletTotal = Math.max(0, subtotalAfterCoupon - coinsDiscount) + shippingCharge + codCharge;

  // Wallet Math
  let walletDiscount = 0;
  if (useWallet) {
    walletDiscount = Math.min(walletBalance, preWalletTotal);
  }

  const totalPayable = Math.max(0, preWalletTotal - walletDiscount);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0];

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'WELCOME10') {
      const discount = Math.min(subtotal * 0.1, 500); // 10% off up to ₹500
      setAppliedCoupon({ code: 'WELCOME10', discount });
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid or expired coupon code.');
      setAppliedCoupon(null);
    }
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.full_name || !newAddress.phone || !newAddress.line1 || !newAddress.city || !newAddress.pincode) {
      alert('Please fill in all required address fields.');
      return;
    }

    const created: Address = {
      id: `addr-${Date.now()}`,
      user_id: user?.id || 'guest',
      ...newAddress,
      is_default: addresses.length === 0,
    };

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
      setErrorMessage('Please select or add a shipping address.');
      return;
    }

    if (paymentMethod === 'cod' && !user) {
      setErrorMessage('Cash on Delivery (COD) is available only for logged-in accounts. Please log in or select an online payment method.');
      return;
    }

    if (paymentMethod === 'cod' && !turnstileToken) {
      setErrorMessage('Please complete the security check.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (paymentMethod === 'phonepe') {
        // 1. Initialize PhonePe payment on backend API
        const res = await fetch('/api/checkout/phonepe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPayable,
            mobileNumber: selectedAddress.phone,
          }),
        });

        const orderData = await res.json();
        if (!res.ok) {
          throw new Error(orderData.error || 'Failed to initialize PhonePe payment');
        }

        if (orderData.redirectUrl && !orderData.isSimulated) {
          // Redirect to PhonePe Secure Gateway URL
          window.location.href = orderData.redirectUrl;
          return;
        }

        // Test / Simulated payment fallback
        await finalizeOrder({
          phonepe_merchant_transaction_id: orderData.merchantTransactionId || `MT_${Date.now()}`,
          phonepe_transaction_id: `T_SIM_${Date.now()}`,
          phonepe_payment_state: 'COMPLETED',
        });
      } else {
        // COD order
        const verifyRes = await fetch('/api/checkout/verify-turnstile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: turnstileToken,
            phone: selectedAddress.phone 
          }),
        });
        
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error(verifyData.error || 'Security verification failed. Please try again.');
        }

        // --- TEMPORARILY DISABLED (Firebase Billing Issue) ---
        // if (!(window as any).recaptchaVerifier) {
        //   (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        //     size: 'invisible',
        //   });
        // }
        //
        // const formattedPhone = selectedAddress.phone.startsWith('+') ? selectedAddress.phone : `+91${selectedAddress.phone.replace(/\D/g, '').slice(-10)}`;
        // const confirmation = await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier);
        // 
        // setConfirmationResult(confirmation);
        // setShowOtpModal(true);
        // setIsProcessing(false);
        // ---------------------------------------------------

        // Bypass OTP for now and place the order directly
        await finalizeOrder();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
      setIsProcessing(false);
      if (paymentMethod === 'cod') {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6 || !confirmationResult) return;
    setIsVerifyingOtp(true);
    setErrorMessage('');

    try {
      await confirmationResult.confirm(otpCode);
      setShowOtpModal(false);
      // OTP verified, now create the order
      await finalizeOrder();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Invalid OTP. Please check the code and try again.');
      setIsVerifyingOtp(false);
    }
  };

  const finalizeOrder = async (phonepeDetails?: any) => {
    try {
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
          ...phonepeDetails,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Store created order in localStorage for orders history demo view
      const existingOrders = JSON.parse(localStorage.getItem('ruhvi_orders_v1') || '[]');
      localStorage.setItem('ruhvi_orders_v1', JSON.stringify([data.order, ...existingOrders]));

      clearCart();
      router.push(`/order-success/${data.orderId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save order.');
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Your Cart is Empty</h2>
        <p className="text-xs text-stone-500">Please add items to your cart before proceeding to checkout.</p>
        <button
          onClick={() => router.push('/products')}
          className="px-6 py-2.5 bg-amber-950 text-amber-100 text-xs font-bold uppercase tracking-wider rounded-lg"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center space-x-3 border-b border-stone-200 pb-6 mb-8">
          <button
            onClick={() => router.push('/cart')}
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif text-3xl font-bold text-stone-900">Checkout</h1>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            {!user && (errorMessage.includes('logged-in') || errorMessage.includes('Log-in')) && (
              <Link
                href="/login?redirectTo=/checkout"
                className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-50 text-xs font-bold rounded-lg transition-colors shrink-0 ml-3 shadow-sm"
              >
                Log In Now
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Checkout Steps */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Shipping Address */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-stone-900 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-amber-800" />
                  <span>1. Delivery Address</span>
                </h3>
                <button
                  onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                  className="text-xs text-amber-800 hover:underline flex items-center space-x-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Saved Addresses List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-stone-200 rounded text-stone-800">
                        {addr.label}
                      </span>
                      {selectedAddressId === addr.id && (
                        <Check className="w-4 h-4 text-amber-900 font-bold" />
                      )}
                    </div>
                    <div className="font-semibold text-xs text-stone-900">{addr.full_name}</div>
                    <div className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                      {addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}
                      {addr.city}, {addr.state} - {addr.pincode}
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono mt-2">{addr.phone}</div>
                  </div>
                ))}
              </div>

              {/* Add New Address Form Modal/Dropdown */}
              {showNewAddressForm && (
                <form onSubmit={handleAddAddress} className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-stone-800">Add Delivery Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      required
                      value={newAddress.full_name}
                      onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Address Line 1 *"
                      required
                      value={newAddress.line1}
                      onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Address Line 2 (Optional)"
                      value={newAddress.line2}
                      onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="City *"
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="State *"
                      required
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Pincode *"
                      required
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                      className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
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
                      className="px-4 py-1.5 bg-amber-950 text-white text-xs font-semibold rounded-lg hover:bg-amber-900"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Step 2: Gift Wrap & Personalized Notes */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-4">
                <Gift className="w-4 h-4 text-amber-800" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-stone-900">
                  2. Gift Packaging & Message
                </h3>
              </div>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftWrap}
                  onChange={(e) => setGiftWrap(e.target.checked)}
                  className="w-4 h-4 accent-amber-900 rounded"
                />
                <span className="text-xs font-semibold text-stone-800">
                  Add Signature Ruhvi Velvet Box Gift Wrap & Personalized Greeting Card
                </span>
              </label>

              {giftWrap && (
                <div className="pt-2">
                  <textarea
                    rows={3}
                    placeholder="Enter your personalized gift message for the recipient..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="w-full p-3 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-stone-100 pb-4">
                <CreditCard className="w-4 h-4 text-amber-800" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-stone-900">
                  3. Select Payment Method
                </h3>
              </div>

              <div className="space-y-3">
                {/* Wallet Option */}
                {walletBalance > 0 && (
                  <label className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    useWallet
                      ? 'border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5.3 7.7 2 2 0 0 1-2.7-2.7H5a2 2 0 0 1-2-2V9"/><path d="M22 12v3h-3a2 2 0 0 1 0-4h3z"/></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-stone-900">
                          Pay with Ruhvi Wallet (Balance: ₹{walletBalance.toFixed(2)})
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          Get 5% guaranteed cashback when you use your wallet!
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => {
                        setUseWallet(e.target.checked);
                        if (e.target.checked && walletBalance >= preWalletTotal) {
                          // If wallet covers the entire cost, COD cannot be selected (or is redundant)
                          if (paymentMethod === 'cod') setPaymentMethod('phonepe');
                        }
                      }}
                      className="w-4 h-4 accent-emerald-700 rounded"
                    />
                  </label>
                )}

                {/* PhonePe Option */}
                <div
                  onClick={() => setPaymentMethod('phonepe')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethod === 'phonepe'
                      ? 'border-purple-900 bg-purple-950/5 ring-1 ring-purple-900'
                      : 'border-stone-200 hover:border-stone-300'
                  } ${useWallet && walletBalance >= preWalletTotal ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center shrink-0 font-serif font-bold text-base">
                      ₱
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-stone-900 flex items-center gap-1.5">
                        <span>PhonePe Payment Gateway</span>
                        <span className="bg-purple-100 text-purple-900 text-[9px] font-bold px-1.5 py-0.5 rounded">UPI / Cards / Wallet</span>
                      </div>
                      <div className="text-[10px] text-stone-500">
                        Pay via PhonePe, GPay, Paytm, UPI Apps, Credit/Debit Cards & NetBanking
                      </div>
                    </div>
                  </div>
                  {paymentMethod === 'phonepe' && <Check className="w-4 h-4 text-purple-900 font-bold" />}
                </div>

                {/* COD Option */}
                <div
                  onClick={() => {
                    if (!user) {
                      setErrorMessage('Cash on Delivery (COD) is available only for logged-in accounts. Please log in to your account or pay online.');
                      return;
                    }
                    setPaymentMethod('cod');
                  }}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                    !user
                      ? 'border-stone-200 bg-stone-50/80 opacity-80'
                      : paymentMethod === 'cod'
                      ? 'border-amber-900 bg-amber-950/5 ring-1 ring-amber-900 cursor-pointer'
                      : 'border-stone-200 hover:border-stone-300 cursor-pointer'
                  } ${useWallet && walletBalance >= preWalletTotal ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!user ? 'bg-stone-200 text-stone-500' : 'bg-amber-100 text-amber-900'}`}>
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-stone-900 flex items-center gap-1.5 flex-wrap">
                        <span>Cash on Delivery (COD)</span>
                        {!user && (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Log-in Required
                            </span>
                            <Link
                              href="/login?redirectTo=/checkout"
                              onClick={(e) => e.stopPropagation()}
                              className="bg-amber-950 hover:bg-amber-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded transition-colors shadow-sm inline-flex items-center"
                            >
                              Log In
                            </Link>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {!user
                          ? 'Available for logged-in users only. Please log in or choose online payment.'
                          : 'Pay cash upon delivery (+ ₹49 COD processing charge)'}
                      </div>
                    </div>
                  </div>
                  {paymentMethod === 'cod' && user && <Check className="w-4 h-4 text-amber-900 font-bold" />}
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 sticky top-24">
              <h3 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-4">
                Order Breakdown
              </h3>

              {/* Items list preview */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 text-xs">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-stone-700">
                    <div className="line-clamp-1 flex-1 pr-2">
                      <span className="font-semibold">{item.quantity}x</span> {item.product?.name}
                    </div>
                    <div className="font-bold text-stone-900 flex-shrink-0">
                      ₹{((item.product?.price || item.price_at_add) * item.quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-stone-100 pt-4 text-xs sm:text-sm">
                {/* Coupon Input */}
                <form onSubmit={handleApplyCoupon} className="flex items-center space-x-2 pb-2">
                  <input
                    type="text"
                    placeholder="Got a Promo Code?"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={!!appliedCoupon}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs disabled:bg-stone-50"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                      className="px-3 py-2 bg-stone-100 text-stone-600 font-bold text-xs rounded-lg hover:bg-stone-200"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!couponCode}
                      className="px-3 py-2 bg-stone-900 text-white font-bold text-xs rounded-lg hover:bg-stone-800 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  )}
                </form>

                {/* Coins Toggle */}
                {coinsBalance > 0 && subtotalAfterCoupon >= 250 && (
                  <label className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200 cursor-pointer mb-2">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                      <span className="text-xs font-semibold text-yellow-800">
                        Use {coinsDiscount * 10} Reward Coins (-₹{coinsDiscount})
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => setUseCoins(e.target.checked)}
                      className="w-4 h-4 accent-yellow-600 rounded"
                    />
                  </label>
                )}
                {coinsBalance > 0 && subtotalAfterCoupon < 250 && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 mb-2">
                    <p className="text-[10px] text-stone-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" className="mr-1 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                      Add ₹{(250 - subtotalAfterCoupon).toFixed(2)} more to use your {coinsBalance} reward coins.
                    </p>
                  </div>
                )}

                <div className="flex justify-between text-stone-600 border-t border-stone-100 pt-3">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span className="font-semibold">-₹{couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {useCoins && coinsDiscount > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Reward Coins Redeemed</span>
                    <span className="font-semibold">-₹{coinsDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600">
                  <span>Shipping Fee</span>
                  <span>
                    {shippingCharge === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                        FREE
                      </span>
                    ) : (
                      `₹${shippingCharge}`
                    )}
                  </span>
                </div>

                {paymentMethod === 'cod' && (!useWallet || walletBalance < preWalletTotal) && (
                  <div className="flex justify-between text-stone-600">
                    <span>COD Processing Fee</span>
                    <span className="font-semibold text-amber-900">₹49</span>
                  </div>
                )}
                
                {useWallet && walletDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Paid from Wallet</span>
                    <span className="font-semibold">-₹{walletDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="border-t border-stone-200 pt-4 flex justify-between items-baseline">
                  <span className="font-serif font-bold text-base text-stone-900">
                    Total Payable
                  </span>
                  <span className="font-serif font-bold text-xl text-amber-950">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {paymentMethod === 'cod' && (
                <div className="flex justify-center mb-4 min-h-[65px]">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                      setErrorMessage('');
                    }}
                    onError={() => setErrorMessage('Security check failed. Please refresh.')}
                    onExpire={() => {
                      setTurnstileToken(null);
                      turnstileRef.current?.reset();
                    }}
                    options={{
                      theme: 'light',
                    }}
                  />
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full py-4 bg-amber-950 hover:bg-amber-900 text-amber-100 font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {isProcessing ? 'Processing Order...' : paymentMethod === 'phonepe' ? 'Pay via PhonePe' : 'Place COD Order'}
              </button>

              <div className="text-center text-[10px] text-stone-400 space-y-1">
                <ShieldCheck className="w-4 h-4 mx-auto text-amber-800 mb-1" />
                <p>100% Safe & Secure Checkout</p>
                <p>Insured Shipping across India</p>
              </div>

              <div id="recaptcha-container"></div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">Verify Your Phone Number</h3>
            <p className="text-xs text-stone-600 mb-6">
              We've sent a 6-digit verification code to <span className="font-bold">{selectedAddress?.phone}</span>. Please enter it below to confirm your Cash on Delivery order.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono font-bold text-lg border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
            />

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setErrorMessage('');
                }}
                className="flex-1 py-3 text-stone-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-stone-100 transition-colors"
                disabled={isVerifyingOtp}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="flex-1 py-3 bg-amber-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-amber-900 transition-colors disabled:opacity-50"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
