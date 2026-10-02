import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getCoFounderSystemPrompt,
  CO_FOUNDER_TOOL_DECLARATIONS,
} from '@/lib/ai/co-founder/brain';
import { getLiveKitConfig, LIVEKIT_ROOM_SETTINGS } from '@/lib/livekit/config';
import { createLiveKitToken } from '@/lib/livekit/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Co-Founder Voice & Brain Session Initialization Endpoint
 *
 * Provides the frontend with:
 * 1. LiveKit room token and URL for WebRTC audio
 * 2. Unified system instructions from the Co-Founder Brain
 * 3. Available tool declarations
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const roomName =
      body?.roomName ||
      `${LIVEKIT_ROOM_SETTINGS.roomPrefix}${auth.uid.slice(0, 8)}-${Date.now()}`;
    const identity = LIVEKIT_ROOM_SETTINGS.getUserIdentity(auth.uid);

    // 1. Generate LiveKit token
    const token = await createLiveKitToken({
      identity,
      name: `Founder (${auth.role || 'admin'})`,
      roomName,
      permissions: LIVEKIT_ROOM_SETTINGS.userPermissions,
    });

    const liveKitConfig = getLiveKitConfig();

    // 2. Fetch unified Co-Founder Brain prompt
    const systemPrompt = await getCoFounderSystemPrompt({
      userRole: auth.role || 'super_admin',
      adminName: 'Founder',
    });

    return NextResponse.json({
      ok: true,
      roomName,
      identity,
      token,
      url: liveKitConfig.url,
      systemPrompt,
      tools: CO_FOUNDER_TOOL_DECLARATIONS,
    });
  } catch (error: any) {
    console.error('Session Init Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize session' },
      { status: 500 }
    );
  }
}
