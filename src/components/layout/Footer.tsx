'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-purple-950 text-purple-200 pt-12 pb-8 border-t border-purple-900">
      {/* Brand Reassurance Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-purple-900/60 border border-purple-800/50">
          <div className="flex items-center space-x-3">
            <Award className="w-8 h-8 text-fuchsia-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">22K Gold Plated</h4>
              <p className="text-[11px] text-purple-300">Anti-Tarnish & Water Resistant</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Truck className="w-8 h-8 text-fuchsia-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Insured Shipping</h4>
              <p className="text-[11px] text-purple-300">Tamper-proof transit packaging</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <RotateCcw className="w-8 h-8 text-fuchsia-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Easy Returns</h4>
              <p className="text-[11px] text-purple-300">7-day hassle-free return policy</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-fuchsia-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">6-Month Color Guarantee</h4>
              <p className="text-[11px] text-purple-300">On all gold plated pieces</p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter / WhatsApp Capture */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="bg-gradient-to-r from-fuchsia-900 to-purple-900 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between border border-fuchsia-800/50 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl"></div>
          
          <div className="md:w-1/2 mb-8 md:mb-0 relative z-10">
            <h3 className="font-serif text-3xl font-bold text-fuchsia-50 mb-3">
              Join the Inner Circle
            </h3>
            <p className="text-fuchsia-200/80 text-sm">
              Subscribe to get 10% off your first purchase. Receive early access to new collections and exclusive VIP offers via Email or WhatsApp.
            </p>
          </div>
          
          <div className="md:w-1/2 w-full max-w-md relative z-10">
            <form className="flex flex-col space-y-3" onSubmit={(e) => { e.preventDefault(); alert('Subscribed!'); }}>
              <div className="flex bg-purple-950/50 rounded-xl border border-fuchsia-800/50 overflow-hidden focus-within:border-fuchsia-500 transition-colors">
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-purple-400 outline-none"
                  required
                />
                <button type="submit" className="bg-fuchsia-100 hover:bg-white text-fuchsia-900 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors">
                  Subscribe
                </button>
              </div>
              <div className="flex items-center space-x-2 pl-1">
                <input type="checkbox" id="whatsapp-optin" defaultChecked className="w-3 h-3 rounded-sm text-fuchsia-600 focus:ring-fuchsia-500 bg-purple-900 border-purple-700" />
                <label htmlFor="whatsapp-optin" className="text-[10px] text-fuchsia-200/60 uppercase tracking-widest cursor-pointer">
                  Also send me updates on WhatsApp
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-purple-800">
        <div>
          <h3 className="font-serif text-2xl font-bold tracking-widest text-fuchsia-400 uppercase mb-3">
            Ruhvi
          </h3>
          <p className="text-xs text-purple-300 leading-relaxed mb-4">
            Curating timeless elegance with modern Indian heritage craftsmanship. Premium Gold, Diamond, and Kundan jewellery designed for life&apos;s special moments.
          </p>
          <p className="text-xs text-fuchsia-200">Email: care@ruhvi.in</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
            Customer Care
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/size-guide" className="hover:text-fuchsia-300 transition-colors">
                Ring & Bangle Size Guide
              </Link>
            </li>
            <li>
              <Link href="/jewelry-care" className="hover:text-fuchsia-300 transition-colors">
                Jewelry Care & Cleaning Guide
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-fuchsia-300 transition-colors">
                Read our Blog
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-fuchsia-300 transition-colors">
                FAQ & Help Center
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-fuchsia-300 transition-colors">
                About Ruhvi
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-fuchsia-300 transition-colors">
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
              <Link href="/shipping-policy" className="hover:text-fuchsia-300 transition-colors">
                Shipping & Delivery Policy
              </Link>
            </li>
            <li>
              <Link href="/return-policy" className="hover:text-fuchsia-300 transition-colors">
                Return & Refund Policy
              </Link>
            </li>
            <li>
              <Link href="/cancellation-policy" className="hover:text-fuchsia-300 transition-colors">
                Cancellation Policy
              </Link>
            </li>
            <li>
              <Link href="/warranty-policy" className="hover:text-fuchsia-300 transition-colors">
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
              <Link href="/privacy-policy" className="hover:text-fuchsia-300 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-and-conditions" className="hover:text-fuchsia-300 transition-colors">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 text-center text-xs text-purple-400">
        © {new Date().getFullYear()} Ruhvi Jewellery Pvt Ltd. All rights reserved.
      </div>
    </footer>
  );
}

