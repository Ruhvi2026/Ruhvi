import React from 'react';

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="font-serif text-3xl font-bold text-stone-900 text-center">Frequently Asked Questions</h1>
      
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-[#E7D7A3]/50 shadow-sm space-y-8 text-sm text-[#121110]/80 leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">Orders & Shipping</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#121110]">How much does shipping cost?</h3>
              <p>We offer free standard shipping on all orders above ₹500. For orders below ₹500, a flat shipping fee of ₹49 is applied. If you choose Cash on Delivery (COD), an additional COD convenience charge of ₹49 will apply.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#121110]">How long does delivery take?</h3>
              <p>Orders are dispatched within 1-2 business days. Standard delivery usually takes 3-7 business days depending on your location.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#121110]">How can I track my order?</h3>
              <p>Once dispatched, you will receive an AWB tracking number via email and WhatsApp. You can also track your order directly from the "My Orders" section of your account.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">Returns & Cancellations</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#121110]">Can I return an item if I don't like it?</h3>
              <p>Yes! We have a 7-day return policy. The jewelry must be completely unworn, unused, and have the original security tags intact and uncut.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#121110]">Can I cancel my order?</h3>
              <p>You can cancel your order at any time before it is shipped. Once the order status is "Shipped", it cannot be cancelled, but you can request a return after delivery.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">Rewards & Wallet</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#121110]">How do Reward Coins work?</h3>
              <p>You earn Reward Coins on purchases (usually 10% of the item value). These coins are credited to your account 7 days after delivery (once the return window closes). 10 Coins = ₹1. You need a minimum order of ₹250 to redeem coins on future purchases.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#121110]">Can I transfer my Wallet balance to my bank account?</h3>
              <p>No, the Ruhvi Wallet is a closed-loop promotional wallet. Balances can only be used for purchases on Ruhvi.in and cannot be withdrawn to a bank account.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 pt-4 border-t border-[#E7D7A3]/50">
          <h2 className="text-xl font-serif font-bold text-[#121110]">Still have questions?</h2>
          <p>We're here to help! Reach out to us at <strong>support@ruhvi.in</strong> or via our Contact Us page.</p>
        </section>

      </div>
    </div>
  );
}
