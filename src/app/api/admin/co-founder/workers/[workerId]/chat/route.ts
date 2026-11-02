// src/app/api/admin/co-founder/workers/[workerId]/chat/route.ts
//
// POST /api/admin/co-founder/workers/[workerId]/chat  → Direct 1:1 conversation with a specialist AI worker

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { handleWorkerDirectChat } from '@/lib/ai/co-founder/workers/worker-chat-service';
import { WorkerId } from '@/lib/ai/co-founder/workers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ workerId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workerId } = await context.params;
    const body = await req.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    const result = await handleWorkerDirectChat(
      auth.uid,
      workerId as WorkerId,
      message.trim()
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[worker/chat POST] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Worker direct chat failed' },
      { status: 500 }
    );
  }
}
