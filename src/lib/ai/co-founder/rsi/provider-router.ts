import 'server-only';
import { createHash } from 'crypto';
import {
  NormalizedSearchResult,
  ProviderHealthState,
  ProviderStatus,
  ResearchPageReadOptions,
  ResearchPageReadResponse,
  ResearchProvider,
  ResearchSearchOptions,
  ResearchSearchResponse,
} from './types';
import { crawl4AiProvider } from './providers/crawl4ai';
import { tavilyProvider } from './providers/tavily';
import { exaProvider } from './providers/exa';
import { readWithJinaReader } from './providers/jina-reader';
import { directSafeFetch } from './providers/direct-fetch';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

interface CachedSearchEntry {
  response: ResearchSearchResponse;
  expiresAt: number;
}

interface ProviderCircuitState {
  status: ProviderStatus;
  cooldownUntil: number;
  lastError?: string;
  failureCount: number;
}

/**
 * Normalizes a URL for deduplication by stripping tracking query params and trailing slashes.
 */
function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'fbclid',
      'gclid',
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    let cleaned = url.toString();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Central Provider Router & Circuit Breaker for the Research Gateway.
 * Enforces:
 * 1. Crawl4AI Cloud -> Tavily -> Exa bounded failover order.
 * 2. 15-minute query caching to conserve free quota.
 * 3. Strict SSRF validation on all page read and direct fetch operations.
 * 4. Circuit breaker cooldowns for exhausted or rate-limited providers.
 * 5. Zero-fabrication: returns 'unavailable' when no live sources answer.
 */
export class ResearchProviderRouter {
  private queryCache = new Map<string, CachedSearchEntry>();
  private circuitStates = new Map<ResearchProvider, ProviderCircuitState>();

  constructor() {
    // Initialize provider circuit states
    const providers: ResearchProvider[] = [
      'crawl4ai',
      'tavily',
      'exa',
      'github',
      'rss',
      'jina',
      'direct_fetch',
    ];
    for (const p of providers) {
      this.circuitStates.set(p, {
        status: 'healthy',
        cooldownUntil: 0,
        failureCount: 0,
      });
    }
  }

  private isProviderInCooldown(provider: ResearchProvider): boolean {
    const state = this.circuitStates.get(provider);
    if (!state) return false;
    return Date.now() < state.cooldownUntil;
  }

  private recordProviderOutcome(
    provider: ResearchProvider,
    status: ProviderStatus,
    error?: string
  ): void {
    const state = this.circuitStates.get(provider) || {
      status: 'healthy',
      cooldownUntil: 0,
      failureCount: 0,
    };

    state.status = status;
    state.lastError = error;

    if (status === 'quota_exhausted') {
      // Cooldown for 1 hour when quota is exhausted
      state.cooldownUntil = Date.now() + 60 * 60 * 1000;
    } else if (status === 'rate_limited') {
      // Cooldown for 60 seconds
      state.cooldownUntil = Date.now() + 60 * 1000;
    } else if (status === 'auth_error') {
      // Cooldown for 2 hours on authentication failure
      state.cooldownUntil = Date.now() + 2 * 60 * 60 * 1000;
    } else if (status === 'healthy') {
      state.cooldownUntil = 0;
      state.failureCount = 0;
    } else if (status === 'degraded') {
      state.failureCount++;
      if (state.failureCount >= 3) {
        state.cooldownUntil = Date.now() + 5 * 60 * 1000; // 5 min cooldown after 3 failures
      }
    }

    this.circuitStates.set(provider, state);
  }

