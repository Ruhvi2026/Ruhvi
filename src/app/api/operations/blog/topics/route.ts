import { NextResponse } from 'next/server';

const DEFAULT_WEBHOOK_URL =
  'https://n8n.ruhvi.in/webhook/eabfa347-d54a-4b71-87ca-c61fe5a8265b';

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = (payload || {}) as Record<string, unknown>;
  const niche = typeof body.niche === 'string' ? body.niche.trim() : '';
  const seedQueries = Array.isArray(body.seed_queries)
    ? body.seed_queries
        .filter((q): q is string => typeof q === 'string')
        .map((q) => q.trim())
        .filter(Boolean)
    : [];

  if (!niche || seedQueries.length === 0) {
    return NextResponse.json(
      { error: 'niche and non-empty seed_queries are required' },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_TOPICS_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ niche, seed_queries: seedQueries }),
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
        error: 'Failed to reach the topics webhook',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
