import 'server-only';

/**
 * LiveKit Cloud Configuration & Room Constants
 *
 * Secure server-side module for LiveKit Cloud integration.
 * The API secret is NEVER exposed to the frontend.
 */

export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function getLiveKitConfig(): LiveKitConfig {
  const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url) {
    throw new Error('LIVEKIT_URL environment variable is missing.');
  }
  if (!apiKey) {
    throw new Error('LIVEKIT_API_KEY environment variable is missing.');
  }
  if (!apiSecret) {
    throw new Error('LIVEKIT_API_SECRET environment variable is missing.');
  }

  return { url, apiKey, apiSecret };
}

export const LIVEKIT_ROOM_SETTINGS = {
  /** Prefix for all AI Co-Founder voice rooms */
  roomPrefix: 'co-founder-',
  /** Max session duration before automatic refresh (seconds) */
  defaultTtlSeconds: 15 * 60, // 15 minutes
  /** Participant permissions for user */
  userPermissions: {
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    hidden: false,
  },
  /** Participant identity format */
  getUserIdentity: (userId: string) => `user_${userId}`,
  getAgentIdentity: () => `agent_co_founder`,
};
