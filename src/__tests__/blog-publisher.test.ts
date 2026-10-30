jest.mock('server-only', () => ({}));

import { runBlogPublisher } from '../lib/cron/blog-publisher';
import { GET as publishBlogRoute } from '../app/api/cron/publish-blog/route';

describe('Blog Publisher & Cadence Synchronization (Finding C1)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('runBlogPublisher() logic', () => {
    it('returns zero published posts when no scheduled blogs are due', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };

      const result = await runBlogPublisher({ client: mockClient });
      expect(result.published).toBe(0);
      expect(result.due).toEqual([]);
      expect(mockClient.from).toHaveBeenCalledWith('blog_posts');
    });

    it('publishes due posts and updates database status correctly', async () => {
      const mockDuePosts = [
        {
          id: 'post_1',
          slug: 'gold-trends-2026',
          scheduled_publish_at: '2026-10-31T00:00:00.000Z',
        },
        {
          id: 'post_2',
          slug: 'diamond-care-guide',
          scheduled_publish_at: '2026-10-31T01:00:00.000Z',
        },
      ];

      const mockUpdate = jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: jest.fn((table: string) => {
          if (table === 'blog_posts') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              lte: jest.fn().mockReturnThis(),
              limit: jest
                .fn()
                .mockResolvedValue({ data: mockDuePosts, error: null }),
              update: mockUpdate,
            };
          }
          return {};
        }),
      };

      const nowIso = '2026-10-31T02:00:00.000Z';
      const result = await runBlogPublisher({ client: mockClient, nowIso });

      expect(result.published).toBe(2);
      expect(result.due).toEqual(['gold-trends-2026', 'diamond-care-guide']);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          is_published: true,
          published_at: nowIso,
          scheduled_publish_at: null,
        })
      );
    });

    it('throws error when database query fails', async () => {
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          limit: jest
            .fn()
            .mockResolvedValue({
              data: null,
              error: new Error('DB Connection Timeout'),
            }),
        }),
      };

      await expect(runBlogPublisher({ client: mockClient })).rejects.toThrow(
        'DB Connection Timeout'
      );
    });
  });

  describe('GET /api/cron/publish-blog route guard', () => {
    it('fails closed (401) when CRON_SECRET is missing', async () => {
      delete process.env.CRON_SECRET;
      const req = new Request('http://localhost/api/cron/publish-blog');
      const res = await publishBlogRoute(req);
      expect(res.status).toBe(401);
    });

    it('fails closed (401) with invalid bearer token', async () => {
      process.env.CRON_SECRET = 'valid_secret_123';
      const req = new Request('http://localhost/api/cron/publish-blog', {
        headers: { authorization: 'Bearer wrong_token' },
      });
      const res = await publishBlogRoute(req);
      expect(res.status).toBe(401);
    });
  });
});
