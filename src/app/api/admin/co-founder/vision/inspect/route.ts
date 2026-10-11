import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  enforceCoFounderRateLimit,
  createRateLimitHeaders,
} from '@/lib/ai/co-founder/rate-limiter';
import { analyzeJewelryImage } from '@/lib/ai/co-founder/vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const rateLimitCheck = enforceCoFounderRateLimit(auth.uid, {
      tier: 'tool_execution',
      role: auth.role || 'founder',
    });
    if (!rateLimitCheck.success) {
      return rateLimitCheck.response!;
    }

    const body = await req.json();
    const { imageUrl, imageBase64, mimeType, productNameHint, categoryHint } =
      body || {};

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        {
          error:
            'Either imageUrl or imageBase64 is required for visual inspection',
        },
        { status: 400 }
      );
    }

    const result = await analyzeJewelryImage({
      imageUrl,
      imageBase64,
      mimeType,
      productNameHint,
      categoryHint,
    });

    const rateHeaders = createRateLimitHeaders(rateLimitCheck.result);
    return NextResponse.json(result, { headers: rateHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Visual inspection failed' },
      { status: 500 }
    );
  }
}
