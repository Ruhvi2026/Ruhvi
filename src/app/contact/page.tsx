import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Contact Concierge</h1>
        <p className="text-xs text-stone-500 mt-2">
          We are here to assist with custom orders, sizing queries, and purchase assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-900">Get in Touch</h2>

          <div className="space-y-4 text-xs text-stone-700">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-amber-700" />
              <span>care@ruhvi.in</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-amber-700" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-amber-700" />
              <span>Monday – Saturday: 10:00 AM – 7:00 PM IST</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-amber-700" />
              <span>Ruhvi Fine Jewellery Pvt Ltd, Mumbai, Maharashtra, India</span>
            </div>
          </div>
        </div>

        <form className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="font-serif text-xl font-bold text-stone-900">Send Us a Message</h2>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Your Name</label>
            <input type="text" required className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
            <input type="email" required className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Message</label>
            <textarea rows={3} required className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-amber-950 text-white text-xs font-semibold uppercase tracking-wider rounded-lg">
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
