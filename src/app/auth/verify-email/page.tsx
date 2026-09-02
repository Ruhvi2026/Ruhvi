'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sparkles, MailCheck, MailX, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) {
        if (mounted) {
          setStatus('error');
          setMessage('Missing verification token.');
        }
        return;
      }
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!mounted) return;
        if (res.ok && data.success) {
          setStatus('success');
          setMessage(
            'Your email has been verified successfully! You can now log in and complete your profile.'
          );
        } else {
          setStatus('error');
          setMessage(
            data.error ||
              'We could not verify your email. Please try requesting a new link.'
          );
        }
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#E7D7A3]/50 bg-white p-8 text-center shadow-xl">
        <div className="mb-6">
          <Link
            href="/"
            className="mb-4 inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="h-6 w-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">
              RUHVI
            </span>
          </Link>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-[#C29831]" />
            <p className="text-sm text-[#121110]/70">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <MailCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#121110]">
              Email Verified!
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#121110]/70">
              {message}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full rounded-xl bg-[#1C1B1A] px-4 py-3 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black"
              >
                Sign In to Your Account
              </Link>
              <Link
                href="/"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF6ED] px-4 py-3 text-sm font-medium text-[#121110] transition hover:bg-[#F3EAD5]"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <MailX className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#121110]">
              Verification Failed
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#121110]/70">
              {message}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/account"
                className="w-full rounded-xl bg-[#1C1B1A] px-4 py-3 text-sm font-medium text-[#FAF6ED] shadow-md transition hover:bg-black"
              >
                Go to My Account
              </Link>
              <Link
                href="/"
                className="w-full rounded-xl border border-[#E7D7A3] bg-[#FAF6ED] px-4 py-3 text-sm font-medium text-[#121110] transition hover:bg-[#F3EAD5]"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF6ED] text-sm text-[#121110]/60">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
