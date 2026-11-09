import 'server-only';
import {
  NormalizedSearchResult,
  ProviderStatus,
  ResearchSearchOptions,
} from '../types';

export interface TavilySearchResult {
  status: ProviderStatus;
  results: NormalizedSearchResult[];
  error?: string;
}

/**
 * Tavily Search Provider Adapter
 * First general-search fallback provider when Crawl4AI Cloud is exhausted, rate-limited, or unavailable.
 * Strictly uses basic search (1 credit) on the 1,000 credit/mo free plan; no card, no pay-as-you-go.
 */
export class TavilyProvider {
  private getApiKey(): string | null {
    return process.env.TAVILY_API_KEY || null;
  }

  private checkPaidAllowed(): void {
    if (
      process.env.RESEARCH_ALLOW_PAID_PROVIDERS === 'true' ||
      process.env.RESEARCH_AUTORECHARGE === 'true'
    ) {
      throw new Error(
        'Policy Violation: Paid search providers and auto-recharge are strictly disabled.'
      );
    }
  }

  async search(options: ResearchSearchOptions): Promise<TavilySearchResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: 'not_configured', results: [] };
    }

    this.checkPaidAllowed();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s budget

    try {
      const maxResults = Math.min(options.maxResults || 5, 10);
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: options.query,
          search_depth: 'basic',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
          include_domains:
            options.domains && options.domains.length > 0
              ? options.domains
              : undefined,
        }),
        signal: controller.signal,
      });

      if (res.status === 402) {
        return {
          status: 'quota_exhausted',
          results: [],
          error: 'Tavily free monthly quota exhausted (HTTP 402).',
        };
      }

      if (res.status === 429) {
        return {
          status: 'rate_limited',
          results: [],
          error: 'Tavily rate limit exceeded (HTTP 429).',
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: 'auth_error',
          results: [],
          error: 'Tavily authentication rejected (HTTP 401/403).',
        };
      }

      if (!res.ok) {
        return {
          status: 'degraded',
          results: [],
          error: `Tavily returned error status ${res.status}.`,
        };
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        return {
          status: 'degraded',
          results: [],
          error: 'Failed to parse Tavily search response.',
        };
      }

      // Check for quota exhausted error messages in 200 payload
      if (
        data.error &&
        (data.error.includes('quota') ||
          data.error.includes('credit') ||
          data.error.includes('exhausted'))
      ) {
        return {
          status: 'quota_exhausted',
          results: [],
          error: data.error,
        };
      }

      const rawResults = Array.isArray(data.results) ? data.results : [];
      const normalized: NormalizedSearchResult[] = [];

      for (const item of rawResults.slice(0, maxResults)) {
        if (!item.url || typeof item.url !== 'string') continue;

        let domain = '';
        try {
          domain = new URL(item.url).hostname;
        } catch {
          continue;
        }

        normalized.push({
          title: (item.title || domain).trim(),
          url: item.url.trim(),
          snippet: (item.content || '').slice(0, 400).trim(),
          domain,
          publishedAt: item.published_date || undefined,
          retrievedAt: new Date().toISOString(),
          provider: 'tavily',
          score: item.score || undefined,
          raw: item,
        });
      }

      return {
        status: 'healthy',
        results: normalized,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        status: 'degraded',
        results: [],
        error: isTimeout
          ? 'Tavily search request timed out after 12s.'
          : err?.message || 'Tavily connection error.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const tavilyProvider = new TavilyProvider();
