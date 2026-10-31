import {
  isTestProduct,
  isTestBlogPost,
  normalizeBlogTitle,
  filterPublicProducts,
  filterPublicBlogPosts,
  EXCLUDED_TEST_PRODUCT_SLUGS,
  EXCLUDED_TEST_BLOG_SLUGS,
} from '../content-isolation';

describe('Public Content Integrity & Test Isolation (Phase 54)', () => {
  describe('isTestProduct', () => {
    it('detects confirmed test product slugs and identifiers', () => {
      expect(isTestProduct('finale-test')).toBe(true);
      expect(isTestProduct('testing')).toBe(true);
      expect(isTestProduct('test-product')).toBe(true);
      expect(isTestProduct('test-ring')).toBe(true);
      expect(isTestProduct('test-necklace')).toBe(true);
      expect(isTestProduct('test')).toBe(true);
      expect(isTestProduct('demo-test')).toBe(true);
      expect(isTestProduct('test-sample')).toBe(true);
    });

    it('detects confirmed test product titles regardless of casing and whitespace', () => {
      expect(isTestProduct(undefined, 'finale test')).toBe(true);
      expect(isTestProduct(undefined, 'Testing ')).toBe(true);
      expect(isTestProduct(undefined, 'test product')).toBe(true);
      expect(isTestProduct(undefined, 'TEST RING')).toBe(true);
      expect(isTestProduct(undefined, '  test item  ')).toBe(true);
    });

    it('allows genuine luxury products to pass cleanly', () => {
      expect(
        isTestProduct('eternal-radiance-ring', 'Eternal Radiance Ring')
      ).toBe(false);
      expect(
        isTestProduct(
          'moonlit-elegance-necklace',
          'Moonlit Elegance Gold Necklace'
        )
      ).toBe(false);
      expect(
        isTestProduct('twilight-blooms-earrings', 'Twilight Blooms Studs')
      ).toBe(false);
      expect(
        isTestProduct('royal-heritage-bangle', 'Royal Heritage 22K Bangle')
      ).toBe(false);
      expect(
        isTestProduct(
          'vvs-solitaire-pendant',
          'VVS Certified Solitaire Pendant'
        )
      ).toBe(false);
    });

    it('handles null, undefined, and empty strings safely', () => {
      expect(isTestProduct(null, null)).toBe(false);
      expect(isTestProduct(undefined, undefined)).toBe(false);
      expect(isTestProduct('', '')).toBe(false);
    });
  });

  describe('isTestBlogPost', () => {
    it('detects confirmed test blog slugs', () => {
      expect(isTestBlogPost('test-blog')).toBe(true);
      expect(isTestBlogPost('draft-post')).toBe(true);
      expect(isTestBlogPost('test-article')).toBe(true);
      expect(isTestBlogPost('draft-test')).toBe(true);
    });

    it('detects confirmed test blog titles regardless of casing and whitespace', () => {
      expect(isTestBlogPost(undefined, 'test blog')).toBe(true);
      expect(isTestBlogPost(undefined, 'Test Post')).toBe(true);
      expect(isTestBlogPost(undefined, '  draft post  ')).toBe(true);
    });

    it('allows genuine journal articles to pass cleanly', () => {
      expect(
        isTestBlogPost('art-of-gold-crafting', 'The Art of Gold Crafting')
      ).toBe(false);
      expect(
        isTestBlogPost(
          'diamond-clarity-guide',
          'Understanding VVS Solitaire Clarity'
        )
      ).toBe(false);
      expect(
        isTestBlogPost(
          'anti-tarnish-guide',
          'Benefits of Anti-Tarnish E-Coating'
        )
      ).toBe(false);
    });

    it('handles null, undefined, and empty strings safely', () => {
      expect(isTestBlogPost(null, null)).toBe(false);
      expect(isTestBlogPost(undefined, undefined)).toBe(false);
      expect(isTestBlogPost('', '')).toBe(false);
    });
  });

  describe('normalizeBlogTitle', () => {
    it('normalizes common editorial typos like "Benifits" -> "Benefits"', () => {
      expect(normalizeBlogTitle('Benifits of 22K Gold Plated Jewellery')).toBe(
        'Benefits of 22K Gold Plated Jewellery'
      );
      expect(normalizeBlogTitle('Top 5 benifits of daily wear rings')).toBe(
        'Top 5 benefits of daily wear rings'
      );
    });

    it('preserves already accurate titles without mutation', () => {
      const accurateTitle = 'The Craftsmanship Behind Ruhvi Solitaires';
      expect(normalizeBlogTitle(accurateTitle)).toBe(accurateTitle);
    });

    it('handles null, undefined, and empty strings gracefully', () => {
      expect(normalizeBlogTitle(null)).toBe('');
      expect(normalizeBlogTitle(undefined)).toBe('');
      expect(normalizeBlogTitle('')).toBe('');
    });
  });

  describe('filterPublicProducts', () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Eternal Radiance Ring',
        slug: 'eternal-radiance-ring',
        price: 12999,
      },
      { id: '2', name: 'finale test', slug: 'finale-test', price: 99 },
      {
        id: '3',
        name: 'Moonlit Elegance Necklace',
        slug: 'moonlit-elegance-necklace',
        price: 24999,
      },
      { id: '4', name: 'Testing ', slug: 'testing', price: 1 },
      {
        id: '5',
        name: 'Twilight Blooms Earrings',
        slug: 'twilight-blooms-earrings',
        price: 8999,
      },
    ];

    it('filters out test products and retains genuine luxury items', () => {
      const filtered = filterPublicProducts(mockProducts);
      expect(filtered).toHaveLength(3);
      expect(filtered.map((p) => p.slug)).toEqual([
        'eternal-radiance-ring',
        'moonlit-elegance-necklace',
        'twilight-blooms-earrings',
      ]);
    });

    it('preserves all properties and structure of genuine products', () => {
      const filtered = filterPublicProducts(mockProducts);
      expect(filtered[0]).toEqual({
        id: '1',
        name: 'Eternal Radiance Ring',
        slug: 'eternal-radiance-ring',
        price: 12999,
      });
    });

    it('handles empty arrays, null, or undefined inputs gracefully', () => {
      expect(filterPublicProducts([])).toEqual([]);
      expect(filterPublicProducts(null)).toEqual([]);
      expect(filterPublicProducts(undefined)).toEqual([]);
    });
  });

  describe('filterPublicBlogPosts', () => {
    const mockPosts = [
      {
        id: 'b1',
        title: 'Benifits of 22K Gold Plating',
        slug: 'benefits-of-gold-plating',
      },
      { id: 'b2', title: 'test blog', slug: 'test-blog' },
      {
        id: 'b3',
        title: 'The Solitaire Buying Guide',
        slug: 'solitaire-guide',
      },
      { id: 'b4', title: 'Draft Post', slug: 'draft-post' },
    ];

    it('filters out test blog posts and normalizes titles of genuine articles', () => {
      const filtered = filterPublicBlogPosts(mockPosts);
      expect(filtered).toHaveLength(2);
      expect(filtered[0]).toEqual({
        id: 'b1',
        title: 'Benefits of 22K Gold Plating',
        slug: 'benefits-of-gold-plating',
      });
      expect(filtered[1]).toEqual({
        id: 'b3',
        title: 'The Solitaire Buying Guide',
        slug: 'solitaire-guide',
      });
    });

    it('handles empty arrays, null, or undefined inputs gracefully', () => {
      expect(filterPublicBlogPosts([])).toEqual([]);
      expect(filterPublicBlogPosts(null)).toEqual([]);
      expect(filterPublicBlogPosts(undefined)).toEqual([]);
    });
  });
});
