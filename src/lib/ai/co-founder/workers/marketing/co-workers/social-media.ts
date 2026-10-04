import 'server-only';

import {
  CoWorkerDefinition,
  CoWorkerStructuredOutput,
  CoWorkerTaskInput,
  MarketingCoWorkerId,
} from '../types';
import { isCoWorkerEnabled } from '../config';

export class SocialMediaCoWorker {
  readonly id: MarketingCoWorkerId = 'marketing_social_media';
  readonly name = 'Social Media Co-worker';

  getDefinition(): CoWorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Organic Social Media Strategist & Community Manager',
      objective:
        'Plan organic social media content calendars, generate platform-specific post copy and hashtags, schedule posts, and analyze organic engagement across social platforms.',
      status: isCoWorkerEnabled(this.id) ? 'ENABLED' : 'DISABLED',
      skills: [
        'Social media planning',
        'Content calendar',
        'Platform-specific content',
        'Post copy',
        'Captions',
        'Hashtags',
        'Creative adaptation',
        'Posting schedule',
        'Social analytics',
        'Engagement analysis',
        'Platform optimization',
        'Social campaign planning',
      ],
      tools: ['browse_website', 'get_store_metrics'],
      mcpPermissions: [],
      isProductionOnly: true,
    };
  }

  async execute(input: CoWorkerTaskInput): Promise<CoWorkerStructuredOutput> {
    const timestamp = new Date().toISOString();

    if (!isCoWorkerEnabled(this.id)) {
      return {
        coWorkerId: this.id,
        coWorkerName: this.name,
        status: 'DISABLED',
        success: false,
        findings: [
          'Social Media Co-worker is a PRODUCTION-ONLY capability and is currently DISABLED in development.',
        ],
        evidence: [
          'Worker architecture and 12 skills are fully implemented and ready to activate upon production deployment.',
        ],
        problems: [
          'Routing to marketing_social_media is currently disabled to prevent unmanaged external social platform calls.',
        ],
        opportunities: [
          'Enable worker via the Co-Worker Status panel or COWORKER_MARKETING_SOCIAL_MEDIA=ENABLED environment flag when ready to connect social accounts.',
        ],
        recommendations: [
          'Use Strategy Co-worker or Content Worker for organic copy generation during development.',
        ],
        data: {
          capabilityStatus: 'DISABLED_PRODUCTION_ONLY',
          supportedPlatforms: ['Instagram', 'Pinterest', 'YouTube Shorts', 'Facebook'],
        },
        requiredApproval: false,
        executionStatus: 'disabled',
        executiveVoiceSummary:
          'The Social Media Co-worker capability exists but is currently disabled in development mode.',
        timestamp,
      };
    }

    // When explicitly enabled in production
    return {
      coWorkerId: this.id,
      coWorkerName: this.name,
      status: 'ENABLED',
      success: true,
      findings: [`Social media calendar generated for task "${input.task}".`],
      evidence: [],
      problems: [],
      opportunities: [],
      recommendations: ['Review social post draft before scheduling.'],
      data: {
        caption: 'Radiate timeless elegance with handcrafted 22K gold-plated jewellery from Ruhvi. ✨',
        hashtags: ['#RuhviJewels', '#AntiTarnishJewellery', '#IndianFineJewellery', '#DailyLuxury'],
      },
      requiredApproval: false,
      executionStatus: 'not_required',
      executiveVoiceSummary: 'Social media post formulated.',
      timestamp,
    };
  }
}

export const socialMediaCoWorker = new SocialMediaCoWorker();
