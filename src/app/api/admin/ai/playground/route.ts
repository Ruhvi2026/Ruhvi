import { NextResponse } from 'next/server';
import { generateAIContent } from '@/lib/ai';
import { generateProductContentPrompt } from '@/lib/ai/prompts';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

// Simple in-memory rate limiter for Admin API
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // max requests
const WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized. No active session.' },
        { status: 401 }
      );
    }

    let uid = 'unknown';
    try {
      const decoded = decodeJwt(sessionCookie);
      if (!decoded || !(decoded.firebase_uid || decoded.sub)) {
        return NextResponse.json(
          { error: 'Invalid session token.' },
          { status: 401 }
        );
      }
      uid = (decoded.firebase_uid || decoded.sub) as string;
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

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

    const body = await req.json();
    const { productData, featureKey } = body;

    if (!productData || !featureKey) {
      return NextResponse.json(
        { error: 'productData and featureKey are required.' },
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

    // 1. Prepare Prompt
    const prompt = await generateProductContentPrompt(productData, featureKey);

    // 2. Generate Content
    const generatedContent = await generateAIContent(featureKey, prompt);

    return NextResponse.json({ success: true, data: generatedContent });
  } catch (error: any) {
    console.error('Playground API Error:', error);
    // SECURITY: Return generic error to client
    return NextResponse.json(
      {
        error:
          'An error occurred during playground generation. Check server logs.',
      },
      { status: 500 }
    );
  }
}
