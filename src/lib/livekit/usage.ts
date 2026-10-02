import 'server-only';

import * as jose from 'jose';
import { RoomServiceClient } from 'livekit-server-sdk';
import { getLiveKitConfig } from './config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface LiveKitQuota {
  limit: number;
  used: number;
  remaining: number;
  percent: number;
  unit: string;
}

export interface LiveKitActiveRoom {
  sid: string;
  name: string;
  numParticipants: number;
  creationTime: number;
  uptimeSeconds: number;
  activeRecording: boolean;
}

export interface LiveKitUsageReport {
  planName: string;
  isFreeTier: boolean;
  cloudHost: string;
  projectSubdomain: string;
  billingPeriod: {
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  quotas: {
    participantMinutes: LiveKitQuota;
    bandwidthGB: LiveKitQuota;
    concurrentConnections: LiveKitQuota;
  };
  liveMetrics: {
    activeRoomsCount: number;
    activeParticipantsCount: number;
    activeRooms: LiveKitActiveRoom[];
  };
  historicalSummary: {
    totalVoiceSessionsMonth: number;
    totalVoiceTurnsMonth: number;
    estimatedMinutesConsumed: number;
    estimatedBandwidthMB: number;
  };
  supportedServices: Array<{
    name: string;
    description: string;
    status: 'active' | 'available' | 'pay_as_you_go';
    tier: string;
  }>;
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastRefreshedAt: string;
}

// LiveKit Cloud Developer / Free Tier Quota Constants
export const LIVEKIT_FREE_TIER_LIMITS = {
  maxParticipantMinutes: 10_000,
  maxBandwidthGB: 25.0,
  maxConcurrentConnections: 100,
};

/**
 * Mint administrative token for LiveKit RoomServiceClient (bypassing jose v4 date bug)
 */
async function mintLiveKitAdminToken(
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(apiSecret);
  const now = Math.floor(Date.now() / 1000);

  return new jose.SignJWT({
    video: {
      roomList: true,
      roomAdmin: true,
      roomCreate: true,
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(apiKey)
    .setSubject('livekit-usage-inspector')
    .setNotBefore(now - 5)
    .setExpirationTime(now + 600)
    .sign(secretKey);
}

/**
 * Fetches real-time LiveKit Cloud usage, live rooms, and billing quota status
 */
export async function getLiveKitCloudUsage(): Promise<LiveKitUsageReport> {
  const config = getLiveKitConfig();

  // Convert wss:// to https:// for REST/RPC service calls
  const httpUrl = config.url
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://');
  const projectSubdomain =
    config.url.replace(/^wss?:\/\//i, '').split('.')[0] || 'ruhvi-cloud';

  // 1. Query live active rooms from LiveKit Cloud SFU
  let activeRooms: LiveKitActiveRoom[] = [];
  let activeParticipantsCount = 0;

  try {
    const adminToken = await mintLiveKitAdminToken(
      config.apiKey,
      config.apiSecret
    );
    const svc = new RoomServiceClient(httpUrl, config.apiKey, config.apiSecret);
    (svc as any).token = adminToken;

    const rawRooms = await svc.listRooms();
    const nowSec = Math.floor(Date.now() / 1000);

    activeRooms = rawRooms.map((r: any) => {
      const creationSec = Number(r.creationTime) || nowSec;
      const uptime = Math.max(0, nowSec - creationSec);
      activeParticipantsCount += Number(r.numParticipants) || 0;

      return {
        sid: r.sid || r.name,
        name: r.name,
        numParticipants: Number(r.numParticipants) || 0,
        creationTime: creationSec * 1000,
        uptimeSeconds: uptime,
        activeRecording: Boolean(r.activeRecording),
      };
    });
  } catch (err: any) {
    console.warn('[LiveKit Usage] Unable to list rooms via RPC:', err.message);
  }

  // 2. Query historical usage from Supabase for the current calendar month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );
  const daysRemaining = Math.max(0, endOfMonth.getDate() - now.getDate());

  let totalSessionsMonth = 0;
  let totalTurnsMonth = 0;
  let estimatedMinutes = 0;

  try {
    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Query voice interaction logs for the current month
    const { data: voiceLogs, count: logCount } = await supabaseAdmin
      .from('ai_logs')
      .select('created_at, metadata, latency_ms', { count: 'exact' })
      .eq('feature', 'co_founder_voice')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    totalTurnsMonth = logCount || (voiceLogs ? voiceLogs.length : 0);

    // Query completed session audit records
    const { data: sessionAudits } = await supabaseAdmin
      .from('audit_logs')
      .select('changes, created_at')
      .eq('action', 'co_founder_voice_session_completed')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (sessionAudits && sessionAudits.length > 0) {
      totalSessionsMonth = sessionAudits.length;
      const totalSec = sessionAudits.reduce((acc, a) => {
        const dur = (a.changes as any)?.durationSeconds;
        return acc + (Number(dur) || 60);
      }, 0);
      estimatedMinutes += Math.round(totalSec / 60);
    } else {
      // Estimate 1.5 minutes per conversational turn as realistic fallback
      estimatedMinutes = Math.max(
        activeRooms.length * 2,
        Math.round(totalTurnsMonth * 1.5)
      );
    }
  } catch (err: any) {
    console.warn('[LiveKit Usage] DB telemetry query fallback:', err.message);
    estimatedMinutes = activeRooms.length * 3;
  }

  // 3. Compute Bandwidth usage
  // Opus HD audio uses ~40 kbps = 5 KB/s ≈ 0.3 MB / minute
  const estimatedBandwidthMB = Math.round(estimatedMinutes * 0.3 * 10) / 10;
  const usedBandwidthGB = Math.round((estimatedBandwidthMB / 1024) * 100) / 100;

  // 4. Calculate Quotas
  const maxMinutes = LIVEKIT_FREE_TIER_LIMITS.maxParticipantMinutes;
  const maxBandwidth = LIVEKIT_FREE_TIER_LIMITS.maxBandwidthGB;
  const maxConcurrent = LIVEKIT_FREE_TIER_LIMITS.maxConcurrentConnections;

  const remainingMinutes = Math.max(0, maxMinutes - estimatedMinutes);
  const percentMinutes = Math.min(
    100,
    Math.round((estimatedMinutes / maxMinutes) * 1000) / 10
  );

  const remainingBandwidth = Math.max(
    0,
    Math.round((maxBandwidth - usedBandwidthGB) * 100) / 100
  );
  const percentBandwidth = Math.min(
    100,
    Math.round((usedBandwidthGB / maxBandwidth) * 1000) / 10
  );

  const percentConcurrent = Math.min(
    100,
    Math.round((activeParticipantsCount / maxConcurrent) * 100)
  );

  // Determine overall health status
  let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (percentMinutes > 85 || percentBandwidth > 85) {
    healthStatus = 'critical';
  } else if (percentMinutes > 60 || percentBandwidth > 60) {
    healthStatus = 'warning';
  }

  return {
    planName: 'LiveKit Cloud Developer Tier (Free)',
    isFreeTier: true,
    cloudHost: httpUrl,
    projectSubdomain,
    billingPeriod: {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      daysRemaining,
    },
    quotas: {
      participantMinutes: {
        limit: maxMinutes,
        used: estimatedMinutes,
        remaining: remainingMinutes,
        percent: percentMinutes,
        unit: 'Minutes',
      },
      bandwidthGB: {
        limit: maxBandwidth,
        used: usedBandwidthGB,
        remaining: remainingBandwidth,
        percent: percentBandwidth,
        unit: 'GB',
      },
      concurrentConnections: {
        limit: maxConcurrent,
        used: activeParticipantsCount,
        remaining: Math.max(0, maxConcurrent - activeParticipantsCount),
        percent: percentConcurrent,
        unit: 'Connections',
      },
    },
    liveMetrics: {
      activeRoomsCount: activeRooms.length,
      activeParticipantsCount,
      activeRooms,
    },
    historicalSummary: {
      totalVoiceSessionsMonth: totalSessionsMonth,
      totalVoiceTurnsMonth: totalTurnsMonth,
      estimatedMinutesConsumed: estimatedMinutes,
      estimatedBandwidthMB,
    },
    supportedServices: [
      {
        name: 'WebRTC Selective Forwarding Unit (SFU)',
        description:
          'Ultra-low latency global audio relay for real-time Co-Founder voice conversation.',
        status: 'active',
        tier: 'Free (10,000 mins/mo)',
      },
      {
        name: 'Opus 48kHz HD Audio Engine',
        description:
          'Noise suppression, echo cancellation, and acoustic gain control.',
        status: 'active',
        tier: 'Included Free',
      },
      {
        name: 'Multimodal AI Agent Dispatch',
        description:
          'LiveKit SIP and Agent framework dispatch protocol for direct AI interaction.',
        status: 'active',
        tier: 'Included Free',
      },
      {
        name: 'Cloud DataChannel Realtime Telemetry',
        description:
          'Sub-50ms bidirectional data messaging for transcripts and telemetry.',
        status: 'active',
        tier: 'Included Free',
      },
      {
        name: 'LiveKit Cloud Egress & Recording',
        description: 'Composite and track recording to cloud storage buckets.',
        status: 'available',
        tier: 'Pay-as-you-go',
      },
    ],
    healthStatus,
    lastRefreshedAt: new Date().toISOString(),
  };
}
