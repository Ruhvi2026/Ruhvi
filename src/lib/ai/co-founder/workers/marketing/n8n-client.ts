import 'server-only';

export interface N8nMediaProcessingPayload {
  job_id: string;
  campaign_id: string;
  task_id: string;
  video_1_url: string;
  video_2_url: string;
  voiceover_requirements: {
    language: 'bengali' | 'hindi' | 'english';
    script: string;
    tts_voice?: string;
  };
  audio_requirements: {
    background_music?: string;
    ducking: boolean;
    volume_db?: number;
  };
  processing_requirements: {
    merge_clips: boolean;
    transition_type: 'crossfade' | 'cut' | 'smooth_pan';
    transition_duration_ms: number;
    subtitles: boolean;
    target_aspect_ratio: string;
    target_fps: number;
  };
  output_requirements: {
    format: 'mp4';
    codec: 'h264';
    max_duration_seconds: number;
    destination_folder: string;
  };
  callback_url: string;
}

export interface N8nWebhookResponse {
  success: boolean;
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  message?: string;
  n8nExecutionId?: string;
  error?: string;
}

export async function triggerN8nMediaProcessor(
  payload: N8nMediaProcessingPayload,
  customWebhookUrl?: string
): Promise<N8nWebhookResponse> {
  const webhookUrl =
    customWebhookUrl ||
    process.env.MEDIA_PROCESSOR_WEBHOOK_URL ||
    process.env.N8N_MEDIA_WEBHOOK_URL;

  // Validate payload contract before dispatch
  if (!payload.job_id || !payload.video_1_url || !payload.video_2_url) {
    throw new Error(
      'Invalid n8n media processing payload: job_id, video_1_url, and video_2_url are required.'
    );
  }

  // If webhook URL is not configured, fail closed in production, or return simulated acceptance in dev/test
  if (!webhookUrl) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        jobId: payload.job_id,
        status: 'FAILED',
        error:
          'integration_not_configured: MEDIA_PROCESSOR_WEBHOOK_URL is not set.',
      };
    }
    return {
      success: true,
      jobId: payload.job_id,
      status: 'QUEUED',
      message:
        'MEDIA_PROCESSOR_WEBHOOK_URL is not set. Job queued in simulation mode ready for callback.',
      n8nExecutionId: `sim_exec_${Date.now()}`,
    };
  }

  const signingSecret = process.env.MEDIA_PROCESSOR_SECRET;
  if (!signingSecret && process.env.NODE_ENV === 'production') {
    return {
      success: false,
      jobId: payload.job_id,
      status: 'FAILED',
      error:
        'integration_not_configured: MEDIA_PROCESSOR_SECRET is required to dispatch media webhook in production.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s webhook trigger timeout
  if (typeof (timeoutId as any)?.unref === 'function') {
    (timeoutId as any).unref();
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Ruhvi-Job-Id': payload.job_id,
    };
    if (signingSecret) {
      headers['X-Ruhvi-Signature'] = signingSecret;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        jobId: payload.job_id,
        status: 'FAILED',
        error: `n8n webhook returned HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      jobId: payload.job_id,
      status: data.status || 'QUEUED',
      n8nExecutionId: data.executionId || data.id,
      message: 'Media processing job successfully accepted by n8n workflow.',
    };
  } catch (err: any) {
    return {
      success: false,
      jobId: payload.job_id,
      status: 'FAILED',
      error: `Failed to trigger n8n media webhook: ${err.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
