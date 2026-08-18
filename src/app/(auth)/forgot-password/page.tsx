'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send password reset email.');
      }

      setMessage(
        'Password reset link has been sent to your email. Please check your inbox.'
      );
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email.');
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
            Reset Password
          </h2>
          <p className="mt-1 text-xs text-[#121110]/60">
            Enter your registered email to receive reset link
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

        <form onSubmit={handleReset} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1B1A] px-4 py-3.5 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black disabled:opacity-50"
          >
            {loading ? (
              'Sending Link...'
            ) : (
              <>
                Send Reset Link <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[#121110]/60">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-[#121110] hover:text-[#C29831]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
