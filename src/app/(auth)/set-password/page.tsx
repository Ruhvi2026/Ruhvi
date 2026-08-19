'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Sparkles, ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { upsertUserProfile } from '@/services/authService';
import toast from 'react-hot-toast';

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Determine if the user already has an email associated (like Google/Facebook)
  const hasEmail = !!user?.email;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if password provider is already linked
        const hasPasswordProvider = currentUser.providerData.some(
          (p) => p.providerId === 'password'
        );
        if (hasPasswordProvider) {
          toast.success('Your account already has a password set.');
          router.push(redirectTo);
        } else {
          if (currentUser.email) {
            setEmail(currentUser.email);
          }
          setLoading(false);
        }
      } else {
        // Not logged in
        router.push(
          `/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
        );
      }
    });

    return () => unsubscribe();
  }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      // 1. Create email/password credential
      const credential = EmailAuthProvider.credential(email, password);

      // 2. Link credential to the current Firebase user
      const userCredential = await linkWithCredential(user, credential);
      const updatedUser = userCredential.user;

      // 3. Force token refresh to include new provider claims
      await updatedUser.getIdToken(true);

      // 4. Sync profile with Supabase
      await upsertUserProfile(updatedUser);

      // 5. Success
      setMessage('Password set successfully! Redirecting...');
      toast.success('Password linked successfully!');

      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error('Link password error:', err);
      let msg = 'Failed to set password. Please try again.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use by another account.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err?.code === 'auth/credential-already-in-use') {
        msg =
          'This email and password credential is already linked to another account.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-4 h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#E7D7A3]/30"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#C29831] border-t-transparent"></div>
            <Sparkles className="absolute inset-0 m-auto h-6 w-6 animate-pulse text-[#C29831]" />
          </div>
          <p className="animate-pulse font-serif text-sm font-medium text-[#121110]">
            Checking credentials...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#E7D7A3]/50 bg-white p-8 shadow-xl">
        {submitting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="relative mb-4 h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#E7D7A3]/30"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#C29831] border-t-transparent"></div>
              <Sparkles className="absolute inset-0 m-auto h-6 w-6 animate-pulse text-[#C29831]" />
            </div>
            <p className="animate-pulse font-serif text-sm font-medium text-[#121110]">
              Securing your account...
            </p>
          </div>
        )}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">
              RUHVI
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#121110]">
            Set Your Password
          </h2>
          <p className="mt-1 text-xs text-[#121110]/60">
            {hasEmail
              ? 'Add a password to log in via email next time'
              : 'Add an email and password to log in via email next time'}
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#121110]/80">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                disabled={hasEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aarav@example.com"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 pl-10 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 disabled:opacity-60"
              />
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#121110]/40" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#121110]/80">
              Choose Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 pl-10 pr-11 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#121110]/40" />
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
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
          >
            Set Password & Continue <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
