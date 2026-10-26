/**
 * Reddit Intelligence & Social Sentiment Module for Project Ruhvi AI Workers
 *
 * Provides real-time consumer sentiment, competitor reviews, and jewellery discussion
 * monitoring without requiring private login credentials, avoiding account ban risks,
 * and running natively in Node.js server environments.
 *
 * Target Communities:
 * - r/IndianFashionAddicts (Top Indian fashion & demi-fine jewellery discussions)
 * - r/Jewelry (Fine jewellery craftsmanship, metal plating, hallmark verification)
 * - r/indiasocial (General Indian consumer gifting & festive buying sentiment)
 */

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  permalink: string;
  publishedAt: string;
  snippet: string;
  matchedKeywords?: string[];
}

export interface RedditComment {
  id: string;
  author: string;
  publishedAt: string;
  content: string;
}

export interface RedditSentimentReport {
  analyzedPostCount: number;
  subredditsScanned: string[];
  brandMentions: { [brand: string]: number };
  consumerPainPoints: string[];
  trendingThemes: string[];
  opportunitiesForRuhvi: string[];
  relevantPosts: RedditPost[];
  timestamp: string;
}

export const TARGET_JEWELLERY_SUBREDDITS = [
  'IndianFashionAddicts',
  'Jewelry',
  'indiasocial',
] as const;

export const DEFAULT_JEWELLERY_KEYWORDS = [
  'jewellery',
  'jewelry',
  'gold',
  'anti-tarnish',
  'tarnish',
  'plating',
  'silver',
  'earrings',
  'necklace',
  'choker',
  'bangles',
  'ring',
  'giva',
  'caratlane',
  'bluestone',
  'palmonas',
  'shaya',
  'faded',
  'color guarantee',
  'hallmark',
];

