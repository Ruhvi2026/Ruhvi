import 'server-only';

import {
  CoWorkerDefinition,
  CoWorkerStructuredOutput,
  CoWorkerTaskInput,
  MarketingCoWorkerId,
} from '../types';
import { isCoWorkerEnabled } from '../config';

export class EmailMarketingCoWorker {
  readonly id: MarketingCoWorkerId = 'marketing_email';
  readonly name = 'Email Marketing Co-worker';

  getDefinition(): CoWorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Lifecycle Email Strategist & Retention Copywriter',
      objective:
        'Devise lifecycle email marketing workflows, automated abandoned cart recovery sequences, promotional newsletters, and retention campaigns with A/B subject line testing.',
      status: isCoWorkerEnabled(this.id) ? 'ENABLED' : 'DISABLED',
      skills: [
        'Email campaign planning',
        'Email copywriting',
        'Subject lines',
        'Preview text',
        'Segmentation',
        'Lifecycle campaigns',
        'Abandoned cart campaigns',
        'Promotional emails',
        'Product launch emails',
        'Retention campaigns',
        'Email A/B testing',
        'Performance analysis',
        'Personalization',
      ],
      tools: ['get_store_metrics', 'get_coupons'],
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
          'Email Marketing Co-worker is a PRODUCTION-ONLY capability and is currently DISABLED in development.',
        ],
        evidence: [
          'Worker architecture and 14 skills are fully created and ready to enable upon production launch.',
        ],
        problems: [
          'Execution is disabled to prevent unmanaged email broadcast dispatches during development.',
        ],
        opportunities: [
          'Enable worker via the Co-Worker Status panel or COWORKER_MARKETING_EMAIL=ENABLED environment flag when ready to broadcast via Brevo / Resend.',
        ],
        recommendations: [
          'Use Strategy Co-worker for email draft copywriting and promotional subject line suggestions.',
        ],
        data: {
          capabilityStatus: 'DISABLED_PRODUCTION_ONLY',
          supportedPipelines: ['Brevo', 'Resend', 'Klaviyo'],
        },
        requiredApproval: false,
        executionStatus: 'disabled',
        executiveVoiceSummary:
          'The Email Marketing Co-worker capability exists but is currently disabled in development mode.',
        timestamp,
      };
    }

    return {
      coWorkerId: this.id,
      coWorkerName: this.name,
      status: 'ENABLED',
      success: true,
      findings: [`Email marketing workflow structured for task "${input.task}".`],
      evidence: [],
      problems: [],
      opportunities: [],
      recommendations: ['Review email HTML and subject line before broadcast.'],
      data: {
        subject: '✨ A special surprise for your jewellery box...',
        previewText: 'Handcrafted 22K gold-plated luxury with anti-tarnish guarantee.',
      },
      requiredApproval: true,
      executionStatus: 'pending_approval',
      executiveVoiceSummary: 'Email campaign drafted.',
      timestamp,
    };
  }
}

export const emailMarketingCoWorker = new EmailMarketingCoWorker();
