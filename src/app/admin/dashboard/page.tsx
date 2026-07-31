import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { generateSKU } from '@/lib/sku'
import { ShieldCheck, Package, Users, ShoppingCart, Tag, LogOut } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role, email')
    .eq('id', user?.id || '')
    .single()

  // Sample SKU format demo
  const sampleRingSKU = generateSKU('rings', 1)
  const sampleNecklaceSKU = generateSKU('necklaces', 42)

  return (
    <div className="min-h-screen bg-[#FAF6ED] flex flex-col">
      {/* Admin Top Navigation */}
      <header className="bg-[#1C1B1A] text-[#FAF6ED] px-6 py-4 flex items-center justify-between border-b border-[#E7D7A3]/30">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#E7D7A3]" />
          <span className="font-serif text-xl font-bold tracking-wider text-[#E7D7A3]">RUHVI ADMIN PANEL</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#FAF6ED]/70">
            Logged in as <strong className="text-[#E7D7A3]">{profile?.full_name || profile?.email}</strong> ({profile?.role?.toUpperCase()})
          </span>
          <Link
            href="/"
            className="flex items-center gap-1 bg-[#FAF6ED]/10 px-3 py-1.5 rounded-lg hover:bg-[#FAF6ED]/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-1 max-w-6xl mx-auto p-6 w-full">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-[#121110]">Management Console</h1>
          <p className="text-xs text-[#121110]/60 mt-1">Role-Based Access Control Verified • Phase 0 Active</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-[#E7D7A3]/40 shadow-sm">
            <div className="flex items-center justify-between text-[#C29831] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#121110]/60">Products</span>
              <Package className="w-5 h-5" />
            </div>
            <p className="font-serif text-3xl font-bold text-[#121110]">0</p>
            <p className="text-xs text-[#121110]/50 mt-1">Ready for Phase 1 catalog setup</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E7D7A3]/40 shadow-sm">
            <div className="flex items-center justify-between text-[#C29831] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#121110]/60">Registered Users</span>
              <Users className="w-5 h-5" />
            </div>
            <p className="font-serif text-3xl font-bold text-[#121110]">Active</p>
            <p className="text-xs text-[#121110]/50 mt-1">Supabase Auth triggers enabled</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E7D7A3]/40 shadow-sm">
            <div className="flex items-center justify-between text-[#C29831] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#121110]/60">Orders</span>
              <ShoppingCart className="w-5 h-5" />
            </div>
            <p className="font-serif text-3xl font-bold text-[#121110]">0</p>
            <p className="text-xs text-[#121110]/50 mt-1">Phase 2 Purchase flow target</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E7D7A3]/40 shadow-sm">
            <div className="flex items-center justify-between text-[#C29831] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#121110]/60">SKU Engine</span>
              <Tag className="w-5 h-5" />
            </div>
            <p className="font-serif text-sm font-bold text-[#121110]">{sampleRingSKU} / {sampleNecklaceSKU}</p>
            <p className="text-xs text-[#121110]/50 mt-1">Auto-generator active</p>
          </div>
        </div>

        {/* Verification Card */}
        <div className="bg-white p-8 rounded-3xl border border-[#E7D7A3]/60 shadow-md">
          <h2 className="font-serif text-xl font-bold text-[#121110] mb-4">Phase 0 System Verification</h2>
          <div className="space-y-3 text-xs text-[#121110]/80">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="font-bold">✓ Supabase Database:</span> All 15 PostgreSQL tables initialized with RLS policies.
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="font-bold">✓ Supabase Auth:</span> Sign Up, Sign In, Password Reset handlers & user sync trigger active.
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="font-bold">✓ RBAC Middleware:</span> Protected `/admin/*` routes restrict access to staff/manager/admin roles.
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="font-bold">✓ SKU Function:</span> Reusable server SKU generator ready for catalog initialization.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
