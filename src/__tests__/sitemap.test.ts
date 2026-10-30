jest.mock('server-only', () => ({}));

import sitemap from '../app/sitemap';
import { createClient } from '../lib/supabase/server';

jest.mock('../lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Sitemap Accuracy & Error Handling Hardening (Finding E1)', () => {
  const originalEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv, NEXT_PUBLIC_APP_URL: 'https://ruhvi.in' };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('omits artificial lastModified timestamps for static pages and categories', async () => {
    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const entries = await sitemap();

    // Check home page
    const homeEntry = entries.find((e) => e.url === 'https://ruhvi.in');
    expect(homeEntry).toBeDefined();
    expect(homeEntry?.lastModified).toBeUndefined();

    // Check category page
    const categoryEntry = entries.find(
      (e) => e.url === 'https://ruhvi.in/category/rings'
    );
    expect(categoryEntry).toBeDefined();
    expect(categoryEntry?.lastModified).toBeUndefined();
  });

  it('includes genuine updated_at dates for dynamic products and published blogs', async () => {
    const mockProducts = [
      {
        slug: 'solitaire-diamond-ring',
        updated_at: '2026-10-15T12:00:00.000Z',
      },
      { slug: 'gold-chain-necklace', updated_at: null },
    ];
    const mockBlogs = [
      {
        slug: 'wedding-jewelry-trends',
        published_at: '2026-10-20T08:00:00.000Z',
        updated_at: null,
      },
    ];

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest
              .fn()
              .mockResolvedValue({ data: mockProducts, error: null }),
          };
        }
        if (table === 'blog_posts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest
              .fn()
              .mockResolvedValue({ data: mockBlogs, error: null }),
          };
        }
        return {};
      }),
    });

    const entries = await sitemap();

    const productWithDate = entries.find(
      (e) => e.url === 'https://ruhvi.in/products/solitaire-diamond-ring'
    );
    expect(productWithDate).toBeDefined();
    expect(productWithDate?.lastModified).toEqual(
      new Date('2026-10-15T12:00:00.000Z')
    );

    const productWithoutDate = entries.find(
      (e) => e.url === 'https://ruhvi.in/products/gold-chain-necklace'
    );
    expect(productWithoutDate).toBeDefined();
    expect(productWithoutDate?.lastModified).toBeUndefined();

    const blogEntry = entries.find(
      (e) => e.url === 'https://ruhvi.in/blog/wedding-jewelry-trends'
    );
    expect(blogEntry).toBeDefined();
    expect(blogEntry?.lastModified).toEqual(
      new Date('2026-10-20T08:00:00.000Z')
    );
  });

  it('logs database error with console.error instead of silently swallowing it', async () => {
    const dbError = new Error('Database connection failed');
    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      }),
    });

    const entries = await sitemap();

    // Still returns static pages cleanly without crashing
    expect(entries.length).toBeGreaterThan(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[sitemap] Supabase error fetching products for sitemap:'
      ),
      dbError
    );
  });
});
