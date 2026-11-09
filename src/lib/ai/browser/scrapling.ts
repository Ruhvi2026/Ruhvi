import 'server-only';
import { spawn } from 'child_process';
import { browseWebPageWithPlaywright, BrowseResult } from './playwright';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

export interface ScraplingOptions {
  url: string;
  timeoutMs?: number;
  solveCloudflare?: boolean;
  cssSelector?: string;
  aiTargeted?: boolean;
}

export interface ScraplingBrowseResult {
  url: string;
  title: string;
  headings: { h1: string[]; h2: string[] };
  textContent: string;
  markdownContent: string;
  detectedPricing: string[];
  status: number;
  engine: 'scrapling_stealth' | 'playwright_fallback';
  antiBotBypassed: boolean;
  error?: string;
}

/**
 * Universal Scrapling Research Mandate
 * Injected into AI Worker system instructions for competitor and market research
 */
export const SCRAPLING_RESEARCH_MANDATE = `
=== SCRAPLING ADAPTIVE RESEARCH & STEALTH SCRAPING MANDATE ===
When auditing competitor websites, jewelry pricing, or promotional campaigns:
1. ADAPTIVE PARSING OVER BRITTLE SELECTORS:
   - Do NOT assume static CSS class names on competitor e-commerce sites (e.g. Shopify/Magento sites frequently regenerate hashes).
   - Use adaptive text-based, semantic, and relational element tracking to reliably extract product prices, discounts, and karat specifications.
2. ANTI-BOT & CLOUDFLARE TURNSTILE RESILIENCE:
   - Expect major jewelry competitors (Giva, CaratLane, Palmonas, Bluestone) to be protected by Cloudflare WAF, Turnstile, or browser fingerprinting.
   - Utilize Scrapling's stealth browser headers and automated Turnstile challenge resolution to avoid 403 Forbidden blocks.
3. AI-TARGETED CLEAN MARKDOWN:
   - Strip out script tags, cookie banners, navigation drawers, and advertising bloat before LLM reasoning.
   - Focus strictly on verified product titles, stated metal purity (e.g. 18K vs 22K), warranty duration, and live checkout price points.
=== END SCRAPLING MANDATE ===
`.trim();

/**
 * Fixed Scrapling runner script.
 * Inputs: sys.argv[1] = targetUrl, sys.argv[2] = timeoutSec
 * Strictly avoids string concatenation or code generation from user input.
 */
const SCRAPLING_PYTHON_SCRIPT = `
import sys
import json
import re

if len(sys.argv) < 2:
    print(json.dumps({"success": False, "error": "No target URL provided"}))
    sys.exit(0)

target_url = sys.argv[1]
timeout_sec = int(sys.argv[2]) if len(sys.argv) > 2 else 25

try:
    from scrapling.fetchers import StealthyFetcher
    page = StealthyFetcher.fetch(target_url, solve_cloudflare=True, timeout=timeout_sec)
    title = page.css("title::text").get() or ""
    h1_list = page.css("h1::text").getall() or []
    h2_list = page.css("h2::text").getall() or []
    
    # Extract visible prices (₹ or INR or numbers)
    raw_text = page.text or ""
    prices = list(set(re.findall(r'(?:₹|INR|Rs\\.?)\\s*[0-9,]+', raw_text)))[:8]
    
    md = page.get_markdown() if hasattr(page, 'get_markdown') else raw_text[:4000]
    
    print(json.dumps({
        "success": True,
        "title": (title or "").strip(),
        "headings": {"h1": h1_list[:4], "h2": h2_list[:6]},
        "textContent": raw_text[:5000],
        "markdownContent": md[:8000],
        "detectedPricing": prices,
        "status": getattr(page, 'status', 200),
        "antiBotBypassed": True
    }))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`.trim();

/**
 * Executes Scrapling Python fetcher via spawn with shell: false.
 * Prevents OS command injection and argument splitting vulnerabilities.
 */
