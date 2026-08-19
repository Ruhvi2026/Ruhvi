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
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import {
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Phone,
} from 'lucide-react';
import { upsertUserProfile } from '@/services/authService';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function CompleteProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const [user, setUser] = useState<User | null>(null);

  // States to determine what is missing
  const [missingEmail, setMissingEmail] = useState(false);
  const [missingPhone, setMissingPhone] = useState(false);
  const [missingPassword, setMissingPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // OTP specific states
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Setup recaptcha
    if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
        }
      );
    }

    return () => {
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const hasEmailProvider = currentUser.providerData.some(
          (p) =>
            p.providerId === 'password' ||
            p.providerId === 'google.com' ||
            p.providerId === 'facebook.com'
        );
        const hasPhoneProvider = currentUser.providerData.some(
          (p) => p.providerId === 'phone'
        );
        const hasPasswordProvider = currentUser.providerData.some(
          (p) => p.providerId === 'password'
        );

        // Note: Google/Facebook users have email but no password.
        const needsEmail = !currentUser.email;
        const needsPhone = !hasPhoneProvider;
        const needsPassword = !hasPasswordProvider;

        if (!needsEmail && !needsPhone && !needsPassword) {
          toast.success('Your profile is already complete!');
          router.push(redirectTo);
          return;
        }

        setMissingEmail(needsEmail);
        setMissingPhone(needsPhone);
        setMissingPassword(needsPassword);

        if (currentUser.email) setEmail(currentUser.email);

        setLoading(false);
      } else {
        router.push(
          `/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
        );
      }
    });

    return () => unsubscribe();
  }, [router, redirectTo]);

  const handleSendOtp = async () => {
    if (!phone) {
      setError('Please enter a valid phone number.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formattedPhone = phone.startsWith('+')
        ? phone
        : `+91${phone.replace(/\D/g, '').slice(-10)}`;
      const appVerifier = (window as any).recaptchaVerifier;
      if (!user) throw new Error('No user found');

      const confirmation = await linkWithPhoneNumber(
        user,
        formattedPhone,
        appVerifier
      );
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
      setMessage('OTP sent to your phone number.');
    } catch (err: any) {
      console.error('OTP send error:', err);
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      let updatedUser = user;

      // 1. Verify OTP and Link Phone (If Missing)
      if (missingPhone && showOtpInput && confirmationResult) {
        const credential = PhoneAuthProvider.credential(
          confirmationResult.verificationId,
          otp
        );
        const userCred = await linkWithCredential(updatedUser, credential);
        updatedUser = userCred.user;
      } else if (missingPhone && !showOtpInput) {
        await handleSendOtp();
        return; // wait for OTP input
      }

      // 2. Link Email & Password (If Missing)
      if (missingPassword && password) {
        // Since we might be adding email and password together:
        const linkEmail = missingEmail ? email : updatedUser.email;
        if (linkEmail) {
          const credential = EmailAuthProvider.credential(linkEmail, password);
          const userCred = await linkWithCredential(updatedUser, credential);
          updatedUser = userCred.user;
        }
      }

      // 3. Force token refresh to include new provider claims
      await updatedUser.getIdToken(true);

      // 4. Sync profile with Supabase
      await upsertUserProfile(updatedUser);

      // Update Database verification explicitly to sync changes across session
      const supabase = createClient();
      await supabase.rpc('resolve_customer_identity', {
        p_firebase_uid: updatedUser.uid,
        p_provider: 'hybrid',
        p_provider_identifier: updatedUser.email || updatedUser.uid,
        p_email: updatedUser.email || null,
        p_email_verified: updatedUser.emailVerified || false,
        p_phone: updatedUser.phoneNumber || null,
        p_phone_verified: !!updatedUser.phoneNumber,
        p_name: updatedUser.displayName || null,
      });

      // 5. Success
      setMessage('Profile updated successfully! Redirecting...');
      toast.success('Profile completed successfully!');

      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error('Profile complete error:', err);
      let msg = 'Failed to update profile. Please try again.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use by another account.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err?.code === 'auth/credential-already-in-use') {
        msg = 'These credentials are already linked to another account.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
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
        <div id="recaptcha-container"></div>
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">
              RUHVI
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#121110]">
            Complete Your Profile
          </h2>
          <p className="mt-1 text-xs text-[#121110]/60">
            Secure your account by providing the missing details
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
          <div className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-sm font-bold text-emerald-800">
              Verify and Get ₹50 Sign-up Bonus! 🎁
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Ensure both your email and mobile number are linked and verified
              to unlock an instant ₹50 bonus in your Ruhvi wallet.
            </p>
          </div>

          {(missingEmail || !missingEmail) && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#121110]/80">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required={missingEmail}
                  disabled={!missingEmail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav@example.com"
                  className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 pl-10 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 disabled:bg-gray-100 disabled:opacity-60"
                />
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#121110]/40" />
              </div>
            </div>
          )}

          {missingPhone && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#121110]/80">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    disabled={showOtpInput}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9999999999"
                    className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 pl-10 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 disabled:opacity-60"
                  />
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#121110]/40" />
                </div>
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
                </div>
              )}
            </>
          )}

          {missingPassword && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[#121110]/80">
                Choose Password {missingPhone && '(Optional)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!missingPhone}
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
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
            >
              {missingPhone && !showOtpInput ? (
                <>
                  Send OTP & Continue <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Complete Profile <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                router.push(redirectTo);
                router.refresh();
              }}
              disabled={submitting}
              className="w-full rounded-xl border border-[#E7D7A3] bg-transparent px-4 py-3 text-sm font-medium text-[#121110] transition hover:bg-[#FAF7ED] disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
