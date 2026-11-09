import 'server-only';
import { safeFetch } from '@/lib/security/ssrf';

export interface DirectFetchResult {
  success: boolean;
  title: string;
  markdown: string;
  textContent: string;
  status: number;
  error?: string;
}

/**
 * Direct Safe Fetch Adapter
 * Last-resort reader for a known URL using SSRF-safe outbound fetch.
 * Follows redirects with full hop-by-hop re-validation.
 */
export async function directSafeFetch(
  targetUrl: string
): Promise<DirectFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s budget

  try {
    const res = await safeFetch(
      targetUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 RuhviBot/1.0',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      },
      { maxRedirects: 4 }
    );

    if (!res.ok) {
      return {
        success: false,
        title: '',
        markdown: '',
        textContent: '',
        status: res.status,
        error: `Direct fetch returned HTTP error ${res.status}`,
      };
    }

    const html = await res.text();

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Strip scripts, styles, noscript, svg, nav, footer, header
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');

    // Strip remaining HTML tags
    const text = cleanHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      success: true,
      title,
      markdown: text.slice(0, 8000),
      textContent: text.slice(0, 8000),
      status: res.status,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      title: '',
      markdown: '',
      textContent: '',
      status: 500,
      error: isTimeout
        ? 'Direct fetch timed out after 12s.'
        : err?.message || 'Direct fetch error.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
