import { z } from 'zod';

export const explicitMemorySchema = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1, 'Memory content cannot be empty'),
  memory_type: z
    .enum([
      'user_instruction',
      'user_preference',
      'project_memory',
      'episodic_memory',
      'candidate_lesson',
      'verified_lesson',
      'research_memory',
    ])
    .default('user_instruction'),
  scope: z.string().default('global'),
  normalized_key: z.string().optional(),
  source: z.string().default('user_explicit'),
  priority: z.number().int().default(0),
});

export const candidateLessonSchema = z.object({
  lesson: z.string().min(1),
  observed_failure: z.string().optional(),
  evidence_refs: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export const verifyLessonSchema = z.object({
  candidate_id: z.string().min(1),
  verification_summary: z.string().min(1),
  evidence_refs: z.array(z.string()).default([]),
});

export const agentRunSchema = z.object({
  id: z.string().uuid().optional(),
  task_type: z.string().min(1),
  model_route: z.string().optional(),
  correlation_id: z.string().optional(),
  outcome_summary: z.string().optional(),
  status: z
    .enum(['running', 'completed', 'failed', 'cancelled'])
    .default('running'),
});

export const runEventSchema = z.object({
  worker_run_id: z.string().optional(),
  event_type: z.string().min(1),
  event_json: z.union([z.record(z.string(), z.any()), z.string()]),
});
