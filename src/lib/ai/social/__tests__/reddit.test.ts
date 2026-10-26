import {
  fetchSubredditFeed,
  analyzeRedditJewellerySentiment,
  searchRedditJewelleryDiscussions,
  RedditPost,
} from '../reddit';

describe('Reddit Social Intelligence Module', () => {
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>Looking for anti-tarnish gold jewellery recommendations</title>
      <link href="https://www.reddit.com/r/IndianFashionAddicts/comments/abc123/anti_tarnish/"/>
      <author><name>/u/jewel_lover</name></author>
      <updated>2026-10-25T12:00:00Z</updated>
      <content type="html">&lt;p&gt;Bought a GIVA necklace last month but the plating faded and it started to tarnish already. Any brands with real color guarantee?&lt;/p&gt;</content>
    </entry>
    <entry>
      <title>Caratlane vs local jeweller for 18KT gold rings</title>
      <link href="https://www.reddit.com/r/IndianFashionAddicts/comments/def456/caratlane_rings/"/>
      <author><name>/u/fashionista_in</name></author>
      <updated>2026-10-25T14:00:00Z</updated>
      <content type="html">&lt;p&gt;Want a daily wear piece that won't turn skin green or lose its shine. Are Caratlane designs worth the markup?&lt;/p&gt;</content>
    </entry>
  </feed>`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchSubredditFeed', () => {
    it('should parse raw Atom XML into structured RedditPost objects', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockXml,
      } as any);

      const posts = await fetchSubredditFeed('IndianFashionAddicts', {
        forceRefresh: true,
      });

      expect(posts.length).toBe(2);
      expect(posts[0].id).toBe('abc123');
      expect(posts[0].title).toBe(
        'Looking for anti-tarnish gold jewellery recommendations'
      );
      expect(posts[0].author).toBe('/u/jewel_lover');
      expect(posts[0].snippet).toContain('Bought a GIVA necklace last month');
      expect(posts[1].id).toBe('def456');
      expect(posts[1].title).toBe(
        'Caratlane vs local jeweller for 18KT gold rings'
      );
    });

    it('should filter posts by matching keywords', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => mockXml,
      } as any);

      const posts = await fetchSubredditFeed('IndianFashionAddicts', {
        filterKeywords: ['giva', 'tarnish'],
        forceRefresh: true,
      });

      expect(posts.length).toBe(1);
      expect(posts[0].title).toContain('anti-tarnish');
      expect(posts[0].matchedKeywords).toContain('giva');
      expect(posts[0].matchedKeywords).toContain('tarnish');
    });

    it('should handle fetch failures gracefully without throwing', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const posts = await fetchSubredditFeed('IndianFashionAddicts', {
        forceRefresh: true,
      });

      expect(posts).toEqual([]);
    });
  });

  describe('analyzeRedditJewellerySentiment', () => {
    it('should identify competitor mentions, customer pain points, and Ruhvi opportunities', () => {
      const samplePosts: RedditPost[] = [
        {
          id: '1',
          title: 'GIVA earrings tarnished after 2 weeks',
          author: 'user1',
          subreddit: 'IndianFashionAddicts',
          permalink: 'https://reddit.com/...',
          publishedAt: '2026-10-25',
          snippet:
            'The gold plating started to fade and tarnish. Skin turned slightly green.',
        },
        {
          id: '2',
          title: 'Need everyday waterproof gold necklace for daily wear',
          author: 'user2',
          subreddit: 'Jewelry',
          permalink: 'https://reddit.com/...',
          publishedAt: '2026-10-25',
          snippet:
            'Looking for a genuine anti-tarnish piece with reliable color warranty.',
        },
      ];

      const report = analyzeRedditJewellerySentiment(samplePosts);

      expect(report.analyzedPostCount).toBe(2);
      expect(report.brandMentions['GIVA']).toBe(1);
      expect(report.consumerPainPoints).toContain(
        'Frequent tarnishing or blackening of plated metal within weeks'
      );
      expect(report.consumerPainPoints).toContain(
        'Gold color fading or discoloration after minimal daily wear'
      );
      expect(report.consumerPainPoints).toContain(
        'Skin or neck turning green from cheap base metals (brass/nickel)'
      );
      expect(report.opportunitiesForRuhvi.length).toBeGreaterThan(0);
      expect(report.opportunitiesForRuhvi[0]).toContain(
        'Spotlight Ruhvi 6-Month Color Guarantee'
      );
    });
  });
});
