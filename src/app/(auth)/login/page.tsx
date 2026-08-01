'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight, Eye, EyeOff, Mail, Phone } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  
  // Email state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Phone state
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError(null)

    const targetUrl = redirectTo !== '/' ? redirectTo : '/admin/dashboard'

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      window.location.href = targetUrl
    } catch (err: any) {
      console.error('Login error:', err)
      const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : null)
      setError(msg && msg !== '{}' ? msg : 'Invalid email or password. Please check your credentials.')
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // Ensure phone number starts with a plus, assuming India (+91) if not provided
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
      
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })

      if (authError) throw authError

      setShowOtpInput(true)
      setMessage('OTP sent to your phone number.')
    } catch (err: any) {
      console.error('OTP send error:', err)
      setError(err?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError(null)

    const targetUrl = redirectTo !== '/' ? redirectTo : '/admin/dashboard'

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`

      const { data, error: authError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      })

      if (authError) throw authError

      window.location.href = targetUrl
    } catch (err: any) {
      console.error('OTP verify error:', err)
      setError(err?.message || 'Invalid OTP. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white border border-[#E7D7A3]/50 rounded-3xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-[#C29831]" />
          <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">RUHVI</span>
        </Link>
        <h2 className="font-serif text-2xl font-bold text-[#121110]">Welcome Back</h2>
        <p className="text-xs text-[#121110]/60 mt-1">Sign in to your account</p>
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
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium leading-relaxed">
          {error}
        </div>
      )}
      
      {message && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium leading-relaxed">
          {message}
        </div>
      )}

      {authMethod === 'email' ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#121110]/80">Password</label>
              <Link href="/forgot-password" className="text-xs text-[#C29831] hover:underline font-medium">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-[#1C1B1A] text-[#FAF6ED] rounded-xl font-medium text-sm hover:bg-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? 'Signing In...' : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp} className="space-y-4">
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
                {showOtpInput ? 'Verify & Sign In' : 'Send OTP'} <ArrowRight className="w-4 h-4" />
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
                Change Phone Number
              </button>
            </div>
          )}
        </form>
      )}

      <div className="mt-8 text-center text-xs text-[#121110]/60">
        Don’t have an account yet?{' '}
        <Link href="/signup" className="font-semibold text-[#C29831] hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <Suspense fallback={<div className="text-sm text-[#121110]/60">Loading login form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
