jest.mock('server-only', () => ({}));

import { createLiveKitToken, verifyLiveKitToken } from '../token';
import { LIVEKIT_ROOM_SETTINGS } from '../config';

describe('LiveKit Token System', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LIVEKIT_URL: 'wss://ruhvi-rkkfx6qd.livekit.cloud',
      LIVEKIT_API_KEY: 'APIEmGTosWpnWBo',
      LIVEKIT_API_SECRET: 'ubzWgLqZbYEqKAr5sbZyrwj8E1AW72LFkKfsWS8lVSF',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('correctly mints a signed JWT with user permissions and room grants', async () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const identity = LIVEKIT_ROOM_SETTINGS.getUserIdentity(userId);
    const roomName = `${LIVEKIT_ROOM_SETTINGS.roomPrefix}test-session`;

    const token = await createLiveKitToken({
      identity,
      name: 'Admin User',
      roomName,
      ttlSeconds: 900,
      permissions: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    });

    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // Standard JWT format

    // Verify claims with verifyLiveKitToken
    const claims = await verifyLiveKitToken(token);

    expect(claims.iss).toBe('APIEmGTosWpnWBo');
    expect(claims.sub).toBe(identity);
    expect(claims.name).toBe('Admin User');
    expect(claims.video?.room).toBe(roomName);
    expect(claims.video?.roomJoin).toBe(true);
    expect(claims.video?.canPublish).toBe(true);
    expect(claims.video?.canSubscribe).toBe(true);
    expect(claims.video?.canPublishData).toBe(true);
    expect(typeof claims.exp).toBe('number');
    expect(claims.exp! - claims.nbf!).toBeCloseTo(905, -1);
  });

  it('rejects verification if signed with incorrect secret', async () => {
    const token = await createLiveKitToken({
      identity: 'user_123',
      roomName: 'room_123',
    });

    // Change secret to invalid secret
    process.env.LIVEKIT_API_SECRET = 'invalid_secret_abcdef123456';
    await expect(verifyLiveKitToken(token)).rejects.toThrow();
  });
});
