'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { auth } from '@/lib/firebase'
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  ConfirmationResult 
} from 'firebase/auth'
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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear()
        } catch (e) {
          // ignore cleanup error
        }
        ;(window as any).recaptchaVerifier = null
      }
    }
  }, [])

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const fbUser = userCredential.user

      if (fullName) {
        await updateProfile(fbUser, { displayName: fullName })
      }

      // Upsert user into Supabase database
      const supabase = createClient()
      await supabase.from('users').upsert({
        firebase_uid: fbUser.uid,
        email: fbUser.email || null,
        full_name: fullName || fbUser.displayName || null,
        phone: phone || fbUser.phoneNumber || null,
      }, { onConflict: 'firebase_uid' })

      setMessage('Account created successfully! Redirecting...')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('Firebase Email Signup error:', err)
      let msg = 'An error occurred during sign up.'
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.'
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.'
      } else if (err?.message) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`
      if (typeof window !== 'undefined') {
        if ((window as any).recaptchaVerifier) {
          try {
            (window as any).recaptchaVerifier.clear()
          } catch (e) {}
          ;(window as any).recaptchaVerifier = null
        }
        const containerNode = document.getElementById('recaptcha-container')
        if (containerNode) {
          containerNode.innerHTML = ''
        }
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        })
      }
      const appVerifier = (window as any).recaptchaVerifier
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier)
      setConfirmationResult(confirmation)

      setShowOtpInput(true)
      setMessage('OTP sent to your phone number.')
    } catch (err: any) {
      console.error('OTP send error:', err)
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear()
        } catch (e) {}
        ;(window as any).recaptchaVerifier = null
      }
      setError(err?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationResult) return
    setLoading(true)
    setError(null)

    try {
      const userCredential = await confirmationResult.confirm(otp)
      if (fullName && !userCredential.user.displayName) {
        await updateProfile(userCredential.user, { displayName: fullName })
      }
      const user = userCredential.user

      const supabase = createClient()
      await supabase.from('users').upsert({
        firebase_uid: user.uid,
        email: user.email || null,
        full_name: fullName || user.displayName || null,
        phone: user.phoneNumber || null,
      }, { onConflict: 'firebase_uid' })

      setMessage('Account verified successfully! Redirecting...')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error('OTP verify error:', err)
      setError(err?.message || 'Invalid OTP. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      // Handle Google OAuth strictly via Supabase Auth
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (supabaseError) throw supabaseError
    } catch (err: any) {
      console.error('Supabase Google sign in error:', err)
      const isProviderDisabled = err?.message?.includes('provider is not enabled') || err?.error_code === 'validation_failed'
      setError(
        isProviderDisabled
          ? 'Google Sign-In is not enabled in Supabase Dashboard yet. Please enable Google under Supabase Dashboard -> Authentication -> Providers -> Google.'
          : err?.message || 'Failed to sign in with Google via Supabase.'
      )
      setLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      // Handle Facebook OAuth strictly via Supabase Auth
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (supabaseError) throw supabaseError
    } catch (err: any) {
      console.error('Supabase Facebook sign in error:', err)
      const isProviderDisabled = err?.message?.includes('provider is not enabled') || err?.error_code === 'validation_failed'
      setError(
        isProviderDisabled
          ? 'Facebook Sign-In is not enabled in Supabase Dashboard yet. Please enable Facebook under Supabase Dashboard -> Authentication -> Providers -> Facebook.'
          : err?.message || 'Failed to sign in with Facebook via Supabase.'
      )
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
                placeholder="Minimum 6 characters"
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

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-white border border-[#E7D7A3] text-[#121110] rounded-xl font-medium text-sm hover:bg-[#FAF7ED] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={handleFacebookSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-[#1877F2] text-white rounded-xl font-medium text-sm hover:bg-[#166FE5] transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Sign up with Facebook
          </button>
        </div>

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
