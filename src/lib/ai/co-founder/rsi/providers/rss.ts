import 'server-only';
import { assertSafeOutboundUrl, safeFetch } from '@/lib/security/ssrf';
import { NormalizedSearchResult, ProviderStatus } from '../types';

export interface RssFeedResult {
  status: ProviderStatus;
  results: NormalizedSearchResult[];
  error?: string;
}

/**
 * RSS/Atom Specialist Feed Ingestion Adapter
 * Ingests known official announcements, blogs, and industry updates.
 * Strictly verifies feed URLs against SSRF policy.
 */
export class RssFeedProvider {
  async fetchFeed(
    feedUrl: string,
    maxItems: number = 5
  ): Promise<RssFeedResult> {
    try {
      await assertSafeOutboundUrl(feedUrl);
    } catch (err: any) {
      return {
        status: 'auth_error',
        results: [],
        error: `SSRF rejected feed URL: ${err?.message}`,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await safeFetch(feedUrl, {
        headers: {
          Accept:
            'application/rss+xml, application/atom+xml, text/xml, application/xml',
          'User-Agent': 'Ruhvi-CoFounder-FeedReader/1.0',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          status: 'degraded',
          results: [],
          error: `Feed returned HTTP ${res.status}`,
        };
      }

      const xml = await res.text();
      const results: NormalizedSearchResult[] = [];

      let domain = '';
      try {
        domain = new URL(feedUrl).hostname;
      } catch {}

      // Match RSS <item> tags
      const itemMatches = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi));
      if (itemMatches.length > 0) {
        for (const match of itemMatches.slice(0, maxItems)) {
          const itemXml = match[0];
          const title =
            itemXml
              .match(
                /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
              )?.[1]
              ?.trim() || '';
          const link =
            itemXml
              .match(
                /<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i
              )?.[1]
              ?.trim() || '';
          const desc =
            itemXml
              .match(
                /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
              )?.[1]
              ?.replace(/<[^>]+>/g, ' ')
              .trim() || '';
          const pubDate = itemXml
            .match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]
            ?.trim();

          if (link) {
            results.push({
              title: title || domain,
              url: link,
              snippet: desc.slice(0, 400),
              domain,
              publishedAt: pubDate
                ? new Date(pubDate).toISOString()
                : undefined,
              retrievedAt: new Date().toISOString(),
              provider: 'rss',
            });
          }
        }
      } else {
        // Match Atom <entry> tags
        const entryMatches = Array.from(
          xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)
        );
        for (const match of entryMatches.slice(0, maxItems)) {
          const entryXml = match[0];
          const title =
            entryXml
              .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
              ?.replace(/<[^>]+>/g, ' ')
              .trim() || '';
          const link =
            entryXml.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim() ||
            '';
          const summary =
            entryXml
              .match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]
              ?.replace(/<[^>]+>/g, ' ')
              .trim() || '';
          const updated = entryXml
            .match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]
            ?.trim();

          if (link) {
            results.push({
              title: title || domain,
              url: link,
              snippet: summary.slice(0, 400),
              domain,
              publishedAt: updated
                ? new Date(updated).toISOString()
                : undefined,
              retrievedAt: new Date().toISOString(),
              provider: 'rss',
            });
          }
        }
      }

      return {
        status: 'healthy',
        results,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        status: 'degraded',
        results: [],
        error: isTimeout
          ? 'RSS feed fetch timed out.'
          : err?.message || 'RSS error.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const rssFeedProvider = new RssFeedProvider();
