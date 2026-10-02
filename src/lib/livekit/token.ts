import 'server-only';

import * as jose from 'jose';
import { getLiveKitConfig, LIVEKIT_ROOM_SETTINGS } from './config';

export interface CreateLiveKitTokenOptions {
  identity: string;
  name?: string;
  roomName: string;
  ttlSeconds?: number;
  metadata?: string;
  attributes?: Record<string, string>;
  permissions?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    roomAdmin?: boolean;
  };
}

export interface LiveKitTokenClaims extends jose.JWTPayload {
  video?: {
    room: string;
    roomJoin: boolean;
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    roomAdmin?: boolean;
  };
  name?: string;
  metadata?: string;
  attributes?: Record<string, string>;
}

/**
 * Mint a standard LiveKit Cloud Access Token (HS256 JWT)
 *
 * Implements the official LiveKit protocol token specifications:
 * - Header: { alg: 'HS256', typ: 'JWT' }
 * - Issuer: LIVEKIT_API_KEY
 * - Subject: Participant identity
 * - Video Grants: roomJoin=true, room=<roomName>, canPublish, canSubscribe, canPublishData
 * - Expiration: Current epoch + ttlSeconds
 * - NotBefore: Current epoch - 5 (tolerates clock drift)
 */
export async function createLiveKitToken(
  options: CreateLiveKitTokenOptions
): Promise<string> {
  const config = getLiveKitConfig();
  const ttl = options.ttlSeconds || LIVEKIT_ROOM_SETTINGS.defaultTtlSeconds;
  const now = Math.floor(Date.now() / 1000);

  const payload: LiveKitTokenClaims = {
    iss: config.apiKey,
    sub: options.identity,
    nbf: now - 5,
    exp: now + ttl,
    name: options.name,
    metadata: options.metadata,
    attributes: options.attributes,
    video: {
      room: options.roomName,
      roomJoin: true,
      canPublish: options.permissions?.canPublish ?? true,
      canSubscribe: options.permissions?.canSubscribe ?? true,
      canPublishData: options.permissions?.canPublishData ?? true,
      roomAdmin: options.permissions?.roomAdmin ?? false,
    },
  };

  const secret = new TextEncoder().encode(config.apiSecret);

  const jwt = await new jose.SignJWT(payload as Record<string, any>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return jwt;
}

/**
 * Verify a LiveKit Access Token
 */
export async function verifyLiveKitToken(
  jwt: string
): Promise<LiveKitTokenClaims> {
  const config = getLiveKitConfig();
  const secret = new TextEncoder().encode(config.apiSecret);

  const { payload } = await jose.jwtVerify(jwt, secret, {
    issuer: config.apiKey,
  });

  return payload as LiveKitTokenClaims;
}
