'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.session) {
        setMessage('Account created successfully! Redirecting...')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1000)
      } else {
        setMessage('Check your email inbox for the confirmation link to activate your account.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF6ED] px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E7D7A3]/50 rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-[#C29831]" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#121110]">RUHVI</span>
          </Link>
          <h2 className="font-serif text-2xl font-bold text-[#121110]">Create Your Account</h2>
          <p className="text-xs text-[#121110]/60 mt-1">Join the Ruhvi Fine Jewellery Club</p>
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

        <form onSubmit={handleSignUp} className="space-y-4">
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
