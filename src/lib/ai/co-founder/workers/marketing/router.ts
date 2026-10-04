import 'server-only';

import {
  MarketingCoWorkerId,
  CoWorkerTaskInput,
  CoWorkerStructuredOutput,
} from './types';
import { isCoWorkerEnabled } from './config';
import { strategyCoWorker } from './co-workers/strategy';
import { creativeMediaCoWorker } from './co-workers/creative-media';
import { adsExecutionCoWorker } from './co-workers/ads-execution';
import { socialMediaCoWorker } from './co-workers/social-media';
import { emailMarketingCoWorker } from './co-workers/email';
import { influencerMarketingCoWorker } from './co-workers/influencer';

export interface MarketingOrchestrationPlan {
  primaryWorker: MarketingCoWorkerId;
  pipeline: MarketingCoWorkerId[];
  reasoning: string;
}

/**
 * Natural language intent parser to determine the optimal marketing co-worker routing.
 */
export function routeMarketingTask(taskText: string): MarketingOrchestrationPlan {
  const text = taskText.toLowerCase();

  // 1. Production-Only Disabled Workers Intent Checks
  if (
    text.includes('influencer') ||
    text.includes('creator') ||
    text.includes('collab') ||
    text.includes('kol')
  ) {
    return {
      primaryWorker: 'marketing_influencer',
      pipeline: ['marketing_influencer'],
      reasoning: 'Influencer discovery and creator outreach requested.',
    };
  }

  if (
    text.includes('email') ||
    text.includes('newsletter') ||
    text.includes('abandoned cart') ||
    text.includes('subscriber')
  ) {
    return {
      primaryWorker: 'marketing_email',
      pipeline: ['marketing_email'],
      reasoning: 'Lifecycle email marketing and newsletter copywriting requested.',
    };
  }

  if (
    text.includes('social media') ||
    text.includes('instagram post') ||
    text.includes('hashtag') ||
    text.includes('content calendar') ||
    text.includes('tweet') ||
    text.includes('pinterest')
  ) {
    return {
      primaryWorker: 'marketing_social_media',
      pipeline: ['marketing_social_media'],
      reasoning: 'Organic social media planning and caption scheduling requested.',
    };
  }

  // 2. Ads Execution Specific Intents
  if (
    text.includes('publish ad') ||
    text.includes('activate campaign') ||
    text.includes('meta ads') ||
    text.includes('ad set') ||
    text.includes('set up campaign') ||
    text.includes('run this campaign') ||
    text.includes('launch ad')
  ) {
    return {
      primaryWorker: 'marketing_ads_execution',
      pipeline: ['marketing_strategy', 'marketing_creative_media', 'marketing_ads_execution'],
      reasoning: 'End-to-end paid advertising setup and publishing requested.',
    };
  }

  // 3. Creative Media Specific Intents
  if (
    text.includes('video prompt') ||
    text.includes('veo') ||
    text.includes('flow prompt') ||
    text.includes('storyboard') ||
    text.includes('video reel') ||
    text.includes('creative brief') ||
    text.includes('voiceover') ||
    text.includes('image prompt') ||
    text.includes('make a video ad')
  ) {
    return {
      primaryWorker: 'marketing_creative_media',
      pipeline: ['marketing_strategy', 'marketing_creative_media'],
      reasoning: 'Visual art direction, two-video continuity prompts, and voiceover scripting requested.',
    };
  }

  // 4. Full Ad Campaign Ideation (Standard) -> Strategy + Creative + Ads Execution
  if (
    text.includes('ad campaign') ||
    text.includes('create an ad') ||
    text.includes('new ad') ||
    text.includes('marketing campaign') ||
    text.includes('festive campaign') ||
    text.includes('diwali')
  ) {
    return {
      primaryWorker: 'marketing_strategy',
      pipeline: ['marketing_strategy', 'marketing_creative_media', 'marketing_ads_execution'],
      reasoning: 'Full-funnel campaign creation requested (Strategy -> Creative Media -> Ads Execution).',
    };
  }

  // 5. Default -> Strategy Co-worker (Ad copy, angles, offer analysis)
  return {
    primaryWorker: 'marketing_strategy',
    pipeline: ['marketing_strategy'],
    reasoning: 'Marketing strategy, audience analysis, and ad copywriting requested.',
  };
}

/**
 * Executes a single marketing co-worker by ID.
 */
export async function executeCoWorkerById(
  id: MarketingCoWorkerId,
  input: CoWorkerTaskInput
): Promise<CoWorkerStructuredOutput> {
  switch (id) {
    case 'marketing_strategy':
      return strategyCoWorker.execute(input);
    case 'marketing_creative_media':
      return creativeMediaCoWorker.execute(input);
    case 'marketing_ads_execution':
      return adsExecutionCoWorker.execute(input);
    case 'marketing_social_media':
      return socialMediaCoWorker.execute(input);
    case 'marketing_email':
      return emailMarketingCoWorker.execute(input);
    case 'marketing_influencer':
      return influencerMarketingCoWorker.execute(input);
    default:
      throw new Error(`Unknown marketing co-worker: ${id}`);
  }
}
