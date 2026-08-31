import { NextResponse } from 'next/server';
import { generateAIContent } from '@/lib/ai';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { specs } = body;

    if (!specs) {
      return NextResponse.json(
        { error: 'Product specs are required.' },
        { status: 400 }
      );
    }

    if (JSON.stringify(specs).length > 20000) {
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      );
    }

    const prompt = `You are a jewelry e-commerce copywriter for Ruhvi, a premium gold-plated jewelry brand. Given these product specs, generate the requested content.

PRODUCT SPECS:
${JSON.stringify(specs, null, 2)}

INSTRUCTIONS:
Generate a JSON object with these exact fields (no markdown, no code fences, just raw JSON):
{
  "product_name": "A compelling SEO-friendly product name (max 60 chars, omit if already provided)",
  "description": "A 100-150 word product description that is persuasive, SEO-friendly, and highlights the jewelry's features and craftsmanship",
  "meta_title": "SEO meta title under 60 characters",
  "meta_description": "SEO meta description under 160 characters",
  "seo_keywords": ["5-8 relevant SEO keywords as an array of strings"]
}

If product_name is already provided in the specs, set it to null.`;

    const generatedContent = await generateAIContent(
      'product_description',
      prompt
    );

    return NextResponse.json({ success: true, data: generatedContent });
  } catch (error: any) {
    console.error('Operations AI Generation Error:', error);
    return NextResponse.json(
      { error: 'An error occurred during AI generation. Check server logs.' },
      { status: 500 }
    );
  }
}
