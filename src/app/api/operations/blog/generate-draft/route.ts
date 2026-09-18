import { NextResponse } from 'next/server';

const DEFAULT_WEBHOOK_URL = 'https://n8n.ruhvi.in/webhook/generate-blog-draft';

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = (payload || {}) as Record<string, unknown>;
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const keywords = Array.isArray(body.keywords)
    ? body.keywords
        .filter((k): k is string => typeof k === 'string')
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  const webhookUrl =
    process.env.N8N_GENERATE_BLOG_DRAFT_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, keywords }),
      cache: 'no-store',
    });

    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // keep raw text if webhook did not return JSON
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Webhook responded with ${res.status}`, detail: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to reach the blog draft webhook',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
