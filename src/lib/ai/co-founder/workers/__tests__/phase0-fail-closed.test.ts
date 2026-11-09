jest.mock('server-only', () => ({}));

import {
  isCloudinaryConfigured,
  uploadMarketingVideoToCloudinary,
} from '../marketing/cloudinary-service';
import { triggerN8nMediaProcessor } from '../marketing/n8n-client';

describe('Phase 0 Fail-Closed Integration Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Cloudinary Service Fail-Closed Protection', () => {
    it('returns false for isCloudinaryConfigured when credentials are missing', () => {
      delete process.env.CHAT_CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CHAT_CLOUDINARY_API_SECRET;
      delete process.env.CLOUDINARY_API_SECRET;
      delete process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME;
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_CLOUD_NAME;

      expect(isCloudinaryConfigured()).toBe(false);
    });

    it('fails closed in production if Cloudinary credentials are absent', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.CHAT_CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CHAT_CLOUDINARY_API_SECRET;
      delete process.env.CLOUDINARY_API_SECRET;

      await expect(
        uploadMarketingVideoToCloudinary(Buffer.from('dummy_video_bytes'), {
          campaignId: 'cmp_fail_test',
          clipIndex: 1,
        })
      ).rejects.toThrow(/integration_not_configured/);
    });

    it('provides safe simulation in non-production without throwing', async () => {
      (process.env as any).NODE_ENV = 'test';
      delete process.env.CHAT_CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CHAT_CLOUDINARY_API_SECRET;
      delete process.env.CLOUDINARY_API_SECRET;

      const result = await uploadMarketingVideoToCloudinary(
        Buffer.from('dummy_video_bytes'),
        {
          campaignId: 'cmp_sim_test',
          clipIndex: 1,
        }
      );

      expect(result).toBeDefined();
      expect(result.secureUrl).toContain('cloudinary.com');
      expect(result.format).toBe('mp4');
    });
  });

  describe('n8n Client Fail-Closed Protection', () => {
    it('fails closed in production if webhook URL is not set', async () => {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.MEDIA_PROCESSOR_WEBHOOK_URL;
      delete process.env.N8N_MEDIA_WEBHOOK_URL;

      const res = await triggerN8nMediaProcessor({
        job_id: 'test_job_fail_closed',
        campaign_id: 'cmp_01',
        task_id: 'tsk_01',
        video_1_url: 'https://example.com/v1.mp4',
        video_2_url: 'https://example.com/v2.mp4',
        voiceover_requirements: { language: 'bengali', script: 'test' },
        audio_requirements: { ducking: true },
        processing_requirements: {
          merge_clips: true,
          transition_type: 'crossfade',
          transition_duration_ms: 300,
          subtitles: false,
          target_aspect_ratio: '9:16',
          target_fps: 30,
        },
        output_requirements: {
          format: 'mp4',
          codec: 'h264',
          max_duration_seconds: 15,
          destination_folder: 'marketing/test',
        },
        callback_url: 'https://example.com/callback',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('FAILED');
      expect(res.error).toContain('integration_not_configured');
    });

    it('fails closed in production if webhook secret is not set', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.MEDIA_PROCESSOR_WEBHOOK_URL =
        'https://n8n.internal.ruhvi.in/webhook/media';
      delete process.env.MEDIA_PROCESSOR_SECRET;

      const res = await triggerN8nMediaProcessor({
        job_id: 'test_job_missing_secret',
        campaign_id: 'cmp_01',
        task_id: 'tsk_01',
        video_1_url: 'https://example.com/v1.mp4',
        video_2_url: 'https://example.com/v2.mp4',
        voiceover_requirements: { language: 'bengali', script: 'test' },
        audio_requirements: { ducking: true },
        processing_requirements: {
          merge_clips: true,
          transition_type: 'crossfade',
          transition_duration_ms: 300,
          subtitles: false,
          target_aspect_ratio: '9:16',
          target_fps: 30,
        },
        output_requirements: {
          format: 'mp4',
          codec: 'h264',
          max_duration_seconds: 15,
          destination_folder: 'marketing/test',
        },
        callback_url: 'https://example.com/callback',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('FAILED');
      expect(res.error).toContain('MEDIA_PROCESSOR_SECRET');
    });
  });
});
