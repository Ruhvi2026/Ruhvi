jest.mock('server-only', () => ({}));

import { browseWebPageWithPlaywright } from '../playwright';
import { scrapeCompetitorWithScrapling } from '../scrapling';
import { triggerN8nMediaProcessor } from '../../co-founder/workers/marketing/n8n-client';
import { assertSafeOutboundUrl, UnsafeUrlError } from '@/lib/security/ssrf';

describe('Phase 2: SSRF, Browser Sandboxing & Egress Protection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('SSRF Domain & IP Validation Core', () => {
    it('blocks localhost and loopback IPv4/IPv6 addresses', async () => {
      await expect(
        assertSafeOutboundUrl('http://127.0.0.1:8080')
      ).rejects.toThrow(UnsafeUrlError);
      await expect(assertSafeOutboundUrl('http://127.0.0.2')).rejects.toThrow(
        UnsafeUrlError
      );
      await expect(
        assertSafeOutboundUrl('http://localhost:3000')
      ).rejects.toThrow(UnsafeUrlError);
      await expect(assertSafeOutboundUrl('http://[::1]')).rejects.toThrow(
        UnsafeUrlError
      );
    });

    it('blocks cloud metadata endpoints (AWS, GCP, Azure, Alibaba)', async () => {
      await expect(
        assertSafeOutboundUrl('http://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow(UnsafeUrlError);
      await expect(
        assertSafeOutboundUrl('http://100.100.100.200/latest/meta-data/')
      ).rejects.toThrow(UnsafeUrlError);
    });

    it('blocks RFC 1918 private subnets', async () => {
      await expect(assertSafeOutboundUrl('http://10.0.0.1')).rejects.toThrow(
        UnsafeUrlError
      );
      await expect(assertSafeOutboundUrl('http://172.16.0.1')).rejects.toThrow(
        UnsafeUrlError
      );
      await expect(assertSafeOutboundUrl('http://192.168.1.1')).rejects.toThrow(
        UnsafeUrlError
      );
    });

    it('rejects unsafe protocols like file://, gopher://, and ftp://', async () => {
      await expect(assertSafeOutboundUrl('file:///etc/passwd')).rejects.toThrow(
        UnsafeUrlError
      );
      await expect(
        assertSafeOutboundUrl('gopher://127.0.0.1:70/')
      ).rejects.toThrow(UnsafeUrlError);
      await expect(
        assertSafeOutboundUrl('ftp://example.com/test')
      ).rejects.toThrow(UnsafeUrlError);
    });

    it('rejects URLs with embedded credentials', async () => {
      await expect(
        assertSafeOutboundUrl('http://admin:secret@example.com')
      ).rejects.toThrow(UnsafeUrlError);
    });
  });

  describe('Playwright Browser SSRF Hardening', () => {
    it('blocks outbound navigation to loopback before browser launch', async () => {
      const result = await browseWebPageWithPlaywright({
        url: 'http://127.0.0.1:8000/internal-admin',
      });

      expect(result.status).toBe(403);
      expect(result.title).toBe('Blocked URL');
      expect(result.error).toMatch(/blocked address|restricted|denied/i);
    });

    it('blocks outbound navigation to AWS metadata endpoint', async () => {
      const result = await browseWebPageWithPlaywright({
        url: 'http://169.254.169.254/latest/meta-data/identity-credentials',
      });

      expect(result.status).toBe(403);
      expect(result.title).toBe('Blocked URL');
      expect(result.error).toMatch(/blocked address|restricted|denied/i);
    });

    it('blocks file:// protocol attempts', async () => {
      const result = await browseWebPageWithPlaywright({
        url: 'file:///etc/hosts',
      });

      expect(result.status).toBe(403);
      expect(result.title).toBe('Blocked URL');
    });
  });

  describe('Scrapling Stealth Fetcher SSRF & Code Injection Hardening', () => {
    it('blocks Scrapling requests targeting localhost or internal endpoints', async () => {
      const result = await scrapeCompetitorWithScrapling({
        url: 'http://localhost:5000/api/keys',
      });

      expect(result.status).toBe(403);
      expect(result.title).toBe('Blocked URL');
      expect(result.error).toMatch(/blocked|restricted|denied/i);
    });

    it('blocks Scrapling requests targeting cloud metadata', async () => {
      const result = await scrapeCompetitorWithScrapling({
        url: 'http://169.254.169.254/latest/meta-data/',
      });

      expect(result.status).toBe(403);
      expect(result.title).toBe('Blocked URL');
    });

    it('safely handles malicious command injection payloads without shell execution', async () => {
      const maliciousPayload =
        'http://127.0.0.1:8080"; import os; os.system("echo hacked"); #';
      const result = await scrapeCompetitorWithScrapling({
        url: maliciousPayload,
      });

      expect(result.status).toBe(403);
      expect(result.title).toBe('Blocked URL');
    });
  });

  describe('n8n Webhook Dispatch SSRF Hardening', () => {
    it('blocks dispatch to private IP webhook URLs', async () => {
      const payload = {
        job_id: 'job_sec_01',
        campaign_id: 'cmp_sec_01',
        task_id: 'task_sec_01',
        video_1_url: 'https://res.cloudinary.com/demo/video1.mp4',
        video_2_url: 'https://res.cloudinary.com/demo/video2.mp4',
        voiceover_requirements: {
          language: 'bengali' as const,
          script: 'টেস্ট',
        },
        audio_requirements: { ducking: true },
        processing_requirements: {
          merge_clips: true,
          transition_type: 'cut' as const,
          transition_duration_ms: 100,
          subtitles: false,
          target_aspect_ratio: '9:16',
          target_fps: 30,
        },
        output_requirements: {
          format: 'mp4' as const,
          codec: 'h264' as const,
          max_duration_seconds: 15,
          destination_folder: 'marketing/test',
        },
        callback_url: 'https://ruhvi.in/api/marketing/media-jobs/callback',
      };

      const result = await triggerN8nMediaProcessor(
        payload,
        'http://169.254.169.254/latest/meta-data/'
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('unsafe_webhook_url');
    });

    it('blocks dispatch to localhost webhook URLs', async () => {
      const payload = {
        job_id: 'job_sec_02',
        campaign_id: 'cmp_sec_02',
        task_id: 'task_sec_02',
        video_1_url: 'https://res.cloudinary.com/demo/video1.mp4',
        video_2_url: 'https://res.cloudinary.com/demo/video2.mp4',
        voiceover_requirements: {
          language: 'bengali' as const,
          script: 'টেস্ট',
        },
        audio_requirements: { ducking: false },
        processing_requirements: {
          merge_clips: false,
          transition_type: 'cut' as const,
          transition_duration_ms: 0,
          subtitles: false,
          target_aspect_ratio: '9:16',
          target_fps: 30,
        },
        output_requirements: {
          format: 'mp4' as const,
          codec: 'h264' as const,
          max_duration_seconds: 15,
          destination_folder: 'marketing/test',
        },
        callback_url: 'https://ruhvi.in/api/marketing/media-jobs/callback',
      };

      const result = await triggerN8nMediaProcessor(
        payload,
        'http://127.0.0.1:5678/webhook/test'
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('unsafe_webhook_url');
    });

    it('blocks unsafe callback_url in production environment', async () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.MEDIA_PROCESSOR_WEBHOOK_URL = 'https://example.com/webhook';
      process.env.MEDIA_PROCESSOR_SECRET = 'super_secret_production_key_123';

      const payload = {
        job_id: 'job_sec_03',
        campaign_id: 'cmp_sec_03',
        task_id: 'task_sec_03',
        video_1_url: 'https://res.cloudinary.com/demo/video1.mp4',
        video_2_url: 'https://res.cloudinary.com/demo/video2.mp4',
        voiceover_requirements: {
          language: 'bengali' as const,
          script: 'টেস্ট',
        },
        audio_requirements: { ducking: false },
        processing_requirements: {
          merge_clips: false,
          transition_type: 'cut' as const,
          transition_duration_ms: 0,
          subtitles: false,
          target_aspect_ratio: '9:16',
          target_fps: 30,
        },
        output_requirements: {
          format: 'mp4' as const,
          codec: 'h264' as const,
          max_duration_seconds: 15,
          destination_folder: 'marketing/test',
        },
        callback_url: 'http://169.254.169.254/secret-leak',
      };

      // Mock fetch so if it gets past SSRF check it wouldn't fail on network
      global.fetch = jest.fn();

      const result = await triggerN8nMediaProcessor(payload);

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('unsafe_callback_url');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
