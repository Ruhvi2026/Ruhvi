import 'server-only';

export type MarketingCoWorkerId =
  | 'marketing_strategy'
  | 'marketing_creative_media'
  | 'marketing_ads_execution'
  | 'marketing_social_media'
  | 'marketing_email'
  | 'marketing_influencer';

export type CoWorkerStatus = 'ENABLED' | 'DISABLED';

export interface CoWorkerDefinition {
  id: MarketingCoWorkerId;
  name: string;
  role: string;
  objective: string;
  status: CoWorkerStatus;
  skills: string[];
  tools: string[];
  mcpPermissions: string[];
  isProductionOnly: boolean;
}

export interface CoWorkerTaskInput {
  task: string;
  campaignId?: string;
  productId?: string;
  productName?: string;
  targetAudience?: string;
  budget?: number;
  channel?: 'voice' | 'text';
  timeframe?: string;
  parameters?: Record<string, any>;
  previousContext?: {
    strategy?: MarketingStrategyResult;
    creative?: CreativeMediaResult;
    mediaJob?: MediaJob;
    adsDraft?: AdCampaignDraft;
  };
}

export interface AdAngle {
  hook: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  targetSegment?: string;
  emotionalTrigger?: string;
}

export interface MarketingStrategyResult {
  objective: string;
  businessGoal: string;
  campaignType: string;
  targetAudience: string;
  customerProblem: string;
  valueProposition: string;
  offer: string;
  campaignAngle: string;
  angles: AdAngle[];
  hooks: string[];
  headlines: string[];
  primaryText: string;
  callToAction: string;
  platform: 'meta' | 'google' | 'instagram' | 'whatsapp' | 'omnichannel';
  funnelStage: 'top_of_funnel' | 'middle_of_funnel' | 'bottom_of_funnel' | 'retargeting';
  budgetRecommendation: {
    suggestedDailyBudgetInr: number;
    suggestedTestFlightDays: number;
    recommendedTotalBudgetInr: number;
    expectedCpcInr: number;
    expectedRoasFloor: number;
  };
  testingPlan: {
    creativeTestingStrategy: string;
    audienceTestingStrategy: string;
    metricsToMonitor: string[];
  };
  competitorInsights: {
    observedCompetitors: string[];
    differentiationAngles: string[];
    riskMitigations: string[];
  };
  creativeRequirements: {
    requiresVideo: boolean;
    requiresImage: boolean;
    aspectRatios: string[];
    suggestedFormat: string;
  };
  recommendedNextWorkers: MarketingCoWorkerId[];
  risks: string[];
  evidence: string[];
  confidence: 'high' | 'moderate' | 'low';
  approvalRequirements: {
    required: boolean;
    reason?: string;
  };
  executiveVoiceSummary: string;
}

export interface FlowVideoPrompt {
  id: 'video_1' | 'video_2';
  title: string;
  durationSeconds: number;
  aspectRatio: '9:16' | '1:1' | '16:9';
  visualPrompt: string;
  cameraMovement: string;
  lightingInstruction: string;
  characterDescription: string;
  productPlacement: string;
  environmentDescription: string;
  negativePrompt: string;
  continuityAnchor: string;
}

export interface VideoContinuityGuide {
  sharedCharacterDescription: string;
  sharedClothingDescription: string;
  sharedProductDescription: string;
  sharedEnvironmentDescription: string;
  sharedLighting: string;
  sharedColorGrade: string;
  video1EndingAction: string;
  video2StartingAction: string;
  transitionInstruction: string;
}

export interface MultilingualVoiceoverScripts {
  bengali: {
    script: string;
    phoneticBanglish: string;
    estimatedDurationSeconds: number;
  };
  hindi: {
    script: string;
    phoneticHinglish: string;
    estimatedDurationSeconds: number;
  };
  english: {
    script: string;
    estimatedDurationSeconds: number;
  };
  ttsReadyCleanText: string;
}

