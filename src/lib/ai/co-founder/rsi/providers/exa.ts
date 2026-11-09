import 'server-only';
import {
  NormalizedSearchResult,
  ProviderStatus,
  ResearchSearchOptions,
} from '../types';

export interface ExaSearchResult {
  status: ProviderStatus;
  results: NormalizedSearchResult[];
  error?: string;
}

/**
 * Exa Search Provider Adapter
 * Second independent general-search fallback provider when both Crawl4AI and Tavily are exhausted.
 * Free tier ($10 credit monthly); no card required; strictly avoids deep-agent runs.
 */
export class ExaProvider {
  private getApiKey(): string | null {
    return process.env.EXA_API_KEY || null;
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

  async search(options: ResearchSearchOptions): Promise<ExaSearchResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: 'not_configured', results: [] };
    }

    this.checkPaidAllowed();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s budget

    try {
      const numResults = Math.min(options.maxResults || 5, 10);
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: options.query,
          type: 'auto',
          numResults,
          includeDomains:
            options.domains && options.domains.length > 0
              ? options.domains
              : undefined,
          contents: {
            highlights: true,
          },
        }),
        signal: controller.signal,
      });

      if (res.status === 402) {
        return {
          status: 'quota_exhausted',
          results: [],
          error: 'Exa monthly credits exhausted (HTTP 402).',
        };
      }

      if (res.status === 429) {
        return {
          status: 'rate_limited',
          results: [],
          error: 'Exa rate limit reached (HTTP 429).',
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          status: 'auth_error',
          results: [],
          error: 'Exa API key invalid or unauthorized (HTTP 401/403).',
        };
      }

      if (!res.ok) {
        return {
          status: 'degraded',
          results: [],
          error: `Exa search returned HTTP status ${res.status}.`,
        };
      }

      const data = await res.json().catch(() => null);
      if (!data) {
        return {
          status: 'degraded',
          results: [],
          error: 'Failed to parse Exa search response JSON.',
        };
      }

      if (
        data.error &&
        (data.error.includes('credit') ||
          data.error.includes('quota') ||
          data.error.includes('exhausted') ||
          data.error.includes('payment'))
      ) {
        return {
          status: 'quota_exhausted',
          results: [],
          error: data.error,
        };
      }

      const rawResults = Array.isArray(data.results) ? data.results : [];
      const normalized: NormalizedSearchResult[] = [];

      for (const item of rawResults.slice(0, numResults)) {
        if (!item.url || typeof item.url !== 'string') continue;

        let domain = '';
        try {
          domain = new URL(item.url).hostname;
        } catch {
          continue;
        }

        const snippet =
          Array.isArray(item.highlights) && item.highlights.length > 0
            ? item.highlights.join(' ')
            : (item.text || '').slice(0, 400);

        normalized.push({
          title: (item.title || domain).trim(),
          url: item.url.trim(),
          snippet: snippet.slice(0, 400).trim(),
          domain,
          publishedAt: item.publishedDate || undefined,
          retrievedAt: new Date().toISOString(),
          provider: 'exa',
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
          ? 'Exa search request timed out after 12s.'
          : err?.message || 'Exa connection error.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const exaProvider = new ExaProvider();
