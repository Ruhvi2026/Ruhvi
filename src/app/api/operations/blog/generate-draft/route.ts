import { NextResponse } from 'next/server';

const DEFAULT_WEBHOOK_URL = 'http://n8n.ruhvi.in/webhook/generate-blog-draft';

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
    let res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, keywords }),
      cache: 'no-store',
    });

    let text = await res.text();

    // Fallback if https returns 404 but http is accessible
    if (!res.ok && res.status === 404 && webhookUrl.startsWith('https://')) {
      const httpUrl = webhookUrl.replace(/^https:\/\//, 'http://');
      const httpRes = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, keywords }),
        cache: 'no-store',
      });
      if (httpRes.ok) {
        res = httpRes;
        text = await httpRes.text();
      }
    }

    // Fallback to GET if webhook returned 404/405 because n8n is configured for GET
    if (
      !res.ok &&
      (res.status === 404 || res.status === 405 || text.includes('GET request'))
    ) {
      const url = new URL(webhookUrl);
      if (topic) url.searchParams.set('topic', topic);
      if (keywords.length > 0)
        url.searchParams.set('keywords', keywords.join(','));

      const getRes = await fetch(url.toString(), {
        method: 'GET',
        cache: 'no-store',
      });
      if (getRes.ok) {
        res = getRes;
        text = await getRes.text();
      }
    }

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
