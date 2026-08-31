/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  async headers() {
    const publicPageCache = {
      key: 'Cache-Control',
      value:
        'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    };
    const noStore = {
      key: 'Cache-Control',
      value: 'no-store',
    };

    return [
      // Personalized / authenticated routes — never cache, so no stale
      // personalized content leaks between users.
      { source: '/account/:path*', headers: [noStore] },
      { source: '/admin/:path*', headers: [noStore] },
      { source: '/cart', headers: [noStore] },
      { source: '/checkout', headers: [noStore] },
      { source: '/orders/:path*', headers: [noStore] },
      { source: '/order-success/:orderId', headers: [noStore] },
      { source: '/tracking/:orderId', headers: [noStore] },
      { source: '/wishlist/:path*', headers: [noStore] },
      { source: '/support-status', headers: [noStore] },
      { source: '/support/:path*', headers: [noStore] },
      { source: '/operations/:path*', headers: [noStore] },
      { source: '/marketing/:path*', headers: [noStore] },
      { source: '/portal-orders/:path*', headers: [noStore] },
      { source: '/login', headers: [noStore] },
      { source: '/signup', headers: [noStore] },
      { source: '/set-password', headers: [noStore] },
      { source: '/reset-password', headers: [noStore] },
      { source: '/forgot-password', headers: [noStore] },
      { source: '/complete-profile', headers: [noStore] },

      // Public, non-personalized pages — CDN-cacheable.
      { source: '/', headers: [publicPageCache] },
      { source: '/about', headers: [publicPageCache] },
      { source: '/blog', headers: [publicPageCache] },
      { source: '/blog/:slug', headers: [publicPageCache] },
      { source: '/category/:slug', headers: [publicPageCache] },
      { source: '/collections', headers: [publicPageCache] },
      { source: '/collections/:type', headers: [publicPageCache] },
      { source: '/contact', headers: [publicPageCache] },
      { source: '/faq', headers: [publicPageCache] },
      { source: '/gift-guide', headers: [publicPageCache] },
      { source: '/jewelry-care', headers: [publicPageCache] },
      { source: '/offers', headers: [publicPageCache] },
      { source: '/products', headers: [publicPageCache] },
      { source: '/products/:slug', headers: [publicPageCache] },
      { source: '/referral', headers: [publicPageCache] },
      { source: '/size-guide', headers: [publicPageCache] },
      { source: '/testimonials', headers: [publicPageCache] },
      { source: '/privacy-policy', headers: [publicPageCache] },
      { source: '/terms-and-conditions', headers: [publicPageCache] },
      { source: '/shipping-policy', headers: [publicPageCache] },
      { source: '/return-policy', headers: [publicPageCache] },
      { source: '/warranty-policy', headers: [publicPageCache] },
      { source: '/cancellation-policy', headers: [publicPageCache] },
      { source: '/data-deletion', headers: [publicPageCache] },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'igrkrkxdantrolbldapj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

module.exports = nextConfig;

// Injected content via Sentry wizard below

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'ruhvi-jewels',
  project: 'javascript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
