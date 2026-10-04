import 'server-only';

import { MarketingCoWorkerId, CoWorkerStatus } from './types';

export interface CoWorkerConfigState {
  id: MarketingCoWorkerId;
  name: string;
  status: CoWorkerStatus;
  isProductionOnly: boolean;
  description: string;
}

// In-memory status store with fallback to environment overrides
const initialStatusMap: Record<MarketingCoWorkerId, CoWorkerStatus> = {
  marketing_strategy:
    (process.env.COWORKER_MARKETING_STRATEGY as CoWorkerStatus) || 'ENABLED',
  marketing_creative_media:
    (process.env.COWORKER_MARKETING_CREATIVE_MEDIA as CoWorkerStatus) || 'ENABLED',
  marketing_ads_execution:
    (process.env.COWORKER_MARKETING_ADS_EXECUTION as CoWorkerStatus) || 'ENABLED',
  marketing_social_media:
    (process.env.COWORKER_MARKETING_SOCIAL_MEDIA as CoWorkerStatus) || 'DISABLED',
  marketing_email:
    (process.env.COWORKER_MARKETING_EMAIL as CoWorkerStatus) || 'DISABLED',
  marketing_influencer:
    (process.env.COWORKER_MARKETING_INFLUENCER as CoWorkerStatus) || 'DISABLED',
};

const coWorkerStatusStore: Map<MarketingCoWorkerId, CoWorkerStatus> = new Map(
  Object.entries(initialStatusMap) as [MarketingCoWorkerId, CoWorkerStatus][]
);

const COWORKER_METADATA: Record<MarketingCoWorkerId, { name: string; isProductionOnly: boolean; description: string }> = {
  marketing_strategy: {
    name: 'Strategy Co-worker',
    isProductionOnly: false,
    description: 'Campaign planning, market analysis, customer personas, offer strategy, and luxury ad copywriting.',
  },
  marketing_creative_media: {
    name: 'Creative Media Co-worker',
    isProductionOnly: false,
    description: 'Image and video creative direction, two-video continuity prompts, multilingual voiceover scripts, and media orchestration.',
  },
  marketing_ads_execution: {
    name: 'Ads Execution Co-worker',
    isProductionOnly: false,
    description: 'Meta Ads campaign structures, audience targeting, draft creation, and approval-gated publishing.',
  },
  marketing_social_media: {
    name: 'Social Media Co-worker',
    isProductionOnly: true,
    description: 'Organic social media planning, content calendars, platform-specific captions, and hashtag strategies (Production-Only).',
  },
  marketing_email: {
    name: 'Email Marketing Co-worker',
    isProductionOnly: true,
    description: 'Email campaign copywriting, lifecycle sequences, segmentation, and promotional broadcast planning (Production-Only).',
  },
  marketing_influencer: {
    name: 'Influencer Marketing Co-worker',
    isProductionOnly: true,
    description: 'Creator discovery, niche matching, collaboration evaluation, and outreach script generation (Production-Only).',
  },
};

export function isCoWorkerEnabled(id: MarketingCoWorkerId): boolean {
  return coWorkerStatusStore.get(id) === 'ENABLED';
}

export function setCoWorkerStatus(id: MarketingCoWorkerId, status: CoWorkerStatus): void {
  coWorkerStatusStore.set(id, status);
}

export function getAllCoWorkerStatuses(): CoWorkerConfigState[] {
  return (Object.keys(COWORKER_METADATA) as MarketingCoWorkerId[]).map((id) => ({
    id,
    name: COWORKER_METADATA[id].name,
    status: coWorkerStatusStore.get(id) || 'DISABLED',
    isProductionOnly: COWORKER_METADATA[id].isProductionOnly,
    description: COWORKER_METADATA[id].description,
  }));
}
