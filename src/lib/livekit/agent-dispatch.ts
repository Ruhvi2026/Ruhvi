import 'server-only';

import { RoomServiceClient, AgentDispatchClient } from 'livekit-server-sdk';
import { getLiveKitConfig, LIVEKIT_ROOM_SETTINGS } from './config';
import { createLiveKitToken } from './token';

/**
 * LiveKit Agent Setup & Room Dispatch Manager
 *
 * Coordinates room lifecycle and agent connectivity for the Co-Founder voice sessions.
 */

export class LiveKitAgentManager {
  private roomService: RoomServiceClient;
  private agentDispatch: AgentDispatchClient;

  constructor() {
    const config = getLiveKitConfig();
    // LiveKit HTTP URL from WSS URL
    const httpUrl = config.url
      .replace(/^wss:\/\//, 'https://')
      .replace(/^ws:\/\//, 'http://');
    this.roomService = new RoomServiceClient(
      httpUrl,
      config.apiKey,
      config.apiSecret
    );
    this.agentDispatch = new AgentDispatchClient(
      httpUrl,
      config.apiKey,
      config.apiSecret
    );
  }

  /**
   * Generates a dedicated Agent AccessToken to join the Co-Founder room
   */
  async createAgentToken(roomName: string): Promise<string> {
    const identity = LIVEKIT_ROOM_SETTINGS.getAgentIdentity();
    return createLiveKitToken({
      identity,
      name: 'Ruhvi AI Co-Founder',
      roomName,
      ttlSeconds: LIVEKIT_ROOM_SETTINGS.defaultTtlSeconds,
      permissions: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: true,
      },
    });
  }

  /**
   * Ensure a room exists with the correct configuration
   */
  async ensureRoom(roomName: string) {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      if (rooms.length === 0) {
        await this.roomService.createRoom({
          name: roomName,
          emptyTimeout: 300, // 5 minutes timeout if empty
          maxParticipants: 10,
        });
      }
      return { ok: true, roomName };
    } catch (err: any) {
      console.warn('ensureRoom note:', err?.message);
      // Non-fatal if room is auto-created on join
      return { ok: true, roomName };
    }
  }

  /**
   * Dispatch LiveKit Cloud agent to the room if using server-side agent worker
   */
  async dispatchAgent(roomName: string, agentName = 'co-founder-agent') {
    try {
      const dispatch = await this.agentDispatch.createDispatch(
        roomName,
        agentName,
        {
          metadata: JSON.stringify({
            type: 'co_founder_voice',
            startedAt: Date.now(),
          }),
        }
      );
      return { ok: true, dispatch };
    } catch (err: any) {
      // In self-orchestrated or client-bridged mode, fallback gracefully
      return { ok: false, error: err?.message };
    }
  }

  /**
   * Send data message to participants in the room
   */
  async sendDataToRoom(
    roomName: string,
    data: Uint8Array | string,
    topic?: string
  ) {
    const payload =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await this.roomService.sendData(roomName, payload, 0, { topic });
  }

  /**
   * Close voice room session
   */
  async closeRoom(roomName: string) {
    try {
      await this.roomService.deleteRoom(roomName);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  }
}

export const liveKitAgentManager = new LiveKitAgentManager();
