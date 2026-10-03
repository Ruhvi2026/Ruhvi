import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { browseWebPageWithPlaywright } from '@/lib/ai/browser/playwright';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * AI Co-Founder Real-time Playwright Web Browsing Endpoint
 *
 * Allows on-demand and autonomous browser navigation with
 * DOM extraction, pricing pattern detection, and screenshot capture.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { url, waitForSelector, timeoutMs, captureScreenshot = true } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required to browse a website' },
        { status: 400 }
      );
    }

    const result = await browseWebPageWithPlaywright({
      url,
      waitForSelector,
      timeoutMs: timeoutMs || 20000,
      captureScreenshot: captureScreenshot !== false,
    });

    return NextResponse.json({
      ok: result.status < 400,
      data: result,
    });
  } catch (error: any) {
    console.error('[Co-Founder Browse Route Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to browse website' },
      { status: 500 }
    );
  }
}
