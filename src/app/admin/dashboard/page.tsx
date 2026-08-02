'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Package, 
  Plus, 
  TrendingUp, 
  BarChart3, 
  ShoppingCart, 
  Tag, 
  Megaphone,
  Star,
  FileText, 
  Users, 
  Database, 
  AlertTriangle, 
  Shield, 
  LogOut,
  ArrowRight,
  RefreshCw,
  Gift
} from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-[#FAF6ED] flex flex-col pb-16">
      {/* Header */}
      <header className="bg-[#1C1B1A] text-[#FAF6ED] px-6 py-4 flex items-center justify-between border-b border-[#E7D7A3]/30 shadow-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#E7D7A3]" />
          <span className="font-serif text-xl font-bold tracking-wider text-[#E7D7A3]">RUHVI ADMIN CONSOLE</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#FAF6ED]/70 hidden sm:inline">
            Logged in as <strong className="text-[#E7D7A3]">Admin</strong> (ADMINISTRATOR)
          </span>
          <Link
            href="/"
            className="flex items-center gap-1 bg-[#FAF6ED]/10 px-3 py-1.5 rounded-lg hover:bg-[#FAF6ED]/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10 w-full">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-amber-100 rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Store Control Active</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">Ruhvi Management System</h1>
            <p className="text-xs text-stone-300 mt-1 max-w-xl">
              Access product management, marketing campaigns, revenue analytics, and inventory operations.
            </p>
          </div>

          <div className="flex space-x-3">
            <Link 
              href="/admin/products/new"
              className="px-5 py-2.5 bg-amber-400 text-amber-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-amber-300 transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </Link>
          </div>
        </div>

        {/* 4 Main Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Category 1: Product Manager */}
          <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">1. Product Manager</h2>
                  <p className="text-xs text-stone-500">Catalog, pricing, visibility & SKU stock controls</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <Link href="/admin/products/new" className="p-3 bg-stone-50 hover:bg-amber-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-amber-900" />
                    <span>Add New Product</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/products" className="p-3 bg-stone-50 hover:bg-amber-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-amber-900" />
                    <span>Edit / Delete Catalog</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/categories" className="p-3 bg-stone-50 hover:bg-amber-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-amber-900" />
                    <span>Category Manager</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/collections" className="p-3 bg-stone-50 hover:bg-amber-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-amber-900" />
                    <span>Collection Manager</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/reports/inventory" className="p-3 bg-stone-50 hover:bg-amber-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Mark Out of Stock</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/products" className="p-3 bg-stone-50 hover:bg-amber-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-stone-600" />
                    <span>Hide / Draft Toggle</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Category 2: Marketing */}
          <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">2. Marketing & Growth</h2>
                  <p className="text-xs text-stone-500">Coupons, banners, blog, UGC & push channels</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <Link href="/blog" className="p-3 bg-stone-50 hover:bg-rose-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-rose-700" />
                    <span>Blog & Editorial Journal</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/offers" className="p-3 bg-stone-50 hover:bg-rose-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-rose-700" />
                    <span>Coupon & Discount Rules</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/gift-guide" className="p-3 bg-stone-50 hover:bg-rose-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Gift className="w-4 h-4 text-rose-700" />
                    <span>Banners & Collections</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/reports/coupons-referrals" className="p-3 bg-stone-50 hover:bg-rose-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-rose-700" />
                    <span>WhatsApp / Email Opt-ins</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Category 3: Analytics */}
          <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">3. Analytics & Revenue</h2>
                  <p className="text-xs text-stone-500">Sales reports, best-sellers & cart recovery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <Link href="/admin/reports/sales" className="p-3 bg-stone-50 hover:bg-indigo-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-indigo-700" />
                    <span>Sales & Revenue Reports</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/reports/sales" className="p-3 bg-stone-50 hover:bg-indigo-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-indigo-700" />
                    <span>Best-Selling Products</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/reports/abandoned-carts" className="p-3 bg-stone-50 hover:bg-indigo-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <ShoppingCart className="w-4 h-4 text-indigo-700" />
                    <span>Abandoned Cart Recovery</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/reports/sales" className="p-3 bg-stone-50 hover:bg-indigo-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-indigo-700" />
                    <span>Customer Insights & AOV</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Category 4: Inventory & Operations */}
          <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">4. Inventory & Operations</h2>
                  <p className="text-xs text-stone-500">Bulk CSV updates, order status & staff logs</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <Link href="/admin/reports/inventory" className="p-3 bg-stone-50 hover:bg-emerald-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-emerald-800" />
                    <span>Inventory & Low Stock</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/tools/bulk-management" className="p-3 bg-stone-50 hover:bg-emerald-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-800" />
                    <span>Bulk CSV Import / Export</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/orders" className="p-3 bg-stone-50 hover:bg-emerald-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 text-emerald-800" />
                    <span>Order Status & Fulfillment</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/admin/security/audit-logs" className="p-3 bg-stone-50 hover:bg-emerald-50/50 rounded-xl border border-stone-200/60 font-semibold text-stone-800 flex items-center justify-between group transition-colors">
                  <span className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-800" />
                    <span>Staff Activity & Audit Logs</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
