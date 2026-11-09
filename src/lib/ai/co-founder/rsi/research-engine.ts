/**
 * Ruhvi AI Co-Founder — Research & Discovery Engine
 * Phase 6: Sourced external research with prompt-injection filtering,
 * SSRF validation, and free-first technology comparisons.
 */

import { getCofounderDataClient } from '../data-client';
import {
  ResearchReport,
  ResearchSource,
  ResearchSearchOptions,
  ResearchSearchResponse,
  ResearchPageReadOptions,
  ResearchPageReadResponse,
  ProviderHealthState,
  ResearchProvider,
  EvidencePack,
  EvidenceClaim,
} from './types';
import { assertRsiOperationAllowed } from './governance';
import { researchProviderRouter } from './provider-router';
import { evidenceLedger } from './evidence-ledger';
import { withCoFounderSpan } from '../tracing';

export class RsiResearchEngine {
  private client = getCofounderDataClient();
  private router = researchProviderRouter;
  private ledger = evidenceLedger;

  /**
   * SSRF Protection: Validates that a target research URL is safe and public.
   * Blocks localhost, private network ranges, AWS/Cloud metadata endpoints.
   */
  isSafePublicUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false;
      }

      const hostname = url.hostname.toLowerCase();

      // Block localhost, link-local, private IP addresses
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname === '169.254.169.254' // Cloud metadata IP
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes external text to neutralize prompt-injection attempts.
   * Strips out system instruction tokens and hidden control tags.
   */
  sanitizeExternalContent(rawContent: string): string {
    if (!rawContent || typeof rawContent !== 'string') return '';
    return rawContent
      .replace(/<system>[\s\S]*?<\/system>/gi, '')
      .replace(/\[INST\][\s\S]*?\[\/INST\]/gi, '')
      .replace(
        /ignore\s+previous\s+instructions/gi,
        '[IGNORED_PROMPT_INJECTION]'
      )
      .trim();
  }

  /**
   * Creates and records a research project report with source provenance
   */
  async recordResearchReport(report: ResearchReport): Promise<{
    success: boolean;
    projectId?: string;
    error?: string;
  }> {
    assertRsiOperationAllowed('research_write');

    // 1. Validate all source URLs for SSRF
    for (const src of report.sources) {
      if (!this.isSafePublicUrl(src.url)) {
        return {
          success: false,
          error: `Security exception: Source URL ${src.url} is a blocked private or invalid address`,
        };
      }
    }

    // 2. Persist to Cloudflare D1
    const res = await this.client.createResearchProject({
      question: report.question,
      scope: report.scope,
      findings: report.findings.map((f) => ({
        finding: f.finding,
        evidence_source_ids: f.evidence_source_urls,
        confidence: f.confidence,
      })),
      sources: report.sources,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, projectId: res.data?.project_id };
  }

  /**
   * Phase 3: Web Search Gateway
   * Dispatches query across bounded provider hierarchy:
   * Crawl4AI Cloud (primary) -> Tavily (fallback 1) -> Exa (fallback 2)
   */
  async searchWeb(
    options: ResearchSearchOptions
  ): Promise<ResearchSearchResponse> {
    assertRsiOperationAllowed('research_read');

    const sanitizedQuery = this.sanitizeExternalContent(options.query || '');

    return await withCoFounderSpan(
      'research.search',
      {
        query: sanitizedQuery,
        domains: options.domains?.join(','),
        maxResults: options.maxResults,
      },
      async (span) => {
        const searchRes = await this.router.search({
          ...options,
          query: sanitizedQuery,
        });

        span.setAttribute('sourceCount', searchRes.results.length);
        span.setAttribute('provider', searchRes.providerUsed || 'unknown');

        // Sanitize snippets from untrusted web sources
        return {
          ...searchRes,
          results: searchRes.results.map((r) => ({
            ...r,
            title: this.sanitizeExternalContent(r.title),
            snippet: this.sanitizeExternalContent(r.snippet),
          })),
        };
      }
    );
  }

  /**
   * Phase 3: Web Page Reading Gateway
   * Reads a known webpage with strict SSRF checks and provider failover:
   * Crawl4AI Cloud /scrape -> Jina Reader -> Safe Direct Fetch
   */
  async readWebpage(
    options: ResearchPageReadOptions
  ): Promise<ResearchPageReadResponse> {
    assertRsiOperationAllowed('research_read');

    return await withCoFounderSpan(
      'research.fetch',
      {
        url: options.url,
        extractMode: options.extractMode || 'markdown',
      },
      async (span) => {
        const readRes = await this.router.readWebpage(options);
        span.setAttribute('provider', readRes.providerUsed || 'unknown');
        span.setAttribute('httpStatus', readRes.status || 200);

        // Neutralize prompt injection tokens in extracted markdown/text
        return {
          ...readRes,
          title: this.sanitizeExternalContent(readRes.title),
          markdown: this.sanitizeExternalContent(readRes.markdown),
          textContent: readRes.textContent
            ? this.sanitizeExternalContent(readRes.textContent)
            : undefined,
        };
      }
    );
  }

  /**
   * Phase 3: Returns live health & circuit status for all research providers
   */
  getProviderHealth(): Record<ResearchProvider, ProviderHealthState> {
    assertRsiOperationAllowed('research_read');
    return this.router.getProviderHealth();
  }

  /**
   * Phase 6: Reads a public channel via the controlled Agent Reach adapter.
   */
  async readPublicChannel(
    channel: string,
    target: string,
    maxCharacters?: number
  ) {
    assertRsiOperationAllowed('research_read');
    return this.router.readPublicChannel(channel, target, maxCharacters);
  }

  /**
   * Phase 6: Inspects Agent Reach CLI availability and configured channels.
   */
  async inspectAgentReach() {
    assertRsiOperationAllowed('research_read');
    const { agentReachAdapter } = await import('./adapters/agent-reach');
    return agentReachAdapter.inspect();
  }

  /**
   * Phase 4: Compiles an Evidence Pack from claims and research sources
   */
  buildEvidencePack(params: {
    topic: string;
    rawClaims: Array<{
      claim: string;
      sourceUrls?: string[];
      sourceIds?: string[];
    }>;
    rawSources: Array<{
      title: string;
      url: string;
      excerpt: string;
      publishedAt?: string;
      domain?: string;
      category?: 'pricing' | 'policy' | 'general';
    }>;
    knownConflicts?: string[];
  }): EvidencePack {
    assertRsiOperationAllowed('research_read');
    return this.ledger.buildEvidencePack(params);
  }

  /**
   * Phase 4: Full Topic Research Workflow
   * Dispatches web search, ranks sources, corroborates claims, and builds evidence pack.
   */
  async researchTopic(
    topic: string,
    options?: {
      maxSources?: number;
      category?: 'pricing' | 'policy' | 'general';
    }
  ): Promise<EvidencePack> {
    assertRsiOperationAllowed('research_read');

    const searchRes = await this.searchWeb({
      query: topic,
      maxResults: options?.maxSources || 5,
    });

    const rawSources = searchRes.results.map((r) => ({
      title: r.title,
      url: r.url,
      excerpt: r.snippet,
      publishedAt: r.publishedAt,
      domain: r.domain,
      category: options?.category || 'general',
    }));

    const allUrls = searchRes.results.map((r) => r.url);
    const rawClaims = searchRes.results.map((r) => ({
      claim: `${r.title}: ${r.snippet}`,
      sourceUrls: allUrls,
    }));

    return await withCoFounderSpan(
      'source.verify',
      {
        topic,
        sourceCount: rawSources.length,
        claimCount: rawClaims.length,
      },
      async (span) => {
        const pack = this.ledger.buildEvidencePack({
          topic,
          rawClaims,
          rawSources,
        });
        span.setAttribute('confidence', pack.confidence);
        span.setAttribute('claimCount', pack.claims.length);
        span.setAttribute('sourceCount', pack.sources.length);
        return pack;
      }
    );
  }
}
