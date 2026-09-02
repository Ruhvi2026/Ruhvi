'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setMessage(
        'Your password has been successfully updated! Redirecting to login...'
      );
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#E7D7A3]/50 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">
              RUHVI
            </span>
          </Link>
          <h2 className="font-serif text-2xl font-bold text-[#121110]">
            Set New Password
          </h2>
          <p className="mt-1 text-xs text-[#121110]/60">
            Enter your new secure password
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            {message}
          </div>
        )}

        {!error && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label
                htmlFor="reset-new-password"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                New Password
              </label>
              <input
                id="reset-new-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="mb-1 block text-xs font-medium text-[#121110]/80"
              >
                Confirm New Password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 px-4 py-3 text-sm text-[#121110] focus:outline-none focus:ring-2 focus:ring-[#C29831]/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
            >
              {loading ? (
                'Updating Password...'
              ) : (
                <>
                  Update Password <KeyRound className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] text-sm text-[#121110]/60">
          Loading...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
