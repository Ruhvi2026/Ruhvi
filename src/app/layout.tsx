import type { Metadata, Viewport } from 'next';
import {
  Inter,
  Playfair_Display,
  Jost,
  Marcellus,
  Cormorant_Garamond,
} from 'next/font/google';
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
import { OneSignalInit } from '@/components/OneSignalInit';
import { FcmInit } from '@/components/FcmInit';

import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/layout/ToastProvider';
import { OfflineDetector } from '@/components/layout/OfflineDetector';
import { StorefrontChrome } from '@/components/layout/StorefrontChrome';
import PostHogProvider from '@/components/PostHogProvider';
import AnalyticsScripts from '@/components/AnalyticsScripts';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jost',
});

const marcellus = Marcellus({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-marcellus',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'),
  title: {
    default: 'Ruhvi — Exquisite Fine Jewellery & Gold-Plated Luxury',
    template: '%s | Ruhvi Jewels',
  },
  description:
    'Discover handcrafted premium gold-plated jewellery at Ruhvi. Anti-tarnish 22K gold plating with a 6-month color guarantee, and free insured shipping across India.',
  keywords: [
    'Fine Jewellery',
    'Gold Plated Jewellery',
    '22K Gold Plated',
    'Diamond Rings',
    'Kundan Necklace',
    'Solitaire Ring',
    'Anti-Tarnish Jewellery',
    'Luxury Jewellery India',
    'Ruhvi Jewellery',
  ],
  authors: [{ name: 'Ruhvi Fine Jewellery' }],
  creator: 'Ruhvi Fine Jewellery',
  publisher: 'Ruhvi Fine Jewellery',
  openGraph: {
    title: 'Ruhvi — Exquisite Fine Jewellery & Gold-Plated Luxury',
    description:
      'Discover handcrafted premium gold-plated jewellery at Ruhvi. Anti-tarnish 22K gold finish and free insured shipping across India.',
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
    title: 'Ruhvi — Exquisite Fine Jewellery & Gold-Plated Luxury',
    description: 'Discover handcrafted premium gold-plated jewellery at Ruhvi.',
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

export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      className={`${inter.variable} ${playfair.variable} ${jost.variable} ${marcellus.variable} ${cormorant.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-cream text-ink font-jost flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-charcoal-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-charcoal-900"
        >
          Skip to main content
        </a>
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
          <AnalyticsScripts />
          <StorefrontChrome>
            <MicrosoftClarity />
            <OneSignalInit />
          </StorefrontChrome>
        </Suspense>
        <AuthProvider>
          <PostHogProvider>
            <CartProvider>
              <WishlistProvider>
                <NotificationProvider>
                  <StorefrontChrome>
                    <FcmInit />
                    <Navbar />
                  </StorefrontChrome>
                  <main id="main-content" className="flex-1">
                    {children}
                  </main>
                  <StorefrontChrome>
                    <Footer />
                    <CustomerSupportChat />
                  </StorefrontChrome>
                  <Suspense fallback={null}>
                    <SpeedInsights />
                  </Suspense>
                  <ToastProvider />
                  <OfflineDetector />
                </NotificationProvider>
              </WishlistProvider>
            </CartProvider>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
