import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
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
  title: 'Ruhvi.in — Fine Jewellery',
  description: 'Timeless luxury jewellery crafted for life’s precious moments.',
};

import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Suspense fallback={null}>
          <GoogleAnalytics />
          <MetaPixel />
          <MicrosoftClarity />
        </Suspense>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
                <CustomerSupportChat />
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


