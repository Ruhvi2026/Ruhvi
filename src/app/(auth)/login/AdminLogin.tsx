'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmail, upsertUserProfile } from '@/services/authService';
import {
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  Mail,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function AdminLogin({
  defaultRedirect = '/admin/dashboard',
}: {
  defaultRedirect?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || defaultRedirect;
  const recoveryTokenParam = searchParams.get('recoveryToken');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [mfaStep, setMfaStep] = useState<
    'credentials' | 'totp' | 'emergency_recovery'
  >(recoveryTokenParam ? 'emergency_recovery' : 'credentials');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Emergency recovery state
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (recoveryTokenParam) {
      setMfaStep('emergency_recovery');
    }
  }, [recoveryTokenParam]);

  // Step 1: Handle Initial Email & Password Submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      // 1. Authenticate with Firebase
      const userCred = await signInWithEmail(email, password);
      const fbUser = userCred.user;
      const idToken = await fbUser.getIdToken(true);

      // 2. Query MFA Challenge
      const challengeRes = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const challengeData = await challengeRes.json();

      if (!challengeRes.ok) {
        throw new Error(challengeData.error || 'Authentication challenge failed.');
      }

      // 3. If 2FA is required, transition to Step 2
      if (challengeData.mfaRequired) {
        setMfaToken(challengeData.mfaToken);
        setMfaStep('totp');
        setLoading(false);
        return;
      }

      // 4. If 2FA is not enabled yet, complete standard session login
      await upsertUserProfile(fbUser);
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error('Admin login error:', err);
      let msg = 'Invalid email or password.';
      if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  // Step 2: Handle TOTP / Backup Code Verification
  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const verifyRes = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaToken,
          code: totpCode,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Verification code failed.');
      }

      // Sync user profile to Supabase client
      if (auth.currentUser) {
        await upsertUserProfile(auth.currentUser);
      }

      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error('MFA verify error:', err);
      setError(err?.message || 'Invalid verification code.');
      setLoading(false);
    }
  };

  // Request Emergency Recovery Email
  const handleRequestRecoveryEmail = async () => {
    if (!email) {
      setError('Please provide your account email to dispatch recovery.');
      return;
    }

    setRecoveryLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/mfa/recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch recovery email.');
      }

      setRecoverySent(true);
      setInfoMessage(
        'An emergency recovery link has been dispatched to your secure emergency inbox.'
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to request emergency recovery.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Confirm Emergency Email Recovery (via link token)
  const handleConfirmRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryTokenParam) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/mfa/recovery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryToken: recoveryTokenParam,
          password: recoveryPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Recovery confirmation failed.');
      }

      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error('Recovery confirm error:', err);
      setError(err?.message || 'Failed to authorize recovery.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-4 font-sans">
      <div className="relative flex min-h-[600px] w-full max-w-[1000px] overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Left Side: Illustration */}
        <div className="relative hidden flex-1 items-center justify-center border-r border-gray-100 bg-[#fcfdfd] md:flex">
          <div className="max-h-md relative h-full w-full max-w-md">
            <Image
              src="/images/admin-login.png"
              alt="Admin Dashboard Illustration"
              fill
              className="object-contain p-8"
              priority
            />
          </div>
        </div>

        {/* Right Side: Login & 2FA Flow */}
        <div className="flex flex-1 flex-col justify-center px-8 py-10 md:px-16 lg:px-20">
          <div className="mx-auto w-full max-w-sm space-y-6">
            {/* Header */}
            <div className="text-center">
              {mfaStep === 'totp' ? (
                <>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Two-Factor Verification
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {useBackupCode
                      ? 'Enter one of your 8-character emergency backup recovery codes.'
                      : 'Enter the 6-digit code generated by your Google Authenticator app.'}
                  </p>
                </>
              ) : mfaStep === 'emergency_recovery' ? (
                <>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Authorize 2FA Recovery
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Confirm your account password to authorize emergency 2FA reset
                    and restore portal access.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-gray-900">Staff Login</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Ruhvi Operations &amp; Administration Portal
                  </p>
                </>
              )}
            </div>

            {/* Error Notification */}
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Success / Info Notification */}
            {infoMessage && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center text-xs text-emerald-700">
                {infoMessage}
              </div>
            )}

            {/* STEP 1: Email & Password Form */}
            {mfaStep === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-1.5 block text-xs font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <div className="group relative">
                    <input
                      id="admin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@ruhvi.in"
                      className="w-full rounded-lg bg-[#F3F4F6] px-4 py-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <User className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-1.5 block text-xs font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="group relative">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg bg-[#F3F4F6] px-4 py-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-black"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
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
                  className="mt-2 w-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-medium text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* STEP 2: TOTP / Backup Code Verification Form */}
            {mfaStep === 'totp' && (
              <form onSubmit={handleTotpVerify} className="space-y-4">
                <div>
                  <label
                    htmlFor="mfa-code-input"
                    className="mb-1.5 block text-xs font-medium text-gray-700"
                  >
                    {useBackupCode ? 'Emergency Backup Code' : '6-Digit Code'}
                  </label>
                  <div className="group relative">
                    <input
                      id="mfa-code-input"
                      type="text"
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      value={totpCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (useBackupCode) {
                          setTotpCode(val.toUpperCase().slice(0, 10));
                        } else {
                          setTotpCode(val.replace(/\D/g, '').slice(0, 6));
                        }
                      }}
                      placeholder={useBackupCode ? 'e.g. A7B2-C9D4' : '••••••'}
                      className={`w-full rounded-lg bg-[#F3F4F6] px-4 py-3.5 text-center text-lg font-mono tracking-widest text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        !useBackupCode ? 'tracking-[0.4em] font-semibold' : ''
                      }`}
                    />
                    <KeyRound className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (useBackupCode
                      ? totpCode.trim().length < 8
                      : totpCode.length !== 6)
                  }
                  className="w-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-medium text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                {/* Option 1: Toggle Backup Code */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setTotpCode('');
                      setError(null);
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {useBackupCode
                      ? '← Use Google Authenticator app instead'
                      : 'Lost phone? Use an emergency backup recovery code'}
                  </button>
                </div>

                {/* Option 4: Emergency Email Recovery Link */}
                <div className="border-t border-gray-100 pt-3 text-center">
                  <button
                    type="button"
                    disabled={recoveryLoading || recoverySent}
                    onClick={handleRequestRecoveryEmail}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-60"
                  >
                    {recoveryLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    {recoverySent
                      ? 'Recovery link dispatched to emergency inbox'
                      : 'Lost both phone & backup codes? Send emergency recovery email'}
                  </button>
                </div>

                {/* Back to credentials */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep('credentials');
                      setTotpCode('');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to email &amp; password
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Emergency Recovery Mode via Email Link */}
            {mfaStep === 'emergency_recovery' && (
              <form onSubmit={handleConfirmRecovery} className="space-y-4">
                <div>
                  <label
                    htmlFor="recovery-password"
                    className="mb-1.5 block text-xs font-medium text-gray-700"
                  >
                    Account Password
                  </label>
                  <div className="group relative">
                    <input
                      id="recovery-password"
                      type={showRecoveryPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={recoveryPassword}
                      onChange={(e) => setRecoveryPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full rounded-lg bg-[#F3F4F6] px-4 py-3 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowRecoveryPassword(!showRecoveryPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-black"
                    >
                      {showRecoveryPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !recoveryPassword}
                  className="w-full rounded-full bg-gradient-to-r from-red-600 to-red-700 py-3 text-sm font-medium text-white shadow-md shadow-red-600/30 transition-all hover:from-red-700 hover:to-red-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
                >
                  {loading ? 'Authorizing Recovery...' : 'Confirm & Reset 2FA'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep('credentials');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to standard login
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center">
              <span className="text-xs text-gray-400">
                Protected by 256-bit AES &amp; RFC 6238 TOTP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
