import fs from 'fs';
import path from 'path';

describe('Phase 50: Storefront Routes, CTAs, and Empty States Audit', () => {
  const rootDir = process.cwd();

  // 1. Static and Route-Group Route Verification
  describe('1. Storefront Route Destination Verification', () => {
    const verifiedRoutes = [
      { route: '/', file: 'src/app/page.tsx' },
      { route: '/products', file: 'src/app/products/page.tsx' },
      { route: '/about', file: 'src/app/about/page.tsx' },
      { route: '/blog', file: 'src/app/blog/page.tsx' },
      { route: '/contact', file: 'src/app/contact/page.tsx' },
      { route: '/faq', file: 'src/app/faq/page.tsx' },
      { route: '/jewelry-care', file: 'src/app/jewelry-care/page.tsx' },
      { route: '/size-guide', file: 'src/app/size-guide/page.tsx' },
      { route: '/account', file: 'src/app/account/page.tsx' },
      { route: '/orders', file: 'src/app/orders/page.tsx' },
      { route: '/wishlist', file: 'src/app/wishlist/page.tsx' },
      { route: '/cart', file: 'src/app/cart/page.tsx' },
      { route: '/account/wallet', file: 'src/app/account/wallet/page.tsx' },
      { route: '/referral', file: 'src/app/referral/page.tsx' },
      { route: '/support-status', file: 'src/app/support-status/page.tsx' },
      // Route group (policies)
      {
        route: '/shipping-policy',
        file: 'src/app/(policies)/shipping-policy/page.tsx',
      },
      {
        route: '/return-policy',
        file: 'src/app/(policies)/return-policy/page.tsx',
      },
      {
        route: '/cancellation-policy',
        file: 'src/app/(policies)/cancellation-policy/page.tsx',
      },
      {
        route: '/warranty-policy',
        file: 'src/app/(policies)/warranty-policy/page.tsx',
      },
      {
        route: '/privacy-policy',
        file: 'src/app/(policies)/privacy-policy/page.tsx',
      },
      {
        route: '/terms-and-conditions',
        file: 'src/app/(policies)/terms-and-conditions/page.tsx',
      },
      {
        route: '/data-deletion',
        file: 'src/app/(policies)/data-deletion/page.tsx',
      },
      // Route group (auth)
      { route: '/login', file: 'src/app/(auth)/login/page.tsx' },
      { route: '/signup', file: 'src/app/(auth)/signup/page.tsx' },
      // Dynamic routes
      {
        route: '/collections/[type]',
        file: 'src/app/collections/[type]/page.tsx',
      },
      { route: '/category/[slug]', file: 'src/app/category/[slug]/page.tsx' },
    ];

    test.each(verifiedRoutes)(
      'route $route maps to existing file $file',
      ({ file }) => {
        const fullPath = path.join(rootDir, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    );
  });

  // 2. Audit of /offers for Hardcoded Empty States
  describe('2. Audit of /offers Page', () => {
    it('detects confirmed hardcoded empty states in OffersClient.tsx', () => {
      const offersClientPath = path.join(
        rootDir,
        'src/app/offers/OffersClient.tsx'
      );
      expect(fs.existsSync(offersClientPath)).toBe(true);

      const content = fs.readFileSync(offersClientPath, 'utf8');

      // Verifies presence of hardcoded empty coupons text
      expect(content).toContain('No Active Coupons');
      expect(content).toContain('There are no active coupons right now.');
      expect(content).toContain('Check back soon for new');

      // Verifies presence of hardcoded empty flash sale text
      expect(content).toContain('No Flash Sale Items');
      expect(content).toContain('There are no discounted items right now.');
    });
  });

  // 3. Verification of /gift-guide Curated Destinations
  describe('3. Verification of /gift-guide Page', () => {
    it('verifies curated gift categories in GiftGuideClient.tsx', () => {
      const giftGuidePath = path.join(
        rootDir,
        'src/app/gift-guide/GiftGuideClient.tsx'
      );
      expect(fs.existsSync(giftGuidePath)).toBe(true);

      const content = fs.readFileSync(giftGuidePath, 'utf8');

      // Verifies presence of curated gift categories
      expect(content).toContain('Gifts For Her');
      expect(content).toContain('Gifts Under ₹15,000');
      expect(content).toContain('Anniversary Specials');
      expect(content).toContain('/collections/for-her');
      expect(content).toContain('/collections/under-15000');
      expect(content).toContain('/collections/anniversary');
      expect(content).not.toContain('No Gift Categories Available');
    });
  });

  // 4. Verification of /collections/[type] Navigation and Virtual Fallbacks
  describe('4. Verification of /collections/[type] Page', () => {
    it('verifies contextual back navigation and complete virtual fallback scope', () => {
      const collectionPagePath = path.join(
        rootDir,
        'src/app/collections/[type]/page.tsx'
      );
      expect(fs.existsSync(collectionPagePath)).toBe(true);

      const content = fs.readFileSync(collectionPagePath, 'utf8');

      // Verifies contextual back link
      expect(content).toContain('isGiftGuideOrigin');
      expect(content).toContain('Back to Gift Guide');
      expect(content).toContain('Back to All Products');

      // Confirms complete virtual fallbacks
      expect(content).toContain("type === 'new-arrivals'");
      expect(content).toContain("type === 'best-sellers'");
      expect(content).toContain("type === 'limited'");
      expect(content).toContain("type === 'for-her'");
      expect(content).toContain("type === 'under-15000'");
      expect(content).toContain("type === 'anniversary'");
    });
  });

  // 5. Audit of Global Navigation Component Link Integrity
  describe('5. Audit of Navbar and Footer Links', () => {
    it('Navbar.tsx contains valid routes and zero broken anchors', () => {
      const navbarPath = path.join(rootDir, 'src/components/layout/Navbar.tsx');
      const content = fs.readFileSync(navbarPath, 'utf8');

      // Verify essential destinations
      expect(content).toContain('href="/"');
      expect(content).toContain('href="/products"');
      expect(content).toContain('href="/wishlist"');
      expect(content).toContain('href="/cart"');
      expect(content).toContain('href="/account"');
      expect(content).toContain('href="/orders"');
      expect(content).toContain('href="/account/wallet"');
      expect(content).toContain('href="/login"');
      expect(content).toContain('href="/signup"');
      expect(content).toContain('href="/contact"');
      expect(content).toContain('href="/faq"');
      expect(content).not.toContain('href="#"');
    });

    it('Footer.tsx contains valid routes and links to /collections/for-her', () => {
      const footerPath = path.join(rootDir, 'src/components/layout/Footer.tsx');
      const content = fs.readFileSync(footerPath, 'utf8');

      // Verify essential destinations
      expect(content).toContain('href="/collections/best-sellers"');
      expect(content).toContain('href="/collections/for-her"');
      expect(content).toContain('href="/referral"');
      expect(content).toContain('href="/privacy-policy"');
      expect(content).toContain('href="/terms-and-conditions"');
      expect(content).toContain('href="/data-deletion"');
      expect(content).not.toContain('href="#"');
    });
  });
});
