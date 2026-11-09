// src/lib/ai/skills/research/social-listening.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const socialListeningSkill: RuntimeSkill = {
  id: 'research_social_listening',
  name: 'Public Social Listening & Community Sentiment',
  version: '1.0.0',
  owner: 'research-gateway',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: [
    'worker_competitor_research',
    'worker_marketing',
    'worker_review_feedback',
  ],
  description:
    'Monitors public Reddit, forum discussions, and social channels for jewelry buying trends, complaints, and gifting preferences in India.',
  explicitNonCapabilities: [
    'Cannot post comments, reply to threads, like, follow, or send direct messages.',
    'Cannot access private subreddits, closed Facebook groups, or private chats.',
    'Cannot collect or store Personally Identifiable Information (PII) of forum users.',
  ],
  allowedTools: [
    'search_public_discussions',
    'reddit_social_sentiment',
    'web_search',
  ],
  requiredDataSources: ['public_discussions', 'reddit_api', 'social_reach'],
  requiredInputs: ['topic_keyword', 'subreddit_or_platform'],
  outputSchema: {
    topic: 'string',
    sentiment: '{ positive: number; neutral: number; negative: number }',
    keyThemes: 'string[]',
    discussionCitations:
      'Array<{ title: string; url: string; platform: string }>',
  },
  evidenceRequirements: [
    'Sentiment analysis must cite specific post excerpts or permalinks.',
    'Timestamps of social posts must be reported.',
  ],
  safetyRules: [
    'Strict read-only posture: mutation verbs (post, comment, message) are strictly blocked.',
    'Filter out personal user IDs and handles to preserve user privacy.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 15,
    maxTokens: 1500,
    maxPages: 4,
    maxSpendUsd: 0,
  },
  failureStates: ['unavailable', 'partial', 'insufficient_data', 'verified'],
  instructions: `SOCIAL LISTENING PROTOCOL:
1. Extract authentic customer sentiments regarding demi-fine and gold-plated jewelry.
2. Note frequent customer concerns (e.g. tarnishing in humid weather, clasp durability, skin sensitivity, gift box quality).
3. Synthesize recurring praise and pain points into actionable merchant insights.`,
};
