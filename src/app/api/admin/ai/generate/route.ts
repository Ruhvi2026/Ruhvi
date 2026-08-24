import { NextResponse } from 'next/server';
import { generateAIContent } from '@/lib/ai';
import { generateProductContentPrompt } from '@/lib/ai/prompts';
import { requireAdmin } from '@/lib/auth/require-admin';

// Simple in-memory rate limiter for Admin API
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // max requests
const WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  try {
    // 1. Security Check: Ensure user is an admin
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const uid = auth.uid;

    // Rate Limiting (by UID)
    const now = Date.now();
    const userLimit = rateLimitMap.get(uid);
    if (!userLimit || userLimit.resetTime < now) {
      rateLimitMap.set(uid, { count: 1, resetTime: now + WINDOW_MS });
    } else {
      if (userLimit.count >= RATE_LIMIT) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Try again later.' },
          { status: 429 }
        );
      }
      userLimit.count++;
    }

    // 2. Parse payload
    const body = await req.json();
    const { productData } = body;

    if (!productData || !productData.name) {
      return NextResponse.json(
        { error: 'Product name is required to generate content.' },
        { status: 400 }
      );
    }

    // SECURITY: Limit input size to prevent prompt flooding
    if (JSON.stringify(productData).length > 20000) {
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    // 3. Prepare AI Service Prompt
    const prompt = await generateProductContentPrompt(
      productData,
      'product_description'
    );

    // 4. Generate Content (now with fallback and logging)
    const generatedContent = await generateAIContent(
      'product_description',
      prompt
    );

    return NextResponse.json({ success: true, data: generatedContent });
  } catch (error: any) {
    console.error('AI Generation API Error:', error);
    // SECURITY: Return generic error to client
    return NextResponse.json(
      { error: 'An error occurred during AI generation. Check server logs.' },
      { status: 500 }
    );
  }
}
