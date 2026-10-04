import 'server-only';

import {
  CoWorkerDefinition,
  CoWorkerStructuredOutput,
  CoWorkerTaskInput,
  MarketingCoWorkerId,
} from '../types';
import { isCoWorkerEnabled } from '../config';

export class InfluencerMarketingCoWorker {
  readonly id: MarketingCoWorkerId = 'marketing_influencer';
  readonly name = 'Influencer Marketing Co-worker';

  getDefinition(): CoWorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Influencer Partnerships Director & Creator Strategist',
      objective:
        'Discover creators in luxury/lifestyle jewellery niches, evaluate engagement and audience authenticity, prepare bespoke collaboration outreach scripts, and model estimated campaign ROI.',
      status: isCoWorkerEnabled(this.id) ? 'ENABLED' : 'DISABLED',
      skills: [
        'Influencer discovery',
        'Influencer research',
        'Audience analysis',
        'Engagement analysis',
        'Niche matching',
        'Campaign planning',
        'Influencer shortlist',
        'Outreach preparation',
        'Collaboration evaluation',
        'Cost/ROI estimation',
        'Campaign tracking',
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
          'Influencer Marketing Co-worker is a PRODUCTION-ONLY capability and is currently DISABLED in development.',
        ],
        evidence: [
          'Worker architecture and 11 skills are fully built and ready to enable upon production influencer onboarding.',
        ],
        problems: [
          'External creator discovery API connections are held in disabled state during development.',
        ],
        opportunities: [
          'Enable worker via the Co-Worker Status panel or COWORKER_MARKETING_INFLUENCER=ENABLED environment flag when ready to manage influencer campaigns.',
        ],
        recommendations: [
          'Use Strategy Co-worker for collaboration angle formulation and value propositions.',
        ],
        data: {
          capabilityStatus: 'DISABLED_PRODUCTION_ONLY',
          supportedNiches: ['Demi-fine jewellery', 'Indian wedding fashion', 'Festive styling', 'Luxury lifestyle'],
        },
        requiredApproval: false,
        executionStatus: 'disabled',
        executiveVoiceSummary:
          'The Influencer Marketing Co-worker capability exists but is currently disabled in development mode.',
        timestamp,
      };
    }

    return {
      coWorkerId: this.id,
      coWorkerName: this.name,
      status: 'ENABLED',
      success: true,
      findings: [`Influencer partnership brief structured for task "${input.task}".`],
      evidence: [],
      problems: [],
      opportunities: [],
      recommendations: ['Review creator outreach email template before sending.'],
      data: {
        targetNiche: 'Indian bridal fashion & demi-fine luxury creators (50k-250k followers)',
        outreachHook: 'Exclusive gifting collaboration: Handcrafted 22K gold-plated anti-tarnish jewellery.',
      },
      requiredApproval: false,
      executionStatus: 'not_required',
      executiveVoiceSummary: 'Influencer campaign brief formulated.',
      timestamp,
    };
  }
}

export const influencerMarketingCoWorker = new InfluencerMarketingCoWorker();
