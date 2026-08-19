'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Authenticate via Firebase Auth with hybrid bridge fallback
      const { signInWithEmailAndPassword, signInWithCustomToken } =
        await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      let fbUser = null;

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        fbUser = userCredential.user;
      } catch (fbLoginErr: any) {
        if (
          fbLoginErr?.code === 'auth/user-not-found' ||
          fbLoginErr?.code === 'auth/invalid-credential' ||
          fbLoginErr?.code === 'auth/wrong-password' ||
          fbLoginErr?.code === 'auth/invalid-login-credentials'
        ) {
          const hybridRes = await fetch('/api/auth/hybrid-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (hybridRes.ok) {
            const hybridData = await hybridRes.json();
            if (hybridData.customToken) {
              const customUserCred = await signInWithCustomToken(
                auth,
                hybridData.customToken
              );
              fbUser = customUserCred.user;
            } else if (hybridData.idToken) {
              try {
                const userCredential = await signInWithEmailAndPassword(
                  auth,
                  email,
                  password
                );
                fbUser = userCredential.user;
              } catch {
                // proceed with direct session
              }
            }
          }
        }

        if (!fbUser) {
          throw fbLoginErr;
        }
      }

      // Create session cookie
      const idToken = await fbUser.getIdToken();
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!sessionRes.ok) {
        const text = await sessionRes.text().catch(() => '');
        let errMsg = 'Failed to create secure session';
        try {
          const parsed = JSON.parse(text);
          if (parsed.error) errMsg = parsed.error;
        } catch {
          if (text)
            errMsg = `Session Error (${sessionRes.status}): ${text.slice(0, 150)}`;
        }
        throw new Error(errMsg);
      }

      // Check role using Supabase
      const supabase = createClient();
      const { data: identity } = await supabase
        .from('customer_identities')
        .select('customer_id')
        .eq('firebase_uid', fbUser.uid)
        .single();

      let userProfile = null;
      if (identity?.customer_id) {
        const { data: profileData } = await supabase
          .from('users')
          .select('role')
          .eq('id', identity.customer_id)
          .single();
        userProfile = profileData;
      }

      const role = userProfile?.role;
      const isAdmin =
        fbUser.email === 'ruhvi.main@gmail.com' ||
        role === 'admin' ||
        role === 'manager';

      if (!isAdmin) {
        await fetch('/api/auth/logout', { method: 'POST' });
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        throw new Error('Access denied. You do not have admin privileges.');
      }

      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error('Admin login error:', err);
      let msg = 'Invalid email or password.';
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/invalid-login-credentials'
      ) {
        msg = 'Invalid credentials.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-4 font-sans">
      <div className="relative flex h-[600px] w-full max-w-[1000px] overflow-hidden rounded-2xl bg-white shadow-xl">
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

        {/* Right Side: Login Form */}
        <div className="flex flex-1 flex-col justify-center px-8 md:px-16 lg:px-24">
          <div className="mx-auto w-full max-w-sm space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Login</h2>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="group relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ruhvi.in"
                  className="w-full rounded-lg bg-[#F3F4F6] px-5 py-3.5 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <User className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-800" />
              </div>

              <div className="group relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-[#F3F4F6] px-5 py-3.5 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 transition-colors hover:text-black"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <a
                  href="#"
                  className="text-xs font-medium text-blue-500 transition-colors hover:text-blue-600"
                >
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 py-3.5 text-sm font-medium text-white shadow-md shadow-blue-500/30 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
              >
                {loading ? 'Authenticating...' : 'Login'}
              </button>
            </form>

            <div className="pt-2 text-center">
              <span className="text-xs text-gray-500">
                Internal Access Only.{' '}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
