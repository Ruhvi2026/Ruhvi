import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { liveKitAgentManager } from '@/lib/livekit/agent-dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomName } = await req.json();
    if (!roomName) {
      return NextResponse.json(
        { error: 'roomName is required' },
        { status: 400 }
      );
    }

    await liveKitAgentManager.ensureRoom(roomName);
    const agentToken = await liveKitAgentManager.createAgentToken(roomName);
    const dispatchResult = await liveKitAgentManager.dispatchAgent(roomName);

    return NextResponse.json({
      ok: true,
      roomName,
      agentToken,
      dispatched: dispatchResult.ok,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Agent dispatch failed' },
      { status: 500 }
    );
  }
}