function executeSafeScraplingProcess(
  url: string,
  timeoutSec: number,
  maxWaitMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'python',
      ['-c', SCRAPLING_PYTHON_SCRIPT, url, String(timeoutSec)],
      {
        shell: false,
        windowsHide: true,
      }
    );

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      try {
        child.kill('SIGTERM');
      } catch {}
      reject(new Error(`Scrapling execution timed out after ${maxWaitMs}ms`));
    }, maxWaitMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (code !== 0 && !stdout.trim()) {
          reject(
            new Error(`Python process exited with code ${code}: ${stderr}`)
          );
        } else {
          resolve(stdout.trim());
        }
      }
    });
  });
}

/**
 * Scrapes a competitor website using Scrapling stealth fetcher
 * Falls back to Playwright if Python Scrapling module is not available
 */
export async function scrapeCompetitorWithScrapling(
  options: ScraplingOptions
): Promise<ScraplingBrowseResult> {
  const targetUrl = options.url.startsWith('http')
    ? options.url.trim()
    : `https://${options.url.trim()}`;

  // 1. SSRF Pre-flight Validation: Block internal/loopback/cloud-metadata targets
  try {
    await assertSafeOutboundUrl(targetUrl);
  } catch (err: any) {
    return {
      url: targetUrl,
      title: 'Blocked URL',
      headings: { h1: [], h2: [] },
      textContent: '',
      markdownContent: '',
      detectedPricing: [],
      status: 403,
      engine: 'scrapling_stealth',
      antiBotBypassed: false,
      error:
        err?.message ||
        'Access to blocked address or invalid URL was denied by SSRF guard',
    };
  }

  const timeoutSec = Math.round((options.timeoutMs || 25000) / 1000);

  // 2. Attempt Scrapling stealth execution via Python if available (in non-test environments)
  if (process.env.NODE_ENV !== 'test') {
    try {
      const stdout = await executeSafeScraplingProcess(
        targetUrl,
        timeoutSec,
        (options.timeoutMs || 25000) + 5000
      );

      const parsed = JSON.parse(stdout);
      if (parsed.success) {
        return {
          url: targetUrl,
          title: parsed.title,
          headings: parsed.headings || { h1: [], h2: [] },
          textContent: parsed.textContent || '',
          markdownContent: parsed.markdownContent || '',
          detectedPricing: parsed.detectedPricing || [],
          status: parsed.status || 200,
          engine: 'scrapling_stealth',
          antiBotBypassed: true,
        };
      }
    } catch {
      // If Scrapling Python module is not yet installed or encountered an issue,
      // seamlessly fall back to our existing Playwright headless browser
    }
  }

  // 3. Playwright fallback execution (also protected with assertSafeOutboundUrl)
  const pwResult: BrowseResult = await browseWebPageWithPlaywright({
    url: targetUrl,
    timeoutMs: options.timeoutMs || 20000,
    extractMode: 'pricing',
  });

  const rawHeadings: any = pwResult.headings;
  const h1List = Array.isArray(rawHeadings?.h1)
    ? rawHeadings.h1
    : Array.isArray(rawHeadings)
      ? rawHeadings
      : [];
  const h2List = Array.isArray(rawHeadings?.h2) ? rawHeadings.h2 : [];

  const rawPrices =
    (pwResult as any).detectedPricing || pwResult.detectedPrices || [];
  const pricingList = Array.isArray(rawPrices) ? rawPrices : [];

  return {
    url: targetUrl,
    title: pwResult.title || '',
    headings: {
      h1: h1List,
      h2: h2List,
    },
    textContent: pwResult.textContent || '',
    markdownContent: pwResult.textContent || '',
    detectedPricing: pricingList,
    status: pwResult.status || 200,
    engine: 'playwright_fallback',
    antiBotBypassed: false,
    error: pwResult.error,
  };
}
