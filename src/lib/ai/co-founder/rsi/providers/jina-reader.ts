import 'server-only';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

export interface JinaReaderResult {
  success: boolean;
  title: string;
  markdown: string;
  status: number;
  error?: string;
}

/**
 * Jina Reader Adapter
 * Converts a known safe public URL into clean LLM-ready Markdown.
 * Uses the free, no-card r.jina.ai endpoint (20 RPM limit).
 * Strictly enforces SSRF validation before dispatch.
 */
export async function readWithJinaReader(
  targetUrl: string
): Promise<JinaReaderResult> {
  // 1. Mandatory SSRF Validation: reject localhost, private IPs, AWS/Cloud metadata
  await assertSafeOutboundUrl(targetUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s budget

  try {
    const jinaEndpoint = `https://r.jina.ai/${encodeURI(targetUrl)}`;
    const res = await fetch(jinaEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        success: false,
        title: '',
        markdown: '',
        status: res.status,
        error: `Jina Reader returned HTTP error ${res.status}`,
      };
    }

    const markdown = await res.text();

    // Extract title from first markdown H1 if present
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1].trim() : '';

    return {
      success: true,
      title,
      markdown: markdown.slice(0, 15000), // Enforce 15k char cap
      status: 200,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      title: '',
      markdown: '',
      status: 500,
      error: isTimeout
        ? 'Jina Reader timed out after 15s.'
        : err?.message || 'Jina Reader fetch error.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
