import { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions | Ruhvi Jewels',
  description:
    'Instructions on how users can request deletion of their data and Facebook / Meta account data from Ruhvi Jewels.',
  alternates: { canonical: '/data-deletion' },
};

const EFFECTIVE_DATE = 'July 1, 2026';

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          User Data Deletion Instructions
        </h1>
        <p className="text-sm text-stone-600">
          Facebook & Meta Platform Data Deletion Policy for Ruhvi Jewels
        </p>
      </div>

      <div className="space-y-8 rounded-2xl border border-gold-200/50 bg-white p-6 text-sm leading-relaxed text-charcoal-900/80 shadow-sm sm:p-10">
        <div>
          <p className="font-medium text-stone-700">
            Effective Date: {EFFECTIVE_DATE}
          </p>
          <p className="mt-3">
            At <strong>Ruhvi Jewels</strong> (operated at{' '}
            <span className="font-medium text-gold-700">ruhvi.in</span>
            ), we deeply value your privacy and are committed to full compliance
            with Meta's Platform Data Protection Terms, General Data Protection
            Regulation (GDPR), and India's Digital Personal Data Protection Act
            (DPDPA), 2023.
          </p>
          <p className="mt-2">
            If you have signed up or logged into Ruhvi Jewels using Facebook /
            Meta Login or interacted with our platform, you have the right to
            request the complete deletion of all personal data, Facebook
            identifiers, and associated records collected by our service.
          </p>
        </div>

        {/* Section 1: How to remove Ruhvi data via Facebook */}
        <section className="space-y-4 rounded-xl border border-stone-200 bg-champagne-100/60 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-gold-600" />
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              Method 1: Remove via Facebook / Meta Settings
            </h2>
          </div>
          <p className="text-xs text-stone-700">
            You can remove Ruhvi Jewels' access to your Facebook data at any
            time directly within your Facebook account settings:
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-xs text-stone-700">
            <li>
              Log into your Facebook account and go to{' '}
              <strong>Settings & Privacy &gt; Settings</strong>.
            </li>
            <li>
              Scroll down to the <strong>Permissions</strong> section and click
              on <strong>Apps and Websites</strong>.
            </li>
            <li>
              Find and select <strong>Ruhvi Jewels</strong> (or Ruhvi).
            </li>
            <li>
              Click the <strong>Remove</strong> button to revoke access.
            </li>
            <li>
              Optionally check the box asking Facebook to delete your past
              activity with the app and confirm by clicking{' '}
              <strong>Remove</strong>.
            </li>
          </ol>
        </section>

        {/* Section 2: Direct request to Ruhvi */}
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 flex-shrink-0 text-gold-600" />
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              Method 2: Submit a Data Deletion Request Directly to Ruhvi
            </h2>
          </div>
          <p className="text-xs text-stone-700">
            If you wish for us to permanently erase all records (including your
            order logs, profile info, address records, and associated Facebook
            IDs) from our active databases and backup queues:
          </p>
          <div className="space-y-3">
            <div className="rounded-lg bg-stone-50 p-4 text-xs">
              <p className="font-semibold text-stone-900">
                1. Send an email to our Data Protection Support Team:
              </p>
              <p className="mt-1 font-mono text-gold-800">
                <strong>Email:</strong> support@ruhvi.in
              </p>
              <p className="font-mono text-gold-800">
                <strong>Subject Line:</strong> Meta Data Deletion Request -
                [Your Name / Registered Email]
              </p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 text-xs">
              <p className="font-semibold text-stone-900">
                2. Information to include in your message:
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-stone-600">
                <li>Your registered Full Name</li>
                <li>
                  Your registered Email Address or Phone Number used for login
                </li>
                <li>
                  Your Facebook User ID (optional, but speeds up processing)
                </li>
                <li>
                  A clear statement:{' '}
                  <em>
                    "I request permanent deletion of all my personal and Meta
                    account data from Ruhvi Jewels."
                  </em>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: In-App deletion */}
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold text-charcoal-900">
            Method 3: In-App Self-Service Deletion
          </h2>
          <p className="text-xs text-stone-700">
            If you have an active logged-in session, you can trigger an account
            erasure request directly from your{' '}
            <Link
              href="/account"
              className="font-semibold text-gold-700 underline hover:text-gold-900"
            >
              Account Overview Dashboard
            </Link>
            . Scroll to the <strong>Account Danger Zone</strong> at the bottom
            of the page and click <strong>Delete My Account</strong>.
          </p>
        </section>

        {/* Section 4: What happens after request */}
        <section className="space-y-3 border-t border-gold-200/50 pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              What Happens Next & Timelines
            </h2>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-xs text-stone-700">
            <li>
              <strong>Acknowledgment:</strong> We acknowledge all deletion
              requests within <strong>48 hours</strong> of receipt and provide a
              unique tracking reference code.
            </li>
            <li>
              <strong>Execution:</strong> Your personal profile, shipping
              addresses, Meta identifier links, and non-essential analytical
              records are permanently wiped from our primary database within{' '}
              <strong>30 days</strong>.
            </li>
            <li>
              <strong>Statutory Retention Exceptions:</strong> As required by
              applicable Indian laws (e.g. GST, tax, and consumer protection
              statutes), certain anonymized financial transaction records may be
              retained strictly for statutory audit purposes only.
            </li>
          </ul>
        </section>

        {/* Section 5: Grievance Officer & Contact */}
        <section className="space-y-3 border-t border-gold-200/50 pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-gold-600" />
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              Questions & Grievance Contact
            </h2>
          </div>
          <p className="text-xs text-stone-700">
            If you have any questions or require real-time status of a deletion
            request, contact our Grievance & Compliance Team:
          </p>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-800">
            <p>
              <strong>Organization:</strong> Ruhvi Jewels
            </p>
            <p>
              <strong>Email:</strong> support@ruhvi.in
            </p>
            <p>
              <strong>Website:</strong>{' '}
              <a
                href="https://ruhvi.in"
                target="_blank"
                rel="noreferrer"
                className="text-gold-700 underline"
              >
                https://ruhvi.in
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
