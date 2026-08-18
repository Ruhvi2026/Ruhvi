import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import '@/lib/env'; // Validate env variables on boot
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { Suspense } from 'react';
import { NotificationProvider } from '@/context/NotificationContext';
import MetaPixel from '@/components/MetaPixel';
import MicrosoftClarity from '@/components/MicrosoftClarity';
import CustomerSupportChat from '@/components/CustomerSupportChat';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import { OneSignalInit } from '@/components/OneSignalInit';
import { FcmInit } from '@/components/FcmInit';

import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/layout/ToastProvider';
import { OfflineDetector } from '@/components/layout/OfflineDetector';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'),
  title: {
    default: 'Ruhvi — Exquisite Fine Jewellery & Certified Gold',
    template: '%s | Ruhvi Jewels',
  },
  description:
    'Discover handcrafted gold, diamond, and gemstone jewellery at Ruhvi. BIS hallmarked purity, lifetime warranty, and free insured shipping across India.',
  keywords: [
    'Fine Jewellery',
    'Gold Jewellery',
    'Diamond Rings',
    'Kundan Necklace',
    'Solitaire Ring',
    'BIS Hallmarked Gold',
    'Luxury Jewellery India',
    'Ruhvi Jewellery',
  ],
  authors: [{ name: 'Ruhvi Fine Jewellery' }],
  creator: 'Ruhvi Fine Jewellery',
  publisher: 'Ruhvi Fine Jewellery',
  openGraph: {
    title: 'Ruhvi — Exquisite Fine Jewellery & Certified Gold',
    description:
      'Discover handcrafted gold, diamond, and gemstone jewellery at Ruhvi. BIS hallmarked purity and free insured shipping across India.',
    url: 'https://ruhvi.in',
    siteName: 'Ruhvi Fine Jewellery',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'Ruhvi Fine Jewellery Collection',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ruhvi — Exquisite Fine Jewellery & Certified Gold',
    description:
      'Discover handcrafted gold, diamond, and gemstone jewellery at Ruhvi.',
    images: [
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop',
    ],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'GSC_VERIFICATION_PLACEHOLDER',
  },
};

import Script from 'next/script';
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const isAdminHost =
    host === 'admin.ruhvi.in' || host.startsWith('admin.localhost');

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ruhvi Fine Jewellery',
    url: 'https://ruhvi.in',
    logo: 'https://ruhvi.in/logo.png',
    sameAs: [
      'https://instagram.com/ruhvijewels',
      'https://facebook.com/ruhvijewels',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-9876543210',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
  };

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="flex min-h-screen flex-col bg-cream-100 text-charcoal-900 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <Suspense fallback={null}>
          <GoogleAnalytics />
          <MetaPixel />
          <MicrosoftClarity />
          <OneSignalInit />
        </Suspense>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <FcmInit />
                {!isAdminHost && <Navbar />}
                <main className="flex-1">{children}</main>
                {!isAdminHost && <Footer />}
                {!isAdminHost && <CustomerSupportChat />}
                <SpeedInsights />
                <ToastProvider />
                <OfflineDetector />
              </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
