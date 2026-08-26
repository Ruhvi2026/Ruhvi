'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1C1B1A;
            color: #F5F0E6;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 24px;
          }
          .card {
            max-width: 460px;
            width: 100%;
            text-align: center;
            padding: 48px 40px;
            background: #242220;
            border: 1px solid #3A352F;
            border-radius: 20px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          }
          .logo {
            font-family: 'Playfair Display', 'Georgia', serif;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.2em;
            color: #D6B36A;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .tagline {
            font-size: 10px;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #A09080;
            margin-bottom: 36px;
          }
          .heading {
            font-family: 'Playfair Display', 'Georgia', serif;
            font-size: 34px;
            font-weight: 700;
            color: #F5F0E6;
            margin-bottom: 14px;
          }
          .message {
            font-size: 14px;
            line-height: 1.7;
            color: #CFC7BA;
            margin-bottom: 36px;
          }
          .actions { display: flex; flex-direction: column; gap: 12px; }
          .retry {
            background: linear-gradient(135deg, #D6B36A, #B98A3D);
            color: #1C1B1A;
            border: none;
            border-radius: 12px;
            padding: 14px 24px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            cursor: pointer;
            transition: transform 0.15s ease, opacity 0.15s ease;
          }
          .retry:hover { transform: translateY(-1px); opacity: 0.92; }
          .home {
            color: #D6B36A;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            letter-spacing: 0.03em;
            padding: 8px;
            transition: opacity 0.15s ease;
          }
          .home:hover { opacity: 0.8; text-decoration: underline; }
        `}</style>
      </head>
      <body>
        <div className="card">
          <p className="logo">Ruhvi Jewels</p>
          <p className="tagline">Fine Jewellery</p>
          <h1 className="heading">Something went wrong</h1>
          <p className="message">
            We hit an unexpected snag while crafting this page. Please try
            again, or head back home to keep exploring our collection.
          </p>
          <div className="actions">
            <button
              type="button"
              onClick={() => (reset ? reset() : window.location.reload())}
              className="retry"
            >
              Try Again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- <a> is intentional; router may be unavailable in error boundary */}
            <a href="/" className="home">
              Return to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
