/**
 * POST /api/admin/co-founder/studio/generate
 *
 * AI Studio Photography endpoint — accepts a real jewelry product image
 * (URL or base64) and returns 6 AI-generated e-commerce catalog frames
 * using Google Imagen 3 via the Studio Photography Engine.
 *
 * Authentication: Admin session required.
 * Rate limit:     Enforced at 'tool_execution' tier.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  enforceCoFounderRateLimit,
  createRateLimitHeaders,
} from '@/lib/ai/co-founder/rate-limiter';
import { generateStudioPhotos } from '@/lib/ai/co-founder/studio-photography';

export const runtime = 'nodejs';
export const maxDuration = 120; // Imagen 3 generation can take up to 2 min for 6 frames

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth guard
  const auth = await requireAdmin();
  if (!auth.ok || !auth.uid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const userId = auth.uid;

  // 2. Rate limiting — uses tool_execution tier
  const rateLimitCheck = enforceCoFounderRateLimit(userId, {
    tier: 'tool_execution',
    role: auth.role || 'founder',
  });
  if (!rateLimitCheck.success) {
    return rateLimitCheck.response!;
  }

  // 3. Parse request body
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    image_url,
    image_base64,
    mime_type,
    product_name,
    category_hint,
    upload_to_cloudinary,
  } = body;

  if (!image_url && !image_base64) {
    return NextResponse.json(
      { error: 'Either image_url or image_base64 must be provided.' },
      { status: 400 }
    );
  }

  // 4. Execute Studio Photography Engine
  try {
    const result = await generateStudioPhotos({
      imageUrl: image_url,
      imageBase64: image_base64,
      mimeType: mime_type,
      productName: product_name || 'Ruhvi Jewellery',
      categoryHint: category_hint,
      uploadToCloudinary: upload_to_cloudinary === true,
    });

    const rateHeaders = createRateLimitHeaders(rateLimitCheck.result);
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: rateHeaders,
    });
  } catch (err: any) {
    console.error('[studio/generate] Unhandled error:', err);
    return NextResponse.json(
      {
        error: 'Studio photography generation failed.',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
