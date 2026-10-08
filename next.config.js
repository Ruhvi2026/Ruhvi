/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'firebase/auth',
      'firebase/app',
      '@tiptap/react',
      'recharts',
    ],
    instrumentationHook: true,
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.externals = config.externals || [];
      config.externals.push({
        '@opentelemetry/api': 'commonjs @opentelemetry/api',
        '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
        '@opentelemetry/exporter-trace-otlp-http':
          'commonjs @opentelemetry/exporter-trace-otlp-http',
        '@opentelemetry/resources': 'commonjs @opentelemetry/resources',
        '@opentelemetry/semantic-conventions':
          'commonjs @opentelemetry/semantic-conventions',
        '@opentelemetry/instrumentation-http':
          'commonjs @opentelemetry/instrumentation-http',
        '@opentelemetry/instrumentation-express':
          'commonjs @opentelemetry/instrumentation-express',
        '@opentelemetry/instrumentation-undici':
          'commonjs @opentelemetry/instrumentation-undici',
      });
    }
    return config;
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
