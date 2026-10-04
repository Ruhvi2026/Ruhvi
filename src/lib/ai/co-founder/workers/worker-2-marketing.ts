import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import {
  routeMarketingTask,
  executeCoWorkerById,
  CoWorkerTaskInput,
  MarketingStrategyResult,
  CreativeMediaResult,
  AdsExecutionResult,
} from './marketing';

export class MarketingWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_marketing';
  readonly name = 'Marketing Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Growth Marketing Director & Marketing Ecosystem Domain Manager',
      objective:
        'Orchestrate the 6 specialized Marketing Co-Workers (Strategy, Creative Media, Ads Execution, Social Media, Email, Influencer), devise high-converting campaigns, generate two-video continuity prompts, and manage approval-gated paid acquisition.',
      priority: this.priority,
      responsibilities: [
        'Marketing Domain Management and specialized co-worker orchestration',
        'Multi-angle ad copy generation (Meta, Google, WhatsApp, Email)',
        'Natural-language dynamic routing across Strategy, Creative Media, and Ads Execution co-workers',
        'Campaign ideation tailored to seasonal jewellery moments (Diwali, Weddings, Karwa Chauth)',
        'Detailed visual image creative prompts and artistic direction',
        'Two-video continuous Flow/Veo prompt generation with character and lighting persistence',
        'Multilingual voiceover scripting (Bengali, Hindi, English) with TTS formatting',
        'Cloudinary media asset orchestration and n8n FFmpeg webhook pipeline management',
        'Meta Ads campaign draft creation with strict human-in-the-loop approval gating',
        'Competitor marketing observation and angle differentiation',
        'Coupon and promotional incentive strategy with strict margin safeguards',
      ],
      requiredSkills: [
        'Growth marketing',
        'Marketing co-worker orchestration',
        'Luxury jewellery copywriting',
        'Visual art direction',
        'Two-video continuity planning',
        'Multilingual voiceover scripting',
        'Meta Ads campaign management',
        'Acquisition funnel analysis',
      ],
      requiredTools: [
        'get_store_metrics',
        'get_coupons',
        'browse_website',
        'get_competitors',
      ],
      permissionScope: ['mcp_tools:read', 'mcp_tools:write'],
      isSystemWorker: false,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const timestamp = new Date().toISOString();

    try {
      // 1. Natural language routing to determine which co-workers to engage
      const plan = routeMarketingTask(input.task);
      const coWorkerInput: CoWorkerTaskInput = {
        task: input.task,
        channel: input.channel,
        timeframe: input.timeframe,
        parameters: input.parameters,
        productName: input.parameters?.product_name || input.parameters?.productName,
        targetAudience: input.parameters?.target_audience || input.parameters?.targetAudience,
        budget: input.parameters?.budget,
      };

      let strategyResult: MarketingStrategyResult | undefined;
      let creativeResult: CreativeMediaResult | undefined;
      let adsResult: AdsExecutionResult | undefined;

      const findings: string[] = [];
      const evidence: string[] = [];
      const problems: string[] = [];
      const opportunities: string[] = [];
      const recommendations: string[] = [];

      let requiredApproval = false;
      let requiredAction = 'Deploy ad copy to Meta Ads Manager and schedule creative asset creation';
      let executionStatus: 'not_required' | 'pending_approval' | 'executed' | 'disabled' = 'not_required';
      let voiceSummary = '';

      // 2. Execute Co-Worker Pipeline sequentially, propagating context
      for (const workerId of plan.pipeline) {
        const coWorkerOutput = await executeCoWorkerById(workerId, {
          ...coWorkerInput,
          previousContext: {
            strategy: strategyResult,
            creative: creativeResult,
          },
        });

        // Collect findings and recommendations
        if (coWorkerOutput.findings) findings.push(...coWorkerOutput.findings);
        if (coWorkerOutput.evidence) evidence.push(...coWorkerOutput.evidence);
        if (coWorkerOutput.problems) problems.push(...coWorkerOutput.problems);
        if (coWorkerOutput.opportunities) opportunities.push(...coWorkerOutput.opportunities);
        if (coWorkerOutput.recommendations) recommendations.push(...coWorkerOutput.recommendations);

        if (coWorkerOutput.data?.strategy) {
          strategyResult = coWorkerOutput.data.strategy;
        }
        if (coWorkerOutput.data?.creativeMedia) {
          creativeResult = coWorkerOutput.data.creativeMedia;
        }
        if (coWorkerOutput.data?.adsExecution) {
          adsResult = coWorkerOutput.data.adsExecution;
        }

        if (coWorkerOutput.requiredApproval) {
          requiredApproval = true;
          executionStatus = 'pending_approval';
        }

        if (coWorkerOutput.status === 'DISABLED') {
          executionStatus = 'disabled';
          voiceSummary = coWorkerOutput.executiveVoiceSummary;
          break;
        }
      }

      // If no strategy or creative was run (e.g. direct copy request), execute strategy as fallback
      if (!strategyResult && plan.pipeline.length === 0) {
        const stratOutput = await executeCoWorkerById('marketing_strategy', coWorkerInput);
        strategyResult = stratOutput.data?.strategy;
      }

      // 3. Construct backward-compatible creativeBrief structure for existing callers/tests
      const angles = strategyResult?.angles || [
        {
          hook: 'Looks like solid gold. Survives perfumes, sweat, and daily wear.',
          headline: '22K Gold Plating with Anti-Tarnish E-Coating',
          primaryText:
            'Crafted for the woman who never takes her jewellery off. Ruhvi chokers, necklaces, and bangles stay brilliant through every celebration with our 6-month color guarantee. Free express Blue Dart delivery across India.',
          callToAction: 'Shop The Collection',
        },
        {
          hook: 'Why lock your jewellery in a safe when you can wear it every day?',
          headline: 'Daily Luxury, Zero Compromise',
          primaryText:
            'Intricately handcrafted in Bengal, dipped in authentic 22K gold. Discover demi-fine jewellery designed for modern life.',
          callToAction: 'Explore Ruhvi Classics',
        },
      ];

      const visualImageDirection = creativeResult?.imagePrompt || {
        artStyle: 'Warm editorial chiaroscuro, cinematic jewellery macro',
        prompt:
          'A photorealistic close-up of a handcrafted 22K gold-plated choker necklace worn on an Indian woman in a deep emerald silk saree. Soft warm ambient candlelight, glistening reflections showing mirror-polish anti-tarnish finish. 8k, luxury fashion editorial.',
        aspectRatio: '1:1 for Instagram feed / 9:16 for Stories',
      };

      const videoStoryboard = {
        concept: creativeResult?.twoVideoFlow.video1Prompt.title || 'The All-Day Wear Test (15-second Reel)',
        pacing: 'Fast, vibrant, aspirational',
        scenes: [
          {
            seconds: '0-3s',
            visual:
              creativeResult?.twoVideoFlow.video1Prompt.visualPrompt.substring(0, 80) ||
              'Close up of morning coffee, woman putting on Ruhvi pendant necklace.',
            audioVo:
              creativeResult?.voiceover.english.script.substring(0, 60) ||
              'Your daily jewellery shouldn’t tarnish after three wears.',
          },
          {
            seconds: '3-9s',
            visual:
              creativeResult?.twoVideoFlow.continuityInstructions.video2StartingAction ||
              'Cut to workout/office/dinner party. Pendant shines flawlessly under different lighting.',
            audioVo: '22K gold plating. Anti-tarnish e-coating. Built for every single day.',
          },
          {
            seconds: '9-15s',
            visual: 'Luxury Ruhvi unboxing box on velvet, 6-month warranty card, shop now button.',
            audioVo: 'Discover authentic craftsmanship. Express delivery across India at ruhvi.in.',
          },
        ],
      };

      const creativeBrief = {
        campaignTheme:
          strategyResult?.campaignAngle || 'Timeless Radiance — Anti-Tarnish Demi-Fine Elegance',
        targetAudience:
          strategyResult?.targetAudience ||
          'Modern Indian women (22-40), young professionals, festive/wedding shoppers looking for daily luxury without premium solid-gold markup.',
        angles,
        visualImageDirection,
        videoStoryboard,
        twoVideoFlow: creativeResult?.twoVideoFlow,
        multilingualVoiceovers: creativeResult?.voiceover,
      };

      // Set voice summary
      if (!voiceSummary) {
        if (strategyResult?.approvalRequirements.required) {
          voiceSummary = strategyResult.executiveVoiceSummary;
        } else if (adsResult) {
          voiceSummary = adsResult.executiveVoiceSummary;
        } else if (creativeResult) {
          voiceSummary = creativeResult.executiveVoiceSummary;
        } else if (strategyResult) {
          voiceSummary = strategyResult.executiveVoiceSummary;
        } else {
          voiceSummary = `Marketing strategy and creative assets prepared for "${creativeBrief.campaignTheme}".`;
        }
      }

      if (strategyResult?.approvalRequirements.required) {
        requiredApproval = true;
        executionStatus = 'pending_approval';
        requiredAction = 'Create and activate promotional coupon code RUHVI500';
        if (!voiceSummary.includes('Awaiting your approval')) {
          voiceSummary += ' Awaiting your approval before activating any discount codes.';
        }
      }

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: Array.from(new Set(findings)),
        evidence: Array.from(new Set(evidence)),
        problems: Array.from(new Set(problems)),
        opportunities: Array.from(new Set(opportunities)),
        recommendations: Array.from(new Set(recommendations)),
        priority: 'high',
        expectedImpact:
          '15-25% improvement in click-through rates (CTR) and higher qualification of high-intent buyers.',
        requiredAction,
        requiredApproval,
        executionStatus,
        verification:
          'Track Meta Ads CTR, ROAS, and coupon redemption count over 7-day test flight.',
        missingCapabilities: [
          'Direct Video Rendering API (Marked PENDING as per Step 0.3; video storyboards and voiceover scripts generated ready for production)',
        ],
        data: {
          creativeBrief,
          strategy: strategyResult,
          creativeMedia: creativeResult,
          adsExecution: adsResult,
          orchestrationPipeline: plan.pipeline,
          metricsBaseline: {
            aov: strategyResult?.budgetRecommendation.suggestedDailyBudgetInr
              ? Math.round(strategyResult.budgetRecommendation.suggestedDailyBudgetInr / 0.8)
              : 3500,
          },
        },
        executiveVoiceSummary: voiceSummary,
        timestamp,
      };
    } catch (err: any) {
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: ['Marketing orchestration encountered an error.'],
        evidence: [err.message],
        problems: [`Failed to run marketing worker: ${err.message}`],
        opportunities: [],
        recommendations: ['Check marketing co-worker configuration and model availability.'],
        priority: 'high',
        expectedImpact: 'Ensure campaign planning continuity',
        requiredAction: 'Resolve marketing tool error',
        requiredApproval: false,
        executionStatus: 'failed',
        verification: 'Retry marketing worker task execution.',
        missingCapabilities: [],
        executiveVoiceSummary: `Marketing worker encountered an issue: ${err.message}`,
        timestamp,
      };
    }
  }
}

export const marketingWorker = new MarketingWorker();
