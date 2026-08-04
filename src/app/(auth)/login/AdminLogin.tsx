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
      const supabase = createClient();
      
      // Authenticate via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw authError || new Error('Authentication failed');
      }

      const fbUser = authData.user;

      // Check role just to ensure they have admin privileges
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('email', fbUser.email)
        .single();

      const role = userProfile?.role;
      const isAdmin = fbUser.email === 'ruhvi.main@gmail.com' || role === 'admin' || role === 'manager';

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error('Access denied. You do not have admin privileges.');
      }

      router.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));
      window.location.href = redirectTo;

    } catch (err: any) {
      console.error('Admin login error:', err);
      let msg = 'Invalid email or password.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        msg = 'Invalid credentials.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 font-sans">
      <div className="flex w-full max-w-[1000px] h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden relative">
        
        {/* Left Side: Illustration */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#fcfdfd] relative border-r border-gray-100">
          <div className="relative w-full h-full max-w-md max-h-md">
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
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Login</h2>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ruhvi.in"
                  className="w-full px-5 py-3.5 bg-[#F3F4F6] text-gray-900 placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-800" />
              </div>

              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-3.5 bg-[#F3F4F6] text-gray-900 placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-800 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <a href="#" className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full font-medium shadow-md shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-2 text-sm"
              >
                {loading ? 'Authenticating...' : 'Login'}
              </button>

            </form>

            <div className="text-center pt-2">
              <span className="text-xs text-gray-500">Internal Access Only. </span>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
