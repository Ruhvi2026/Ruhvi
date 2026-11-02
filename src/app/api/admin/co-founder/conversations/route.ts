// src/app/api/admin/co-founder/conversations/route.ts
//
// GET  /api/admin/co-founder/conversations  → List Co-Founder conversation threads
// POST /api/admin/co-founder/conversations  → Create a new conversation thread

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ConversationRepository } from '@/lib/ai/co-founder/conversations/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'cofounder') as
      'cofounder' | 'worker';
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50;

    const conversations = await ConversationRepository.listConversations(
      auth.uid,
      type,
      limit
    );

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (err: any) {
    console.error('[co-founder/conversations GET] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, conversationType = 'cofounder', workerId, summary } = body;

    const conversation = await ConversationRepository.createConversation({
      userId: auth.uid,
      conversationType,
      workerId: workerId || null,
      title: title || 'New Conversation',
      summary,
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (err: any) {
    console.error('[co-founder/conversations POST] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