  /**
   * Deduplicates search results across multiple provider responses by canonical URL.
   */
  private deduplicateResults(
    results: NormalizedSearchResult[]
  ): NormalizedSearchResult[] {
    const seen = new Set<string>();
    const deduplicated: NormalizedSearchResult[] = [];

    for (const item of results) {
      const canonical = normalizeCanonicalUrl(item.url);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  }

  /**
   * Executes web search across bounded provider hierarchy:
   * Crawl4AI Cloud (Primary) -> Tavily (Fallback 1) -> Exa (Fallback 2)
   */
  async search(
    options: ResearchSearchOptions
  ): Promise<ResearchSearchResponse> {
    const query = options.query?.trim();
    if (!query) {
      return {
        success: false,
        query: '',
        attemptedProviders: [],
        results: [],
        sourceMode: 'insufficient_data',
        providerStatuses: {},
        error: 'Search query cannot be empty.',
        totalResults: 0,
        retrievedAt: new Date().toISOString(),
      };
    }

    // 1. Inspect 15-minute Query Cache
    const cacheKey = `${query.toLowerCase()}::${(options.domains || []).sort().join(',')}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        ...cached.response,
        sourceMode: 'cached',
        cached: true,
      };
    }

    const providerStatuses: Partial<Record<ResearchProvider, ProviderStatus>> =
      {};
    const attemptedProviders: ResearchProvider[] = [];
    const collectedResults: NormalizedSearchResult[] = [];
    let providerUsed: ResearchProvider | undefined = undefined;

    // Ordered search providers per architecture specification
    const searchProviders: Array<{
      id: ResearchProvider;
      run: () => Promise<{
        status: ProviderStatus;
        results: NormalizedSearchResult[];
        error?: string;
      }>;
    }> = [
      {
        id: 'crawl4ai',
        run: () => crawl4AiProvider.search(options),
      },
      {
        id: 'tavily',
        run: () => tavilyProvider.search(options),
      },
      {
        id: 'exa',
        run: () => exaProvider.search(options),
      },
    ];

    const maxProvidersToTry = parseInt(
      process.env.RESEARCH_MAX_SEARCH_PROVIDERS_PER_QUERY || '2',
      10
    );
    let providersAttemptedCount = 0;

    for (const provider of searchProviders) {
      if (
        providersAttemptedCount >= maxProvidersToTry &&
        collectedResults.length > 0
      ) {
        break;
      }

      if (this.isProviderInCooldown(provider.id)) {
        const state = this.circuitStates.get(provider.id);
        providerStatuses[provider.id] = state?.status || 'rate_limited';
        continue;
      }

      attemptedProviders.push(provider.id);
      providersAttemptedCount++;

      try {
        const outcome = await provider.run();
        providerStatuses[provider.id] = outcome.status;
        this.recordProviderOutcome(provider.id, outcome.status, outcome.error);

        if (outcome.status === 'healthy' && outcome.results.length > 0) {
          collectedResults.push(...outcome.results);
          if (!providerUsed) {
            providerUsed = provider.id;
          }
          // If we got sufficient high-quality results from primary, stop without burning extra fallback quotas
          if (collectedResults.length >= (options.maxResults || 5)) {
            break;
          }
        }
      } catch (err: any) {
        providerStatuses[provider.id] = 'degraded';
        this.recordProviderOutcome(provider.id, 'degraded', err?.message);
      }
    }

    const finalResults = this.deduplicateResults(collectedResults).slice(
      0,
      options.maxResults || 5
    );

    if (finalResults.length === 0) {
      // True zero-fabrication contract: fail truthfully without inventing metrics or results
      const allNotConfigured = Object.values(providerStatuses).every(
        (s) => s === 'not_configured'
      );
      const errorMessage = allNotConfigured
        ? 'No search provider API keys are configured (CRAWL4AI_API_KEY, TAVILY_API_KEY, EXA_API_KEY).'
        : `All attempted search providers (${attemptedProviders.join(', ')}) failed or returned zero results.`;

      return {
        success: false,
        query,
        providerUsed,
        attemptedProviders,
        results: [],
        sourceMode: 'unavailable',
        providerStatuses,
        error: errorMessage,
        totalResults: 0,
        retrievedAt: new Date().toISOString(),
      };
    }

    const response: ResearchSearchResponse = {
      success: true,
      query,
      providerUsed,
      attemptedProviders,
      results: finalResults,
      sourceMode: 'live',
      providerStatuses,
      totalResults: finalResults.length,
      retrievedAt: new Date().toISOString(),
    };

    // Store in query cache with 15-minute TTL
    this.queryCache.set(cacheKey, {
      response,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return response;
  }

  /**
   * Reads a known webpage with strict SSRF checks and provider failover:
   * Crawl4AI /scrape -> Jina Reader -> Safe Direct Fetch
   */
  async readWebpage(
    options: ResearchPageReadOptions
  ): Promise<ResearchPageReadResponse> {
    const rawUrl = options.url?.trim();
    if (!rawUrl) {
      return {
        success: false,
        url: '',
        finalUrl: '',
        title: 'Missing URL',
        markdown: '',
        contentHash: '',
        status: 400,
        providerUsed: 'direct_fetch',
        retrievedAt: new Date().toISOString(),
        sourceMode: 'insufficient_data',
        error: 'Target URL is required.',
      };
    }

    // 1. Mandatory Pre-flight SSRF Validation
    try {
      await assertSafeOutboundUrl(rawUrl);
    } catch (ssrfErr: any) {
      return {
        success: false,
        url: rawUrl,
        finalUrl: rawUrl,
        title: 'Blocked URL',
        markdown: '',
        contentHash: '',
        status: 403,
        providerUsed: 'direct_fetch',
        retrievedAt: new Date().toISOString(),
        sourceMode: 'unavailable',
        error: `SSRF Violation: ${ssrfErr?.message || 'Access to blocked address denied.'}`,
      };
    }

    // 2. Try Crawl4AI Cloud Scrape if configured and healthy
    if (
      !this.isProviderInCooldown('crawl4ai') &&
      process.env.CRAWL4AI_API_KEY
    ) {
      try {
        const crawlRes = await crawl4AiProvider.scrape(rawUrl);
        this.recordProviderOutcome('crawl4ai', crawlRes.status, crawlRes.error);

        if (crawlRes.status === 'healthy' && crawlRes.markdown) {
          const contentHash = createHash('sha256')
            .update(crawlRes.markdown)
            .digest('hex');
          return {
            success: true,
            url: rawUrl,
            finalUrl: crawlRes.finalUrl || rawUrl,
            title: crawlRes.title || '',
            markdown: crawlRes.markdown.slice(
              0,
              options.maxCharacters || 15000
            ),
            contentHash,
            status: crawlRes.httpStatus || 200,
            providerUsed: 'crawl4ai',
            retrievedAt: new Date().toISOString(),
            sourceMode: 'live',
          };
        }
      } catch (err: any) {
        this.recordProviderOutcome('crawl4ai', 'degraded', err?.message);
      }
    }

    // 3. Fallback to Jina Reader
    try {
      const jinaRes = await readWithJinaReader(rawUrl);
      if (jinaRes.success && jinaRes.markdown) {
        const contentHash = createHash('sha256')
          .update(jinaRes.markdown)
          .digest('hex');
        return {
          success: true,
          url: rawUrl,
          finalUrl: rawUrl,
          title: jinaRes.title || '',
          markdown: jinaRes.markdown.slice(0, options.maxCharacters || 15000),
          contentHash,
          status: jinaRes.status,
          providerUsed: 'jina',
          retrievedAt: new Date().toISOString(),
          sourceMode: 'live',
        };
      }
    } catch {
      // Seamlessly proceed to direct safe fetch
    }

    // 4. Fallback to Safe Direct Fetch
    const directRes = await directSafeFetch(rawUrl);
    if (directRes.success && directRes.markdown) {
      const contentHash = createHash('sha256')
        .update(directRes.markdown)
        .digest('hex');
      return {
        success: true,
        url: rawUrl,
        finalUrl: rawUrl,
        title: directRes.title || '',
        markdown: directRes.markdown.slice(0, options.maxCharacters || 15000),
        textContent: directRes.textContent,
        contentHash,
        status: directRes.status,
        providerUsed: 'direct_fetch',
        retrievedAt: new Date().toISOString(),
        sourceMode: 'live',
      };
    }

    return {
      success: false,
      url: rawUrl,
      finalUrl: rawUrl,
      title: 'Unable to Read Page',
      markdown: '',
      contentHash: '',
      status: directRes.status || 500,
      providerUsed: 'direct_fetch',
      retrievedAt: new Date().toISOString(),
      sourceMode: 'unavailable',
      error:
        directRes.error ||
        'All reading providers failed to extract page content.',
    };
  }

  /**
   * Returns current health and circuit state across all supported research providers.
   */
  getProviderHealth(): Record<ResearchProvider, ProviderHealthState> {
    const result: Partial<Record<ResearchProvider, ProviderHealthState>> = {};
    const providers: ResearchProvider[] = [
      'crawl4ai',
      'tavily',
      'exa',
      'github',
      'rss',
      'jina',
      'direct_fetch',
    ];

    for (const p of providers) {
      const state = this.circuitStates.get(p);
      let status = state?.status || 'healthy';

      if (p === 'crawl4ai' && !process.env.CRAWL4AI_API_KEY) {
        status = 'not_configured';
      } else if (p === 'tavily' && !process.env.TAVILY_API_KEY) {
        status = 'not_configured';
      } else if (p === 'exa' && !process.env.EXA_API_KEY) {
        status = 'not_configured';
      }

      result[p] = {
        provider: p,
        status,
        lastCheckedAt: new Date().toISOString(),
        error: state?.lastError,
      };
    }

    return result as Record<ResearchProvider, ProviderHealthState>;
  }
}

export const researchProviderRouter = new ResearchProviderRouter();
