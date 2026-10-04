jest.mock('server-only', () => ({}));

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        const stream = {
          end: (buffer: Buffer) => {
            callback(null, {
              secure_url: `https://res.cloudinary.com/io1kkukg/video/upload/v123456789/marketing/campaigns/${options.public_id || 'flow_clip_1'}.mp4`,
              public_id: options.public_id || 'marketing/flow_clip_1',
              format: 'mp4',
              duration: 8.5,
              bytes: buffer.length || 1024,
              width: 1080,
              height: 1920,
            });
          },
        };
        return stream;
      }),
    },
  },
}));

import {
  validateVideoUpload,
  uploadMarketingVideoToCloudinary,
} from '../marketing/cloudinary-service';
import { triggerN8nMediaProcessor } from '../marketing/n8n-client';
import {
  createAndDispatchMediaJob,
  handleMediaJobCallback,
  analyzeFinalMarketingVideo,
} from '../marketing/media-job-service';

describe('Marketing Media Pipeline & Job Architecture', () => {
  it('validates video upload formats and rejects oversized files', () => {
    const validMp4 = validateVideoUpload({
      size: 5 * 1024 * 1024,
      type: 'video/mp4',
      name: 'flow_clip_1.mp4',
    });
    expect(validMp4.valid).toBe(true);

    const oversized = validateVideoUpload({
      size: 150 * 1024 * 1024, // 150MB
      type: 'video/mp4',
      name: 'too_large.mp4',
    });
    expect(oversized.valid).toBe(false);
    expect(oversized.error).toContain('100MB');

    const invalidType = validateVideoUpload({
      size: 2 * 1024 * 1024,
      type: 'application/pdf',
      name: 'doc.pdf',
    });
    expect(invalidType.valid).toBe(false);
  });

  it('uploads video asset to Cloudinary and returns secure URL with metadata', async () => {
    const res = await uploadMarketingVideoToCloudinary(Buffer.from('sample_video_bytes'), {
      campaignId: 'cmp_test_123',
      taskId: 'task_001',
      clipIndex: 1,
      fileName: 'clip_1.mp4',
    });

    expect(res.secureUrl).toContain('cloudinary.com');
    expect(res.format).toBe('mp4');
    expect(res.publicId).toContain('flow_clip_1');
  });

  it('validates n8n media webhook payload contract', async () => {
    const result = await triggerN8nMediaProcessor({
      job_id: 'job_test_01',
      campaign_id: 'cmp_01',
      task_id: 'task_01',
      video_1_url: 'https://res.cloudinary.com/demo/video1.mp4',
      video_2_url: 'https://res.cloudinary.com/demo/video2.mp4',
      voiceover_requirements: {
        language: 'bengali',
        script: 'রূহভি খাঁটি ২২ ক্যারেট গোল্ড প্লেটেড কালেকশন।',
      },
      audio_requirements: { ducking: true },
      processing_requirements: {
        merge_clips: true,
        transition_type: 'crossfade',
        transition_duration_ms: 300,
        subtitles: true,
        target_aspect_ratio: '9:16',
        target_fps: 30,
      },
      output_requirements: {
        format: 'mp4',
        codec: 'h264',
        max_duration_seconds: 15,
        destination_folder: 'marketing/final',
      },
      callback_url: 'http://localhost:3000/api/marketing/media-jobs/callback',
    });

    expect(result.success).toBe(true);
    expect(result.jobId).toBe('job_test_01');
  });

  it('orchestrates async media job from creation to callback and final video analysis', async () => {
    // 1. Create and dispatch media job
    const job = await createAndDispatchMediaJob({
      campaignId: 'cmp_diwali_2026',
      taskId: 'task_creative_01',
      video1Url: 'https://res.cloudinary.com/demo/video1.mp4',
      video2Url: 'https://res.cloudinary.com/demo/video2.mp4',
      voiceoverLanguage: 'bengali',
      voiceoverScript: 'রূহভি খাঁটি ২২ ক্যারেট গোল্ড প্লেটেড কালেকশন।',
    });

    expect(job.jobId).toBeTruthy();
    expect(job.status === 'processing' || job.status === 'pending').toBe(true);
    expect(job.inputAssets.video1Url).toContain('video1.mp4');

    // 2. Simulate n8n webhook callback with final stitched Cloudinary URL
    const callbackRes = await handleMediaJobCallback({
      jobId: job.jobId,
      status: 'COMPLETED',
      finalVideoUrl: 'https://res.cloudinary.com/demo/final_stitched_reel.mp4',
      finalPublicId: 'marketing/final/final_stitched_reel',
    });

    expect(callbackRes.success).toBe(true);
    expect(callbackRes.job?.status).toBe('completed');
    expect(callbackRes.job?.outputAsset?.finalVideoUrl).toContain('final_stitched_reel.mp4');

    // 3. Verify Final Media Analysis
    const analysis = callbackRes.job?.outputAsset?.analysis;
    expect(analysis).toBeDefined();
    expect(analysis?.status).toBe('PASS');
    expect(analysis?.score).toBeGreaterThanOrEqual(90);
    expect(analysis?.checks.visualContinuity).toBe(true);
  });
});
