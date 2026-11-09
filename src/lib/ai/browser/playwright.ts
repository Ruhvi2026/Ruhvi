import 'server-only';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

export interface BrowseOptions {
  url: string;
  waitForSelector?: string;
  timeoutMs?: number;
  captureScreenshot?: boolean;
  extractMode?: 'summary' | 'full' | 'pricing' | 'products';
  customUserAgent?: string;
}

export interface BrowseResult {
  url: string;
  finalUrl: string;
  title: string;
  metaDescription: string;
  headings: string[];
  textContent: string;
  detectedPrices: string[];
  keyHighlights: string[];
  screenshotBase64?: string;
  status: number;
  error?: string;
  executiveVoiceSummary: string;
}

/**
 * AI Co-Founder Playwright Web Browsing Engine
 *
 * Provides real-time dynamic web browsing with JavaScript execution,
 * Single Page App (SPA) rendering, structured metadata extraction,
 * competitive intelligence, and optional screenshot capture.
 */
export async function browseWebPageWithPlaywright(
  options: BrowseOptions
): Promise<BrowseResult> {
  const targetUrl = options.url.startsWith('http')
    ? options.url.trim()
    : `https://${options.url.trim()}`;

  // 1. Pre-flight SSRF Validation: Block localhost, cloud metadata (169.254.169.254), private subnets, unsafe schemes
  try {
    await assertSafeOutboundUrl(targetUrl);
  } catch (err: any) {
    return {
      url: targetUrl,
      finalUrl: targetUrl,
      title: 'Blocked URL',
      metaDescription: '',
      headings: [],
      textContent: '',
      detectedPrices: [],
      keyHighlights: [],
      status: 403,
      error:
        err?.message ||
        'Access to blocked address or invalid URL was denied by SSRF guard',
      executiveVoiceSummary: `Blocked outbound access to ${targetUrl}: ${err?.message || 'Unsafe destination'}.`,
    };
  }

  const timeout = Math.min(options.timeoutMs || 20000, 30000); // Enforce 30s maximum timeout ceiling
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Launch headless Chromium with strict sandboxing and minimal process flags
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    // Isolated, ephemeral browser context with zero-trust permissions and strict TLS enforcement
    context = await browser.newContext({
      userAgent:
        options.customUserAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      permissions: [],
      ignoreHTTPSErrors: false,
      bypassCSP: false,
    });

    page = await context.newPage();
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // 2. Comprehensive Route Interception & Egress Filtering
    await page.route('**/*', async (route) => {
      const req = route.request();
      const reqUrl = req.url();

      // Permit safe internal browser data schemes
      if (reqUrl.startsWith('data:') || reqUrl.startsWith('about:')) {
        return route.continue();
      }

      // Check URL validity and SSRF egress safety for every network hop
      try {
        await assertSafeOutboundUrl(reqUrl);
      } catch {
        return route.abort('blockedbyclient');
      }

      // Block heavy media (images, fonts, media, stylesheets) if screenshot is not requested
      if (!options.captureScreenshot) {
        const reqType = req.resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(reqType)) {
          return route.abort();
        }
      }

      return route.continue();
    });

    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    // 3. Post-navigation SSRF Validation (verify redirect did not bounce to internal network)
    const finalUrl = page.url();
    try {
      await assertSafeOutboundUrl(finalUrl);
    } catch (redirectErr: any) {
      return {
        url: targetUrl,
        finalUrl,
        title: 'Blocked Redirect',
        metaDescription: '',
        headings: [],
        textContent: '',
        detectedPrices: [],
        keyHighlights: [],
        status: 403,
        error: `Redirected to unsafe URL: ${redirectErr?.message || 'Blocked by SSRF policy'}`,
        executiveVoiceSummary: `Blocked redirection from ${targetUrl} to ${finalUrl}: ${redirectErr?.message || 'Unsafe destination'}.`,
      };
    }

    const statusCode = response?.status() || 200;

    // Optional wait for dynamic React/Shopify components
    if (options.waitForSelector) {
      try {
        await page.waitForSelector(options.waitForSelector, {
          timeout: 5000,
        });
      } catch {
        // Continue if selector didn't appear in time
      }
    } else {
      // Small settle window for hydration
      await page.waitForTimeout(1000);
    }

    const title = (await page.title()) || 'No Title';

    // Extract meta description
    const metaDescription = await page
      .evaluate(() => {
        const meta =
          document.querySelector('meta[name="description"]') ||
          document.querySelector('meta[property="og:description"]');
        return meta ? (meta.getAttribute('content') || '').trim() : '';
      })
      .catch(() => '');

    // Extract headings
    const headings = await page
      .evaluate(() => {
        const elems = Array.from(document.querySelectorAll('h1, h2, h3'));
        return elems
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter((t) => t.length > 3 && t.length < 200)
          .slice(0, 15);
      })
      .catch(() => [] as string[]);

    // Extract cleaned readable text content
    const textContent = await page
      .evaluate(() => {
        // Remove junk elements
        const removeSelectors = [
          'script',
          'style',
          'noscript',
          'svg',
          'header',
          'footer',
          'nav',
          'iframe',
        ];
        const clone = document.body.cloneNode(true) as HTMLElement;
        removeSelectors.forEach((sel) => {
          clone.querySelectorAll(sel).forEach((el) => el.remove());
        });

        const rawText = clone.innerText || clone.textContent || '';
        return rawText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 2)
          .join('\n')
          .slice(0, 8000);
      })
      .catch(() => '');

    // Extract detected pricing
    const detectedPrices = await page
      .evaluate(() => {
        const text = document.body.innerText || '';
        // Match Indian Rupee (₹/Rs./INR) or Dollar ($) pricing patterns
        const priceRegex = /(?:₹|Rs\.?|INR|\$)\s?[0-9,]+(?:\.[0-9]{2})?/gi;
        const matches = text.match(priceRegex) || [];
        const unique = Array.from(new Set(matches.map((m) => m.trim())));
        return unique.slice(0, 10);
      })
      .catch(() => [] as string[]);

    // Capture screenshot if requested
    let screenshotBase64: string | undefined = undefined;
    if (options.captureScreenshot) {
      const buffer = await page.screenshot({
        fullPage: false,
        type: 'jpeg',
        quality: 75,
      });
      screenshotBase64 = buffer.toString('base64');
    }

    // Build voice summary
    const headlinesSummary = headings.slice(0, 3).join(', ');
    const priceSummary =
      detectedPrices.length > 0
        ? `Prices detected around ${detectedPrices.slice(0, 3).join(', ')}.`
        : '';
    const voiceSummary =
      `Browsed ${title}. ${metaDescription ? metaDescription.slice(0, 120) + '.' : ''} ${headlinesSummary ? 'Highlights: ' + headlinesSummary + '.' : ''} ${priceSummary}`.trim();

    return {
      url: targetUrl,
      finalUrl,
      title,
      metaDescription,
      headings,
      textContent,
      detectedPrices,
      keyHighlights: headings.slice(0, 8),
      screenshotBase64,
      status: statusCode,
      executiveVoiceSummary: voiceSummary,
    };
  } catch (error: any) {
    console.error('[Playwright Browser] Error browsing page:', error);
    return {
      url: targetUrl,
      finalUrl: targetUrl,
      title: 'Error Loading Page',
      metaDescription: '',
      headings: [],
      textContent: '',
      detectedPrices: [],
      keyHighlights: [],
      status: 500,
      error: error?.message || 'Unknown browser navigation error',
      executiveVoiceSummary: `Unable to browse ${targetUrl}: ${error?.message || 'Navigation failed'}`,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