// In-memory 5-minute cache to avoid repeated requests to Reddit
interface CacheEntry {
  data: RedditPost[];
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(html: string): string {
  if (!html) return '';
  return decodeHtmlEntities(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Fetches recent posts from a specific subreddit Atom/RSS feed.
 */
export async function fetchSubredditFeed(
  subreddit: string,
  options: {
    filterKeywords?: string[];
    limit?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<RedditPost[]> {
  const { filterKeywords = [], limit = 20, forceRefresh = false } = options;
  const cacheKey = `sub:${subreddit.toLowerCase()}`;

  const cached = cache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return filterAndLimitPosts(cached.data, filterKeywords, limit);
  }

  const url = `https://www.reddit.com/r/${subreddit}.rss`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.warn(
        `[Reddit Intelligence] Failed to fetch r/${subreddit}: HTTP ${res.status}`
      );
      return [];
    }

    const xml = await res.text();
    const rawEntries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

    const posts: RedditPost[] = [];

    for (const match of rawEntries) {
      const entryXml = match[1];
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entryXml.match(/<link href="([^"]+)"/);
      const authorMatch = entryXml.match(/<name>([\s\S]*?)<\/name>/);
      const dateMatch = entryXml.match(/<updated>([\s\S]*?)<\/updated>/);
      const contentMatch = entryXml.match(
        /<content type="html">([\s\S]*?)<\/content>/
      );

      const title = decodeHtmlEntities(titleMatch?.[1] || '').trim();
      const permalink = linkMatch?.[1] || '';
      const author = decodeHtmlEntities(authorMatch?.[1] || 'anonymous').trim();
      const publishedAt = dateMatch?.[1] || new Date().toISOString();
      const rawHtml = contentMatch?.[1] || '';
      const snippet = stripHtml(rawHtml).slice(0, 400);

      // Extract unique Reddit post ID from link
      const idMatch = permalink.match(/comments\/([a-z0-9]+)\//i);
      const id = idMatch
        ? idMatch[1]
        : `post_${Math.random().toString(36).substring(7)}`;

      if (title) {
        posts.push({
          id,
          title,
          author,
          subreddit,
          permalink,
          publishedAt,
          snippet,
        });
      }
    }

    cache.set(cacheKey, { data: posts, timestamp: Date.now() });
    return filterAndLimitPosts(posts, filterKeywords, limit);
  } catch (err: any) {
    console.error(
      `[Reddit Intelligence] Network error on r/${subreddit}:`,
      err.message
    );
    return [];
  }
}

function filterAndLimitPosts(
  posts: RedditPost[],
  keywords: string[],
  limit: number
): RedditPost[] {
  let filtered = posts;

  if (keywords.length > 0) {
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    filtered = posts
      .map((post) => {
        const fullText = `${post.title} ${post.snippet}`.toLowerCase();
        const matches = lowerKeywords.filter((k) => fullText.includes(k));
        return { ...post, matchedKeywords: matches };
      })
      .filter(
        (post) => post.matchedKeywords && post.matchedKeywords.length > 0
      );
  }

  return filtered.slice(0, limit);
}

/**
 * Scans multiple Indian fashion and jewellery subreddits for relevant discussions.
 */
export async function searchRedditJewelleryDiscussions(
  keywords: string[] = DEFAULT_JEWELLERY_KEYWORDS,
  options: {
    subreddits?: readonly string[];
    limitPerSubreddit?: number;
  } = {}
): Promise<RedditPost[]> {
  const { subreddits = TARGET_JEWELLERY_SUBREDDITS, limitPerSubreddit = 15 } =
    options;

  const results = await Promise.all(
    subreddits.map((sub) =>
      fetchSubredditFeed(sub, {
        filterKeywords: keywords,
        limit: limitPerSubreddit,
      })
    )
  );

  return results.flat();
}

/**
 * Analyzes consumer sentiment and competitor perceptions across Reddit discussions.
 */
export function analyzeRedditJewellerySentiment(
  posts: RedditPost[]
): RedditSentimentReport {
  const brandMentions: { [brand: string]: number } = {
    GIVA: 0,
    CaratLane: 0,
    Bluestone: 0,
    Palmonas: 0,
    Shaya: 0,
    Mia: 0,
  };

  const painPointTriggers = [
    {
      trigger: 'tarnish',
      point: 'Frequent tarnishing or blackening of plated metal within weeks',
    },
    {
      trigger: 'fade',
      point: 'Gold color fading or discoloration after minimal daily wear',
    },
    {
      trigger: 'green',
      point: 'Skin or neck turning green from cheap base metals (brass/nickel)',
    },
    {
      trigger: 'allergy',
      point:
        'Skin irritation or metal allergies from lack of hypoallergenic coating',
    },
    {
      trigger: 'expensive',
      point: 'High prices not matching perceived metal longevity',
    },
    {
      trigger: 'fake',
      point:
        'Disappointment with hallmarking authenticity or misleading 18K/22K claims',
    },
    {
      trigger: 'customer service',
      point: 'Slow response times or difficult exchange/warranty claims',
    },
  ];

  const detectedPainPoints = new Set<string>();
  const trendingThemes = new Set<string>();

  for (const post of posts) {
    const text = `${post.title} ${post.snippet}`.toLowerCase();

    // Track competitor mentions
    if (text.includes('giva')) brandMentions['GIVA']++;
    if (text.includes('caratlane') || text.includes('carat lane'))
      brandMentions['CaratLane']++;
    if (text.includes('bluestone')) brandMentions['Bluestone']++;
    if (text.includes('palmonas')) brandMentions['Palmonas']++;
    if (text.includes('shaya')) brandMentions['Shaya']++;
    if (text.includes('mia by tanishq') || text.includes('mia'))
      brandMentions['Mia']++;

    // Track pain points
    for (const item of painPointTriggers) {
      if (text.includes(item.trigger)) {
        detectedPainPoints.add(item.point);
      }
    }

    // Identify trending topics
    if (text.includes('anti-tarnish') || text.includes('waterproof')) {
      trendingThemes.add(
        'High consumer demand for true waterproof, anti-tarnish everyday jewellery'
      );
    }
    if (text.includes('daily wear') || text.includes('office')) {
      trendingThemes.add(
        'Growing preference for minimalist daily wear over heavy bridal sets'
      );
    }
    if (
      text.includes('gift') ||
      text.includes('birthday') ||
      text.includes('anniversary')
    ) {
      trendingThemes.add(
        'Surge in demand for premium gift-boxed jewellery with verified certificates'
      );
    }
  }

  const opportunitiesForRuhvi: string[] = [];

  if (
    detectedPainPoints.has(
      'Frequent tarnishing or blackening of plated metal within weeks'
    ) ||
    detectedPainPoints.has(
      'Gold color fading or discoloration after minimal daily wear'
    )
  ) {
    opportunitiesForRuhvi.push(
      'Spotlight Ruhvi 6-Month Color Guarantee: Directly counter common competitor complaints about fading plating with our 22K thick e-coating warranty.'
    );
  }

  if (
    detectedPainPoints.has(
      'Skin or neck turning green from cheap base metals (brass/nickel)'
    )
  ) {
    opportunitiesForRuhvi.push(
      'Hypoallergenic Messaging: Emphasize 100% nickel-free and lead-free alloy compositions in marketing hooks and PDP badges.'
    );
  }

  opportunitiesForRuhvi.push(
    'Comparison Content Angle: Publish educational comparison guides ("Why cheap gold plating turns green vs. How Ruhvi 22K e-coating lasts").'
  );

  const subredditsScanned = Array.from(
    new Set(posts.map((p) => `r/${p.subreddit}`))
  );

  return {
    analyzedPostCount: posts.length,
    subredditsScanned,
    brandMentions,
    consumerPainPoints: Array.from(detectedPainPoints),
    trendingThemes: Array.from(trendingThemes),
    opportunitiesForRuhvi,
    relevantPosts: posts.slice(0, 10),
    timestamp: new Date().toISOString(),
  };
}
