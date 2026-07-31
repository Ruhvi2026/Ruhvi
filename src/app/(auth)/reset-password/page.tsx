'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, KeyRound } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const supabase = createClient()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setMessage('Your password has been successfully updated! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to update password.')
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
          <h2 className="font-serif text-2xl font-bold text-[#121110]">Set New Password</h2>
          <p className="text-xs text-[#121110]/60 mt-1">Enter your new secure password</p>
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

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#121110]/80 mb-1">New Password</label>
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

          <div>
            <label className="block text-xs font-medium text-[#121110]/80 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#E7D7A3] bg-[#FAF7ED]/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#C29831]/50 text-[#121110]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-[#1C1B1A] text-[#FAF6ED] rounded-xl font-medium text-sm hover:bg-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : (
              <>
                Update Password <KeyRound className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
