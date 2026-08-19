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
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
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
  const isSupportHost =
    host === 'support.ruhvi.in' || host.startsWith('support.localhost');
  const isAuthHost =
    host === 'auth.ruhvi.in' || host.startsWith('auth.localhost');
  const isOperationsHost =
    host === 'operation.ruhvi.in' || host.startsWith('operation.localhost');
  const isMarketingHost =
    host === 'marketing.ruhvi.in' || host.startsWith('marketing.localhost');
  const isOrdersHost =
    host === 'orders.ruhvi.in' || host.startsWith('orders.localhost');

  const isSystemSubdomain =
    isAdminHost ||
    isSupportHost ||
    isAuthHost ||
    isOperationsHost ||
    isMarketingHost ||
    isOrdersHost;

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
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-cream-100 text-charcoal-900 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var root = document.documentElement;
                  root.classList.remove('dark', 'light');
                  var activeTheme = theme;
                  if (theme === 'system') {
                    var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    activeTheme = systemPrefersDark ? 'dark' : 'light';
                  }
                  if (activeTheme === 'dark') {
                    root.classList.add('dark');
                  } else {
                    root.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
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
                {!isSystemSubdomain && <Navbar />}
                <main className="flex-1">{children}</main>
                {!isSystemSubdomain && <Footer />}
                {!isSystemSubdomain && <CustomerSupportChat />}
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
