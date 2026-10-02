import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getLiveKitConfig, LIVEKIT_ROOM_SETTINGS } from '@/lib/livekit/config';
import { createLiveKitToken } from '@/lib/livekit/token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Secure LiveKit Access Token Endpoint for AI Co-Founder Voice Sessions
 *
 * Requirements satisfied:
 * - Runs server-side only.
 * - Authenticates admin session using existing requireAdmin().
 * - Binds token strictly to authenticated user's ID and role.
 * - Generates short-lived tokens (15 minutes).
 * - Never leaks LIVEKIT_API_SECRET to the client.
 * - Reuses existing Ruhvi session auth without creating redundant auth layers.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user using existing Ruhvi session auth
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    // 2. Parse optional room parameters
    let requestedRoom: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.roomName === 'string') {
        requestedRoom = body.roomName
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 64);
      }
    } catch {
      // Body is optional
    }

    const liveKitConfig = getLiveKitConfig();
    const userId = auth.uid;
    const roomName =
      requestedRoom ||
      `${LIVEKIT_ROOM_SETTINGS.roomPrefix}${userId.slice(0, 8)}-${Date.now()}`;
    const identity = LIVEKIT_ROOM_SETTINGS.getUserIdentity(userId);

    // 3. Mint short-lived token using server-side generator
    const token = await createLiveKitToken({
      identity,
      name: `Admin (${auth.role || 'staff'})`,
      roomName,
      ttlSeconds: LIVEKIT_ROOM_SETTINGS.defaultTtlSeconds,
      permissions: LIVEKIT_ROOM_SETTINGS.userPermissions,
    });

    return NextResponse.json({
      token,
      url: liveKitConfig.url,
      roomName,
      identity,
      expiresIn: LIVEKIT_ROOM_SETTINGS.defaultTtlSeconds,
    });
  } catch (error: any) {
    console.error('LiveKit Token Generation Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate voice session token' },
      { status: 500 }
    );
  }
}
