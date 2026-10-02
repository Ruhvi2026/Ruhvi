import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getCompetitors,
  addCompetitor,
  deleteCompetitor,
  analyzeCompetitor,
} from '@/lib/ai/co-founder/competitors';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const list = await getCompetitors();
    return NextResponse.json({ competitors: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    if (body.action === 'analyze') {
      if (!body.id) {
        return NextResponse.json(
          { error: 'Competitor id is required' },
          { status: 400 }
        );
      }
      const res = await analyzeCompetitor(body.id);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        insights: res.insights,
        voiceSummary: res.voiceSummary,
      });
    }

    // Add competitor
    if (!body.name || !body.website_url) {
      return NextResponse.json(
        { error: 'name and website_url are required' },
        { status: 400 }
      );
    }

    const res = await addCompetitor({
      name: body.name,
      websiteUrl: body.website_url,
      category: body.category,
      notes: body.notes,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, competitor: res.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'Competitor ID is required' },
        { status: 400 }
      );
    }

    const res = await deleteCompetitor(id);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
