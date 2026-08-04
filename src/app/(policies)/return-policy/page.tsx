import React from 'react';

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="font-serif text-3xl font-bold text-stone-900 text-center">Return & Refund Policy</h1>
      
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-[#E7D7A3]/50 shadow-sm space-y-6 text-sm text-[#121110]/80 leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">1. 7-Day Return Window</h2>
          <p>We want you to love your Ruhvi jewelry. If you are not entirely satisfied, you can request a return within <strong>7 days</strong> of the delivery date. Once the 7-day window expires, we will not be able to offer a return or exchange, and any eligible Reward Coins for the purchase will be credited to your account.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">2. Conditions for Return</h2>
          <p>To be eligible for a return, the item must meet the following strictly enforced criteria:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The item must be <strong>unused, unworn, and in the exact same condition</strong> that you received it.</li>
            <li><strong>IMPORTANT: Our jewelry comes with a security tag. If this tag is broken, removed, or tampered with at any point within the 7 days, the product return is NOT applicable.</strong></li>
            <li>The item must be in its original packaging (including boxes, pouches, and certificates).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">3. How to Initiate a Return</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Log into your account and navigate to <strong>My Account &gt; Orders</strong>.</li>
            <li>Select the eligible order and click on <strong>Request Return</strong>.</li>
            <li>Select the reason for return and provide photographs of the item (showing the intact tags and condition).</li>
            <li>Once approved, our logistics partner will initiate a reverse pickup within 2-3 business days.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">4. Refund Process</h2>
          <p>Once your return is received at our warehouse, it will undergo a quality inspection. If the quality check is successful:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Prepaid Orders:</strong> The refund will be processed to your original payment method within 5-7 business days, or you can opt for an instant refund to your Ruhvi Wallet.</li>
            <li><strong>COD Orders:</strong> Refunds for Cash on Delivery orders will be issued to your Ruhvi Wallet or your provided Bank Account (via NEFT/UPI).</li>
            <li><strong>Wallet Payments:</strong> If you paid using your Ruhvi Wallet, the amount will be credited back to your Wallet.</li>
          </ul>
          <p className="italic text-xs text-stone-500 mt-2">*Note: Shipping charges and COD convenience fees paid during the original order are non-refundable.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">5. Non-Returnable Items</h2>
          <p>For hygiene and customization reasons, the following items cannot be returned:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Nose pins and nose rings.</li>
            <li>Customized, engraved, or personalized jewelry.</li>
            <li>Items purchased during a final clearance sale (will be explicitly marked as non-returnable).</li>
          </ul>
        </section>

      </div>
    </div>
  );
}
