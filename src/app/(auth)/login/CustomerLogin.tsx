'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { auth } from '@/lib/firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  ConfirmationResult,
} from 'firebase/auth';
import { Sparkles, ArrowRight, Eye, EyeOff, Mail, Phone } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isAdminHost, setIsAdminHost] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    if (typeof window !== 'undefined') {
      setIsAdminHost(
        window.location.hostname === 'admin.ruhvi.in' ||
          window.location.hostname.startsWith('admin.localhost')
      );
    }

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Handle Email/Password login strictly via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const fbUser = userCredential.user;

      // Upsert user into Supabase database securely via RPC
      const supabase = createClient();
      await supabase.rpc('sync_firebase_user', {
        p_uid: fbUser.uid,
        p_email: fbUser.email || null,
        p_name: fbUser.displayName || null,
        p_phone: fbUser.phoneNumber || null,
      });

      // Create session cookie for SSR
      const idToken = await fbUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      let destination =
        redirectTo === '/admin' ? '/admin/dashboard' : redirectTo;

      setMessage('Login successful! Redirecting...');
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = destination;
    } catch (err: any) {
      console.error('Firebase Email login error:', err);
      let msg = 'Invalid email or password. Please check your credentials.';
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential'
      ) {
        msg = 'No account found with this email or invalid password.';
      } else if (err?.code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
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

    const destination =
      redirectTo === '/admin' ? '/admin/dashboard' : redirectTo;

    try {
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;

      const supabase = createClient();
      await supabase.rpc('sync_firebase_user', {
        p_uid: user.uid,
        p_email: user.email || null,
        p_name: user.displayName || null,
        p_phone: user.phoneNumber || null,
      });

      // Create session cookie for SSR
      const idToken = await user.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      setMessage('Login successful! Redirecting...');
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = destination;
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setError(
        err?.message || 'Invalid OTP. Please check the code and try again.'
      );
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const targetUrl = redirectTo === '/admin' ? '/admin/dashboard' : redirectTo;
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      const supabase = createClient();
      await supabase.rpc('sync_firebase_user', {
        p_uid: fbUser.uid,
        p_email: fbUser.email || null,
        p_name: fbUser.displayName || null,
        p_phone: fbUser.phoneNumber || null,
      });

      const idToken = await fbUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      setMessage('Login successful! Redirecting...');
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = targetUrl;
    } catch (err: any) {
      console.error('Firebase Google sign in error:', err);
      setError(err?.message || 'Failed to sign in with Google.');
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError(null);
    const targetUrl = redirectTo === '/admin' ? '/admin/dashboard' : redirectTo;
    try {
      const provider = new FacebookAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      const supabase = createClient();
      await supabase.rpc('sync_firebase_user', {
        p_uid: fbUser.uid,
        p_email: fbUser.email || null,
        p_name: fbUser.displayName || null,
        p_phone: fbUser.phoneNumber || null,
      });

      const idToken = await fbUser.getIdToken();
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      setMessage('Login successful! Redirecting...');
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = targetUrl;
    } catch (err: any) {
      console.error('Firebase Facebook sign in error:', err);
      setError(err?.message || 'Failed to sign in with Facebook.');
      setLoading(false);
    }
  };

  return (
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
        <Link
          href="/"
          className="group mb-3 inline-flex flex-col items-center gap-2"
        >
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-gold-300/60 bg-gold-50/50 shadow-md transition-transform group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Ruhvi Jewels"
              fill
              className="object-cover"
              priority
            />
          </div>
          <span className="font-serif text-2xl font-bold tracking-widest text-[#121110]">
            RUHVI JEWELS
          </span>
        </Link>
        <h2 className="font-serif text-xl font-bold text-[#121110]">
          Welcome Back
        </h2>
        <p className="mt-1 text-xs text-[#121110]/60">
          Sign in to your account
        </p>
      </div>

      <div className="mb-6 flex rounded-xl bg-[#FAF7ED] p-1">
        <button
          type="button"
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
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#121110]/80">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@example.com"
              className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-[#121110]/80">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#C29831] hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 pr-11 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 transition-colors hover:text-stone-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
          >
            {loading ? (
              'Signing In...'
            ) : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
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
            <label className="mb-1 block text-xs font-medium text-[#121110]/80">
              Phone Number
            </label>
            <input
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
              <label className="mb-1 block text-xs font-medium text-[#121110]/80">
                Enter OTP
              </label>
              <input
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
                {showOtpInput ? 'Verify & Sign In' : 'Send OTP'}{' '}
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
                Change Phone Number
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
          Sign in with Google
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
          Sign in with Facebook
        </button>
      </div>

      {!isAdminHost && (
        <div className="mt-8 text-center text-xs text-[#121110]/60">
          Don’t have an account yet?{' '}
          <Link
            href="/signup"
            className="font-semibold text-[#C29831] hover:underline"
          >
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <Suspense
        fallback={
          <div className="text-sm text-[#121110]/60">Loading login form...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
