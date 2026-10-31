import fs from 'fs';
import path from 'path';

describe('Phase 51: Repair Confirmed Broken Collection Navigation', () => {
  const rootDir = process.cwd();

  // 1. Virtual Fallback Coverage in Collection Page
  describe('1. Virtual Fallback Coverage in /collections/[type]/page.tsx', () => {
    const collectionPagePath = path.join(
      rootDir,
      'src/app/collections/[type]/page.tsx'
    );
    const content = fs.readFileSync(collectionPagePath, 'utf8');

    it('contains virtual fallbacks for high-traffic homepage banners', () => {
      expect(content).toContain("type === 'new-arrivals'");
      expect(content).toContain("type === 'best-sellers'");
      expect(content).toContain("type === 'limited'");
    });

    it('contains virtual fallbacks for canonical gift guide collections', () => {
      expect(content).toContain("type === 'for-her'");
      expect(content).toContain("type === 'under-15000'");
      expect(content).toContain("type === 'anniversary'");
    });

    it('implements under-15000 price filter in virtual query branch', () => {
      expect(content).toContain("dbCollection.virtualType === 'under_15000'");
      expect(content).toContain(".lte('price', 15000)");
    });

    it('fails gracefully with notFound() for unknown collection slugs', () => {
      expect(content).toContain('if (!collection)');
      expect(content).toContain('notFound()');
    });
  });

  // 2. Contextual Back Navigation in /collections/[type]/page.tsx
  describe('2. Contextual Back Navigation', () => {
    const collectionPagePath = path.join(
      rootDir,
      'src/app/collections/[type]/page.tsx'
    );
    const content = fs.readFileSync(collectionPagePath, 'utf8');

    it('defines isGiftGuideOrigin conditional based on collection slug', () => {
      expect(content).toContain('const isGiftGuideOrigin =');
      expect(content).toContain("type === 'for-her'");
      expect(content).toContain("type === 'under-15000'");
      expect(content).toContain("type === 'anniversary'");
    });

    it('links back to /gift-guide for gift collections and /products for general collections', () => {
      expect(content).toContain(
        "href={isGiftGuideOrigin ? '/gift-guide' : '/products'}"
      );
      expect(content).toContain(
        "isGiftGuideOrigin ? 'Back to Gift Guide' : 'Back to All Products'"
      );
    });
  });

  // 3. Informative Empty State for 0-Product Collections
  describe('3. Empty Product Collection Presentation', () => {
    const collectionPagePath = path.join(
      rootDir,
      'src/app/collections/[type]/page.tsx'
    );
    const content = fs.readFileSync(collectionPagePath, 'utf8');

    it('renders dedicated empty card with CTA when products array is empty', () => {
      expect(content).toContain('collection.products.length > 0 ?');
      expect(content).toContain('No Products Currently in this Collection');
      expect(content).toContain('Browse All Fine Jewellery');
      expect(content).toContain('href="/products"');
    });
  });

  // 4. Curated Gift Categories in /gift-guide/GiftGuideClient.tsx
  describe('4. Curated Gift Categories in /gift-guide', () => {
    const giftGuideClientPath = path.join(
      rootDir,
      'src/app/gift-guide/GiftGuideClient.tsx'
    );
    const content = fs.readFileSync(giftGuideClientPath, 'utf8');

    it('no longer renders hardcoded "No Gift Categories Available"', () => {
      expect(content).not.toContain('No Gift Categories Available');
      expect(content).not.toContain('Gift categories are being curated');
    });

    it('renders the three canonical gift collection destinations with correct hrefs', () => {
      expect(content).toContain('Gifts For Her');
      expect(content).toContain('/collections/for-her');

      expect(content).toContain('Gifts Under ₹15,000');
      expect(content).toContain('/collections/under-15000');

      expect(content).toContain('Anniversary Specials');
      expect(content).toContain('/collections/anniversary');
    });

    it('renders fallback CTA to browse all products', () => {
      expect(content).toContain('Browse Complete Catalog');
      expect(content).toContain('href="/products"');
    });
  });
});
