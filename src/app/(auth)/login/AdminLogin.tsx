'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin({
  defaultRedirect = '/admin/dashboard',
}: {
  defaultRedirect?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || defaultRedirect;

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
      const supabase = createClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;
      if (!data.user) throw new Error('Login failed. No user returned.');

      // Check role using Supabase
      const { data: profileData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = profileData?.role;
      const isAdmin = [
        'admin',
        'manager',
        'staff',
        'super_admin',
        'SUPER_ADMIN',
      ].includes(role);

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error('Access denied. You do not have admin privileges.');
      }

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
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
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
                    className="w-full rounded-lg bg-[#F3F4F6] px-5 py-3.5 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <User className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-800" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
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
                    className="w-full rounded-lg bg-[#F3F4F6] px-5 py-3.5 text-sm text-gray-900 placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 transition-colors hover:text-black"
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
