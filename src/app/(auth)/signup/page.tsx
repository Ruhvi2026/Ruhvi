'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { auth } from '@/lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  ConfirmationResult,
  sendEmailVerification,
} from 'firebase/auth';
import { Sparkles, ArrowRight, Mail, Phone } from 'lucide-react';
import posthog from 'posthog-js';

export default function SignUpPage() {
  const router = useRouter();

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  const [fullName, setFullName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // ignore cleanup error
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const fbUser = userCredential.user;

      if (fullName) {
        await updateProfile(fbUser, { displayName: fullName });
      }

      // Send verification email
      try {
        await sendEmailVerification(fbUser);
      } catch (emailErr) {
        console.error('Failed to send verification email:', emailErr);
      }

      // Upsert user into Supabase database
      const supabase = createClient();
      const { data: newUserId, error: rpcError } = await supabase.rpc(
        'resolve_customer_identity',
        {
          p_firebase_uid: fbUser.uid,
          p_provider: 'password',
          p_provider_identifier: fbUser.email || '',
          p_email: fbUser.email || null,
          p_email_verified: fbUser.emailVerified || false,
          p_phone: phone || fbUser.phoneNumber || null,
          p_phone_verified: false,
          p_name: fullName || fbUser.displayName || null,
        }
      );
      const newUser = newUserId ? { id: newUserId } : null;
      if (rpcError) console.error('RPC Error:', rpcError);

      if (newUser) {
        try {
          const match = document.cookie.match(
            /(^| )ruhvi_referral_code=([^;]+)/
          );
          if (match) {
            const refCode = match[2];
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('referral_code', refCode)
              .single();
            if (referrer && referrer.id !== newUser.id) {
              await supabase.from('referrals').insert({
                referrer_user_id: referrer.id,
                referred_user_id: newUser.id,
                status: 'pending',
                coins_awarded: 0,
              });
            }
            document.cookie =
              'ruhvi_referral_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } catch (err) {
          console.error('Referral tracking error:', err);
        }

        // Create session cookie for SSR
        const idToken = await fbUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        // Trigger Welcome Email
        fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: fbUser.email,
            name: fullName || fbUser.displayName,
          }),
        }).catch((err) =>
          console.error('Failed to trigger welcome email:', err)
        );

        posthog.capture('signup_completed', { method: 'email' });
      }

      setMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/complete-profile');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Firebase Email Signup error:', err);
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      } catch (signOutErr) {
        console.error('Failed to clean up Firebase session:', signOutErr);
      }
      let msg = 'An error occurred during sign up.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formattedPhone = phone.startsWith('+')
        ? phone
        : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      if (typeof window !== 'undefined') {
        if ((window as any).recaptchaVerifier) {
          try {
            (window as any).recaptchaVerifier.clear();
          } catch (e) {}
          (window as any).recaptchaVerifier = null;
        }
        const containerNode = document.getElementById('recaptcha-container');
        if (containerNode) {
          containerNode.innerHTML = '';
        }
        (window as any).recaptchaVerifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
          }
        );
      }
      const appVerifier = (window as any).recaptchaVerifier;

      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );
      setConfirmationResult(confirmation);

      setShowOtpInput(true);
      setMessage('OTP sent to your phone number.');
    } catch (err: any) {
      console.error('OTP send error:', err);
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {}
        (window as any).recaptchaVerifier = null;
      }
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    setError(null);

    try {
      const userCredential = await confirmationResult.confirm(otp);
      if (fullName && !userCredential.user.displayName) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }
      const user = userCredential.user;

      const supabase = createClient();
      const { data: newUserId, error: rpcError } = await supabase.rpc(
        'resolve_customer_identity',
        {
          p_firebase_uid: user.uid,
          p_provider: 'phone',
          p_provider_identifier: user.phoneNumber || '',
          p_email: user.email || null,
          p_email_verified: false,
          p_phone: user.phoneNumber || null,
          p_phone_verified: true,
          p_name: fullName || user.displayName || null,
        }
      );
      const newUser = newUserId ? { id: newUserId } : null;
      if (rpcError) console.error('RPC Error:', rpcError);

      if (newUser) {
        try {
          const match = document.cookie.match(
            /(^| )ruhvi_referral_code=([^;]+)/
          );
          if (match) {
            const refCode = match[2];
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('referral_code', refCode)
              .single();
            if (referrer && referrer.id !== newUser.id) {
              await supabase.from('referrals').insert({
                referrer_user_id: referrer.id,
                referred_user_id: newUser.id,
                status: 'pending',
                coins_awarded: 0,
              });
            }
            document.cookie =
              'ruhvi_referral_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } catch (err) {
          console.error('Referral tracking error:', err);
        }

        // Create session cookie for SSR
        const idToken = await user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        posthog.capture('signup_completed', { method: 'phone' });
      }

      setMessage(
        'Account verified successfully! Redirecting to complete your profile...'
      );
      setTimeout(() => {
        router.push('/complete-profile');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setError(err?.message || 'Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      const supabase = createClient();
      const { data: newUserId, error: rpcError } = await supabase.rpc(
        'resolve_customer_identity',
        {
          p_firebase_uid: fbUser.uid,
          p_provider: 'google',
          p_provider_identifier: fbUser.email || fbUser.uid,
          p_email: fbUser.email || null,
          p_email_verified: fbUser.emailVerified || true,
          p_phone: fbUser.phoneNumber || null,
          p_phone_verified: !!fbUser.phoneNumber,
          p_name: fbUser.displayName || null,
        }
      );
      const newUser = newUserId ? { id: newUserId } : null;
      if (rpcError) console.error('RPC Error:', rpcError);

      if (newUser) {
        try {
          const match = document.cookie.match(
            /(^| )ruhvi_referral_code=([^;]+)/
          );
          if (match) {
            const refCode = match[2];
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('referral_code', refCode)
              .single();
            if (referrer && referrer.id !== newUser.id) {
              await supabase.from('referrals').insert({
                referrer_user_id: referrer.id,
                referred_user_id: newUser.id,
                status: 'pending',
                coins_awarded: 0,
              });
            }
            document.cookie =
              'ruhvi_referral_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } catch (err) {
          console.error('Referral tracking error:', err);
        }

        const idToken = await fbUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        posthog.capture('signup_completed', { method: 'google' });
      }

      setMessage(
        'Account created successfully! Redirecting to complete your profile...'
      );
      setTimeout(() => {
        router.push('/complete-profile');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Firebase Google sign in error:', err);
      setError(err?.message || 'Failed to sign in with Google.');
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new FacebookAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      const supabase = createClient();
      const { data: newUserId, error: rpcError } = await supabase.rpc(
        'resolve_customer_identity',
        {
          p_firebase_uid: fbUser.uid,
          p_provider: 'facebook',
          p_provider_identifier: fbUser.email || fbUser.uid,
          p_email: fbUser.email || null,
          p_email_verified: fbUser.emailVerified || true,
          p_phone: fbUser.phoneNumber || null,
          p_phone_verified: !!fbUser.phoneNumber,
          p_name: fbUser.displayName || null,
        }
      );
      const newUser = newUserId ? { id: newUserId } : null;
      if (rpcError) console.error('RPC Error:', rpcError);

      if (newUser) {
        try {
          const match = document.cookie.match(
            /(^| )ruhvi_referral_code=([^;]+)/
          );
          if (match) {
            const refCode = match[2];
            const { data: referrer } = await supabase
              .from('users')
              .select('id')
              .eq('referral_code', refCode)
              .single();
            if (referrer && referrer.id !== newUser.id) {
              await supabase.from('referrals').insert({
                referrer_user_id: referrer.id,
                referred_user_id: newUser.id,
                status: 'pending',
                coins_awarded: 0,
              });
            }
            document.cookie =
              'ruhvi_referral_code=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          }
        } catch (err) {
          console.error('Referral tracking error:', err);
        }

        const idToken = await fbUser.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        posthog.capture('signup_completed', { method: 'facebook' });
      }

      setMessage(
        'Account created successfully! Redirecting to complete your profile...'
      );
      setTimeout(() => {
        router.push('/complete-profile');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Firebase Facebook sign in error:', err);
      setError(err?.message || 'Failed to sign in with Facebook.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E7D7A3]/50 bg-white p-8 shadow-xl">
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="relative mb-4 h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#E7D7A3]/30"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#C29831] border-t-transparent"></div>
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 animate-pulse text-[#C29831]" />
            </div>
            <p className="animate-pulse font-serif text-sm font-medium text-[#121110]">
              Authenticating...
            </p>
          </div>
        )}
        <div id="recaptcha-container"></div>
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">
              RUHVI
            </span>
          </Link>
          <h2 className="font-serif text-2xl font-bold text-[#121110]">
            Create Your Account
          </h2>
          <p className="mt-1 text-xs text-[#121110]/60">
            Join the Ruhvi Fine Jewellery Club
          </p>
        </div>

        <div
          className="mb-6 flex rounded-xl bg-[#FAF7ED] p-1"
          role="tablist"
          aria-label="Sign up method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === 'email'}
            aria-controls="email-signup-panel"
            id="signup-tab-email"
            onClick={() => {
              setAuthMethod('email');
              setError(null);
              setMessage(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${
              authMethod === 'email'
                ? 'bg-white text-[#121110] shadow-sm'
                : 'text-[#121110]/60 hover:text-[#121110]'
            }`}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMethod === 'phone'}
            aria-controls="phone-signup-panel"
            id="signup-tab-phone"
            onClick={() => {
              setAuthMethod('phone');
              setError(null);
              setMessage(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${
              authMethod === 'phone'
                ? 'bg-white text-[#121110] shadow-sm'
                : 'text-[#121110]/60 hover:text-[#121110]'
            }`}
          >
            <Phone className="h-4 w-4" /> Phone (OTP)
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium leading-relaxed text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium leading-relaxed text-emerald-800">
            {message}
          </div>
        )}

        {authMethod === 'email' ? (
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label
                htmlFor="signup-full-name"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Full Name
              </label>
              <input
                id="signup-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aarav@example.com"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
            </div>

            <div>
              <label
                htmlFor="signup-confirm-password"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
            >
              {loading ? (
                'Creating Account...'
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form
            onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="signup-phone-full-name"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Full Name
              </label>
              <input
                id="signup-phone-full-name"
                type="text"
                required
                disabled={showOtpInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="signup-phone"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Phone Number
              </label>
              <input
                id="signup-phone"
                type="tel"
                required
                disabled={showOtpInput}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9999999999"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 disabled:opacity-60"
              />
            </div>

            {showOtpInput && (
              <div>
                <label
                  htmlFor="signup-otp"
                  className="mb-1 block text-xs font-medium text-[#121110]/80"
                >
                  Enter OTP
                </label>
                <input
                  id="signup-otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-center font-mono text-sm tracking-widest text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
            >
              {loading ? (
                showOtpInput ? (
                  'Verifying...'
                ) : (
                  'Sending OTP...'
                )
              ) : (
                <>
                  {showOtpInput ? 'Verify & Create Account' : 'Send OTP'}{' '}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {showOtpInput && (
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtp('');
                    setMessage(null);
                  }}
                  className="text-xs font-medium text-[#C29831] hover:underline"
                >
                  Change Details
                </button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#E7D7A3]/50"></div>
          <span className="text-xs text-[#121110]/60">OR</span>
          <div className="h-px flex-1 bg-[#E7D7A3]/50"></div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7D7A3] bg-white px-4 py-3 text-sm font-medium text-[#121110] shadow-sm transition hover:bg-[#FAF7ED] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={handleFacebookSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#166FE5] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Sign up with Facebook
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-[#121110]/60">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-[#C29831] hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
