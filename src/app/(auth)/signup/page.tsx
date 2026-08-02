'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight, Mail, Phone } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')

  const [fullName, setFullName] = useState('')
  
  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Phone state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })

      if (error) throw error

      setMessage('Account created successfully! Redirecting...')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('Phone OTP authentication is temporarily paused. Please use Email sign up.')
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('Phone OTP authentication is temporarily paused. Please use Email sign up.')
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Google sign in error:', err)
      setError(err?.message || 'Failed to sign in with Google.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E7D7A3]/50 rounded-3xl p-8 shadow-xl">
        <div id="recaptcha-container"></div>
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">RUHVI</span>
          </Link>
          <h2 className="font-serif text-2xl font-bold text-[#121110]">Create Your Account</h2>
          <p className="text-xs text-[#121110]/60 mt-1">Join the Ruhvi Fine Jewellery Club</p>
        </div>

        <div className="flex bg-[#FAF7ED] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setError(null); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
              authMethod === 'email' ? 'bg-white text-[#121110] shadow-sm' : 'text-[#121110]/60 hover:text-[#121110]'
            }`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('phone'); setError(null); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
              authMethod === 'phone' ? 'bg-white text-[#121110] shadow-sm' : 'text-[#121110]/60 hover:text-[#121110]'
            }`}
          >
            <Phone className="w-4 h-4" /> Phone (OTP)
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {message}
          </div>
        )}

        {authMethod === 'email' ? (
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#121110]/80 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#121110]/80 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aarav@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#121110]/80 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 bg-[#1C1B1A] text-[#FAF6ED] rounded-xl font-medium text-sm hover:bg-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#121110]/80 mb-1">Full Name</label>
              <input
                type="text"
                required
                disabled={showOtpInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#121110]/80 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                disabled={showOtpInput}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9999999999"
                className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110] disabled:opacity-60"
              />
            </div>

            {showOtpInput && (
              <div>
                <label className="block text-xs font-medium text-[#121110]/80 mb-1">Enter OTP</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110] text-center tracking-widest font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 bg-[#1C1B1A] text-[#FAF6ED] rounded-xl font-medium text-sm hover:bg-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {loading ? (showOtpInput ? 'Verifying...' : 'Sending OTP...') : (
                <>
                  {showOtpInput ? 'Verify & Create Account' : 'Send OTP'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {showOtpInput && (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setShowOtpInput(false); setOtp(''); setMessage(null); }}
                  className="text-xs text-[#C29831] hover:underline font-medium"
                >
                  Change Details
                </button>
              </div>
            )}
          </form>
        )}

        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-[#E7D7A3]/50"></div>
          <span className="text-xs text-[#121110]/60">OR</span>
          <div className="flex-1 h-px bg-[#E7D7A3]/50"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mt-6 py-3 px-4 bg-white border border-[#E7D7A3] text-[#121110] rounded-xl font-medium text-sm hover:bg-[#FAF7ED] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        <div className="mt-8 text-center text-xs text-[#121110]/60">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#C29831] hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
