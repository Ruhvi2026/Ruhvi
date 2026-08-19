import { NextResponse } from 'next/server';
import { generateAIContent } from '@/lib/ai';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

// Simple in-memory rate limiter for Audit API
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // max requests
const WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(req: Request) {
  try {
    // 1. Security Check: Authenticated session
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

    // 2. Parse payload
    const body = await req.json();
    const { productData } = body;

    if (!productData || !productData.name) {
      return NextResponse.json(
        { error: 'Product name is required to audit content.' },
        { status: 400 }
      );
    }

    // SECURITY: Limit input size to prevent prompt flooding
    if (JSON.stringify(productData).length > 25000) {
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    // 3. Construct the prompt for the AI SEO Audit
    const auditPrompt = `
You are a world-class E-commerce SEO Expert, Copywriter, and SEO Auditor specializing in luxury, premium jewelry (rings, necklaces, earrings, bracelets, bangles, pendants, chains, anklets, nose-pins, mangalsutra).
Analyze the following product details and perform a comprehensive SEO readiness and completeness audit of the product detail page.

PRODUCT DATA TO AUDIT:
- Product Name: "${productData.name}"
- Slug: "${productData.slug}"
- Category: "${productData.category || 'Not specified'}"
- Selling Price: ₹${productData.price || 'Not specified'}
- MRP (Original Price): ₹${productData.mrp || 'Not specified'}
- Description: "${productData.description || 'Not specified'}"
- Product Height: ${productData.height ? productData.height + ' cm' : 'Not specified'}
- Product Width: ${productData.width ? productData.width + ' cm' : 'Not specified'}
- Product Length: ${productData.length ? productData.length + ' cm' : 'Not specified'}
- Product Weight: ${productData.weight ? productData.weight + ' g' : 'Not specified'}
- SEO Meta Title: "${productData.seo_title || 'Not specified'}"
- SEO Meta Description: "${productData.meta_description || 'Not specified'}"
- Focus Keyword: "${productData.focus_keyword || 'Not specified'}"
- Product Tags: "${productData.product_tags || 'Not specified'}"

AUDIT REQUIREMENTS & CHECKLIST:
1. SEO Meta Title: Check if it is engaging, optimized with the focus keyword, and within 60 characters.
2. SEO Meta Description: Check if it is persuasive, contains the focus keyword, has a call-to-action (CTA), and is within 160 characters.
3. Product Description: Check if it is detailed, utilizes luxurious vocabulary suitable for premium jewelry, and integrates focus/secondary keywords naturally.
4. Focus Keyword: Ensure the focus keyword appears in the name/title, description, and meta description.
5. Product Tags: Check if tags are descriptive (karatage, hallmarking, style, material) and optimal for search.
6. Dimension Data: Check if height, width, length, or weight are specified. If any are missing, suggest adding them as a recommendation for complete listings, but do NOT fail the audit solely on this since they are optional.
7. Return a numerical score from 0 to 100 based on overall readiness.

Provide concrete recommendations in the "feedback" list.
Also, output fully optimized, improved values in the "updated_fields" section (especially for Description, SEO Title, Meta Description, and Product Tags) so the user can easily auto-apply your improvements to raise their score to 100.
Enforce a brand tone that is Luxurious, Premium, and Trustworthy.

Your output must be a valid, parsable JSON response exactly matching the schema below.
Do NOT wrap the response in markdown \`\`\`json blocks. Return only the raw JSON.

JSON SCHEMA EXPECTED:
{
  "seo_ready": boolean,
  "score": number,
  "feedback": [
    "Critique or recommendation 1",
    "Critique or recommendation 2",
    ...
  ],
  "updated_fields": {
    "name": "Optimized Name (keep original if already optimal)",
    "description": "Optimized Product Description (rich in keywords and brand value)",
    "seo_title": "Optimized SEO Title (Max 60 chars)",
    "meta_description": "Optimized Meta Description (Max 160 chars)",
    "product_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  }
}
`;

    // 4. Generate Audit content (reusing standard seo_metadata config & credentials routing)
    const auditResult = await generateAIContent('seo_metadata', auditPrompt);

    return NextResponse.json({ success: true, data: auditResult });
  } catch (error: any) {
    console.error('AI SEO Audit Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during AI SEO audit.' },
      { status: 500 }
    );
  }
}
