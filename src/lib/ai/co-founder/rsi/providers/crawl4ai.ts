import 'server-only';
import {
  NormalizedSearchResult,
  ProviderStatus,
  ResearchSearchOptions,
} from '../types';

export interface Crawl4AiUsage {
  cost?: number;
  allowanceLeft?: number | string;
  balance?: number | string;
}

export interface Crawl4AiSearchResult {
  status: ProviderStatus;
  results: NormalizedSearchResult[];
  usage?: Crawl4AiUsage;
  error?: string;
}

export interface Crawl4AiScrapeResult {
  status: ProviderStatus;
  title?: string;
  markdown?: string;
  finalUrl?: string;
  httpStatus?: number;
  usage?: Crawl4AiUsage;
  error?: string;
}

/**
 * Crawl4AI Cloud Provider Adapter
 * Primary hosted provider for general search and web page extraction.
 * Operates strictly on free-tier quota (1,000 credits/mo); never triggers top-ups.
 */
export class Crawl4AiProvider {
  private getApiKey(): string | null {
    return process.env.CRAWL4AI_API_KEY || null;
  }

  /**
   * Disallows auto-recharge and paid endpoints
   */
  private checkPaidAllowed(): void {
    if (
      process.env.RESEARCH_ALLOW_PAID_PROVIDERS === 'true' ||
      process.env.RESEARCH_AUTORECHARGE === 'true'
    ) {
      // In this no-VPS rollout, paid providers are explicitly forbidden
      throw new Error(
        'Policy Violation: Paid search providers and auto-recharge are strictly disabled.'
      );
    }
  }

  private extractUsageHeaders(headers: Headers): Crawl4AiUsage {
    const cost = headers.get('x-c4-cost');
    const allowanceLeft = headers.get('x-c4-allowance-left');
    const balance = headers.get('x-c4-balance');

    return {
      cost: cost ? parseFloat(cost) : undefined,
      allowanceLeft: allowanceLeft || undefined,
      balance: balance || undefined,
    };
  }

  async search(options: ResearchSearchOptions): Promise<Crawl4AiSearchResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: 'not_configured', results: [] };
    }

    this.checkPaidAllowed();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const endpoint = `https://api.crawl4ai.com/search?q=${encodeURIComponent(options.query)}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      const usage = this.extractUsageHeaders(res.headers);

      if (res.status === 402) {
        return {
          status: 'quota_exhausted',
          results: [],
          usage,
          error: 'Crawl4AI monthly credits exhausted (HTTP 402).',
        };
      }

      if (res.status === 429) {
        return {
          status: 'rate_limited',
          results: [],
          usage,
          error: 'Crawl4AI rate limit reached (HTTP 429).',
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: 'auth_error',
          results: [],
          error:
            'Crawl4AI authentication or permissions failure (HTTP 401/403).',
        };
      }

      if (!res.ok) {
        return {
          status: 'degraded',
          results: [],
          usage,
          error: `Crawl4AI returned HTTP error ${res.status}`,
        };
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        return {
          status: 'degraded',
          results: [],
          usage,
          error: 'Failed to parse Crawl4AI search response as JSON.',
        };
      }

      // Check if response contains plan_cap or no_credit message
      if (
        data.error === 'no_credit' ||
        data.error === 'plan_cap' ||
        data.code === 'insufficient_credits'
      ) {
        return {
          status: 'quota_exhausted',
          results: [],
          usage,
          error: data.message || 'Crawl4AI credit quota exhausted.',
        };
      }

      const rawItems = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : [];

      const normalized: NormalizedSearchResult[] = [];
      const max = options.maxResults || 5;

      for (const item of rawItems.slice(0, max)) {
        const itemUrl = item.url || item.link;
        if (!itemUrl || typeof itemUrl !== 'string') continue;

        let domain = '';
        try {
          domain = new URL(itemUrl).hostname;
        } catch {
          continue;
        }

        normalized.push({
          title: (item.title || domain).trim(),
          url: itemUrl.trim(),
          snippet: (item.snippet || item.description || item.content || '')
            .slice(0, 400)
            .trim(),
          domain,
          publishedAt: item.published_date || item.publishedAt || undefined,
          retrievedAt: new Date().toISOString(),
          provider: 'crawl4ai',
          score: item.score || undefined,
          raw: item,
        });
      }

      return {
        status: 'healthy',
        results: normalized,
        usage,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        status: 'degraded',
        results: [],
        error: isTimeout
          ? 'Crawl4AI search request timed out after 12s.'
          : err?.message || 'Crawl4AI connection error.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async scrape(url: string): Promise<Crawl4AiScrapeResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        status: 'not_configured',
        error: 'CRAWL4AI_API_KEY is not configured.',
      };
    }

    this.checkPaidAllowed();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s scrape budget

    try {
      const res = await fetch('https://api.crawl4ai.com/scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      const usage = this.extractUsageHeaders(res.headers);

      if (res.status === 402) {
        return {
          status: 'quota_exhausted',
          usage,
          error: 'Crawl4AI monthly credits exhausted for scraping.',
        };
      }

      if (res.status === 429) {
        return {
          status: 'rate_limited',
          usage,
          error: 'Crawl4AI scrape rate limit reached.',
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: 'auth_error',
          error: 'Crawl4AI credentials rejected.',
        };
      }

      if (!res.ok) {
        return {
          status: 'degraded',
          usage,
          error: `Crawl4AI scrape returned HTTP status ${res.status}.`,
        };
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        return {
          status: 'degraded',
          usage,
          error: 'Invalid JSON received from Crawl4AI scrape.',
        };
      }

      return {
        status: 'healthy',
        title: data.title || '',
        markdown: data.markdown || data.content || '',
        finalUrl: data.final_url || url,
        httpStatus: data.status || 200,
        usage,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        status: 'degraded',
        error: isTimeout
          ? 'Crawl4AI scrape timed out.'
          : err?.message || 'Crawl4AI scrape error.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const crawl4AiProvider = new Crawl4AiProvider();
