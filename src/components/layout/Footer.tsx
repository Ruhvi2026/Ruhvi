'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-12 pb-8 border-t border-stone-800">
      {/* Brand Reassurance Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-stone-800/60 border border-stone-700/50">
          <div className="flex items-center space-x-3">
            <Award className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Certified</h4>
              <p className="text-[11px] text-stone-400">BIS Hallmarked & VVS Gold</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Truck className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Insured Shipping</h4>
              <p className="text-[11px] text-stone-400">Tamper-proof transit packaging</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <RotateCcw className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Easy Returns</h4>
              <p className="text-[11px] text-stone-400">7-day hassle-free return policy</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Lifetime Exchange</h4>
              <p className="text-[11px] text-stone-400">Guaranteed buyback & upgrade</p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter / WhatsApp Capture */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-gradient-to-r from-amber-900 to-stone-800 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between border border-amber-800/50 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
          
          <div className="md:w-1/2 mb-8 md:mb-0 relative z-10">
            <h3 className="font-serif text-3xl font-bold text-amber-50 mb-3">
              Join the Inner Circle
            </h3>
            <p className="text-amber-200/80 text-sm">
              Subscribe to get 10% off your first purchase. Receive early access to new collections and exclusive VIP offers via Email or WhatsApp.
            </p>
          </div>
          
          <div className="md:w-1/2 w-full max-w-md relative z-10">
            <form className="flex flex-col space-y-3" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!'); }}>
              <div className="flex bg-stone-900/50 rounded-xl border border-amber-800/50 overflow-hidden focus-within:border-amber-500 transition-colors">
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-stone-400 outline-none"
                  required
                />
                <button type="submit" className="bg-amber-100 hover:bg-white text-amber-900 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors">
                  Subscribe
                </button>
              </div>
              <div className="flex items-center space-x-2 pl-1">
                <input type="checkbox" id="whatsapp-optin" className="w-3 h-3 rounded-sm text-amber-600 focus:ring-amber-500 bg-stone-900 border-stone-700" />
                <label htmlFor="whatsapp-optin" className="text-[10px] text-amber-200/60 uppercase tracking-widest cursor-pointer">
                  Also send me updates on WhatsApp
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-stone-800">
        <div>
          <h3 className="font-serif text-2xl font-bold tracking-widest text-amber-400 uppercase mb-3">
            Ruhvi
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed mb-4">
            Curating timeless elegance with modern Indian heritage craftsmanship. Premium Gold, Diamond, and Kundan jewellery designed for life&apos;s special moments.
          </p>
          <p className="text-xs text-amber-200">Email: care@ruhvi.in</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Customer Care
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/size-guide" className="hover:text-amber-300 transition-colors">
                Ring & Bangle Size Guide
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-amber-300 transition-colors">
                About Ruhvi
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-amber-300 transition-colors">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Store Policies
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/shipping-policy" className="hover:text-amber-300 transition-colors">
                Shipping & Delivery Policy
              </Link>
            </li>
            <li>
              <Link href="/return-policy" className="hover:text-amber-300 transition-colors">
                Return & Refund Policy
              </Link>
            </li>
            <li>
              <Link href="/cancellation-policy" className="hover:text-amber-300 transition-colors">
                Cancellation Policy
              </Link>
            </li>
            <li>
              <Link href="/warranty-policy" className="hover:text-amber-300 transition-colors">
                Warranty & Repair Policy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Legal & Privacy
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/privacy-policy" className="hover:text-amber-300 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-and-conditions" className="hover:text-amber-300 transition-colors">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Ruhvi Jewellery Pvt Ltd. All rights reserved.
      </div>
    </footer>
  );
}
