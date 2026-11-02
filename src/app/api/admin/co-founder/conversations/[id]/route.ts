// src/app/api/admin/co-founder/conversations/[id]/route.ts
//
// GET    /api/admin/co-founder/conversations/[id]  → Get conversation & sequential messages
// PATCH  /api/admin/co-founder/conversations/[id]  → Rename conversation title
// DELETE /api/admin/co-founder/conversations/[id]  → Delete conversation thread

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ConversationRepository } from '@/lib/ai/co-founder/conversations/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const data = await ConversationRepository.getConversationWithMessages(
      id,
      auth.uid
    );

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (err: any) {
    console.error('[co-founder/conversations/[id] GET] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch conversation' },
      { status: 404 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const updated = await ConversationRepository.updateConversationTitle(
      id,
      auth.uid,
      title.trim()
    );

    return NextResponse.json({
      success: true,
      conversation: updated,
    });
  } catch (err: any) {
    console.error('[co-founder/conversations/[id] PATCH] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    await ConversationRepository.deleteConversation(id, auth.uid);

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (err: any) {
    console.error('[co-founder/conversations/[id] DELETE] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
