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

  // If webhook URL is not configured (e.g. during dev/test), return valid simulated acceptance
  if (!webhookUrl) {
    return {
      success: true,
      jobId: payload.job_id,
      status: 'QUEUED',
      message:
        'MEDIA_PROCESSOR_WEBHOOK_URL is not set. Job queued in simulation mode ready for callback.',
      n8nExecutionId: `sim_exec_${Date.now()}`,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s webhook trigger timeout

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ruhvi-Job-Id': payload.job_id,
        'X-Ruhvi-Signature': process.env.MEDIA_PROCESSOR_SECRET || 'ruhvi_secret',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
  }
}