export interface FinalMediaAnalysis {
  status: 'PASS' | 'NEEDS_REVISION' | 'FAILED';
  score: number; // 0 - 100
  reasons: string[];
  correctionInstructions?: string[];
  checks: {
    durationValid: boolean;
    aspectRatioValid: boolean;
    visualContinuity: boolean;
    productVisibility: boolean;
    brandingConsistency: boolean;
    audioVoiceoverAlignment: boolean;
    ctaClarity: boolean;
    adSuitability: boolean;
  };
  analyzedAt: string;
}

export type MediaJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'cancelled';

export interface MediaJob {
  jobId: string;
  campaignId: string;
  taskId: string;
  workerId: MarketingCoWorkerId;
  status: MediaJobStatus;
  inputAssets: {
    video1Url?: string;
    video1PublicId?: string;
    video2Url?: string;
    video2PublicId?: string;
  };
  outputAsset?: {
    finalVideoUrl?: string;
    finalPublicId?: string;
    analysis?: FinalMediaAnalysis;
  };
  voiceoverRequirements: {
    language: 'bengali' | 'hindi' | 'english';
    script: string;
    ttsVoice?: string;
  };
  processingRequirements: {
    mergeClips: boolean;
    addSubtitles: boolean;
    audioNormalisation: boolean;
    targetAspectRatio: string;
    targetDurationSeconds: number;
  };
  callbackUrl: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AdTargeting {
  locations: string[];
  ageMin: number;
  ageMax: number;
  genders: ('all' | 'female' | 'male')[];
  interests: string[];
  behaviors?: string[];
  placements: ('instagram_feed' | 'instagram_reels' | 'facebook_feed' | 'stories')[];
}

export interface AdSetDraft {
  id: string;
  name: string;
  dailyBudgetInr: number;
  targeting: AdTargeting;
  billingEvent: 'IMPRESSIONS' | 'LINK_CLICKS';
  optimizationGoal: 'LINK_CLICKS' | 'CONVERSIONS' | 'REACH';
}

export interface AdDraft {
  id: string;
  name: string;
  adSetId: string;
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
  creativeType: 'video' | 'image' | 'carousel';
  mediaUrl: string;
  destinationUrl: string;
}

export interface AdCampaignDraft {
  campaignId: string;
  campaignName: string;
  objective: 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC' | 'OUTCOME_ENGAGEMENT' | 'OUTCOME_AWARENESS';
  status: 'DRAFT' | 'PAUSED' | 'ACTIVE';
  totalDailyBudgetInr: number;
  adSets: AdSetDraft[];
  ads: AdDraft[];
  trackingPixelId?: string;
  risksAndWarnings: string[];
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  approvalId?: string;
  isApprovalGated: boolean;
  canPublishImmediately: boolean;
}

export interface CreativeMediaResult {
  campaignTheme: string;
  targetAudience: string;
  imagePrompt: {
    artStyle: string;
    prompt: string;
    aspectRatio: string;
  };
  twoVideoFlow: {
    video1Prompt: FlowVideoPrompt;
    video2Prompt: FlowVideoPrompt;
    continuityInstructions: VideoContinuityGuide;
  };
  voiceover: MultilingualVoiceoverScripts;
  mediaJob?: MediaJob;
  finalVideoAnalysis?: FinalMediaAnalysis;
  uploadStatus: {
    video1Ready: boolean;
    video2Ready: boolean;
    processingDispatched: boolean;
    finalVideoReady: boolean;
  };
  executiveVoiceSummary: string;
}

export interface AdsExecutionResult {
  campaignDraft: AdCampaignDraft;
  approvalRequired: boolean;
  approvalId?: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  verification: string;
  executiveVoiceSummary: string;
}

export interface CoWorkerStructuredOutput {
  coWorkerId: MarketingCoWorkerId;
  coWorkerName: string;
  status: CoWorkerStatus;
  success: boolean;
  findings: string[];
  evidence: string[];
  problems: string[];
  opportunities: string[];
  recommendations: string[];
  data: {
    strategy?: MarketingStrategyResult;
    creativeMedia?: CreativeMediaResult;
    adsExecution?: AdsExecutionResult;
    [key: string]: any;
  };
  requiredApproval: boolean;
  executionStatus: 'not_required' | 'pending_approval' | 'approved' | 'executed' | 'failed' | 'disabled';
  executiveVoiceSummary: string;
  timestamp: string;
  error?: string;
}
