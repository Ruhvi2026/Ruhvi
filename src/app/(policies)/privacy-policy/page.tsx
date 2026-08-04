import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="font-serif text-3xl font-bold text-stone-900 text-center">Privacy Policy</h1>
      
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-[#E7D7A3]/50 shadow-sm space-y-6 text-sm text-[#121110]/80 leading-relaxed">
        
        <p className="font-medium">Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">1. Introduction</h2>
          <p>Welcome to Ruhvi. We respect your privacy and are committed to protecting your personal data. This Privacy Policy informs you about how we look after your personal data when you visit our website (ruhvi.in) and tells you about your privacy rights.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">2. The Data We Collect About You</h2>
          <p>We may collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, date of birth, and anniversary date.</li>
            <li><strong>Contact Data:</strong> includes billing address, delivery address, email address, and telephone numbers.</li>
            <li><strong>Financial Data:</strong> includes payment status and gateway transaction IDs. <em>Note: We do not store your credit card or raw banking details. All transactions are securely processed via PhonePe.</em></li>
            <li><strong>Transaction Data:</strong> includes details about payments to and from you and other details of products you have purchased from us.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
            <li><strong>Marketing and Communications Data:</strong> includes your preferences in receiving marketing from us and our third parties (e.g., Push Notifications, Promotional Emails).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">3. How We Use Your Personal Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Order Fulfillment:</strong> To process and deliver your order, including managing payments, fees, and charges via PhonePe, and coordinating delivery via Shiprocket.</li>
            <li><strong>Authentication:</strong> To manage your account and secure your login using Supabase and Firebase Auth (OTP verification).</li>
            <li><strong>Customer Support:</strong> To notify you about changes to our terms or privacy policy, and to provide customer service via WhatsApp.</li>
            <li><strong>Marketing & Re-engagement:</strong> To deliver relevant website content and advertisements to you via Meta Pixel and Brevo email campaigns (like abandoned cart reminders or birthday offers).</li>
            <li><strong>Security:</strong> To protect our website against malicious bots using Cloudflare Turnstile.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">4. Disclosures of Your Personal Data</h2>
          <p>We may share your personal data with the parties set out below for the purposes set out in Section 3:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Service Providers:</strong> Acting as processors who provide IT and system administration services (e.g., Supabase, Vercel).</li>
            <li><strong>Payment Gateways:</strong> Such as PhonePe for secure transaction processing.</li>
            <li><strong>Logistics Partners:</strong> Such as Shiprocket to fulfill and deliver your orders.</li>
            <li><strong>Marketing Platforms:</strong> Such as Brevo (for emails), OneSignal/FCM (for push notifications), and Meta (for targeted advertising).</li>
            <li><strong>Analytics Providers:</strong> Such as Google Analytics to monitor and analyze the use of our service.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">5. Cookies and Tracking Technologies</h2>
          <p>We use cookies, pixels (such as Meta Pixel), and similar tracking technologies to track the activity on our service and hold certain information. You can set your browser to refuse all or some browser cookies, but this may affect the functionality of our website.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">6. Data Security</h2>
          <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-[#121110]">7. Your Legal Rights</h2>
          <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data. These include the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Request access to your personal data.</li>
            <li>Request correction of your personal data.</li>
            <li>Request erasure of your personal data (Account deletion).</li>
            <li>Withdraw consent for marketing communications.</li>
          </ul>
          <p>To exercise any of these rights, please contact us.</p>
        </section>

        <section className="space-y-3 pt-4 border-t border-[#E7D7A3]/50">
          <h2 className="text-xl font-serif font-bold text-[#121110]">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or our privacy practices, please contact us at:</p>
          <p className="font-semibold mt-2">Ruhvi Support</p>
          <p>Email: privacy@ruhvi.in</p>
        </section>

      </div>
    </div>
  );
}
