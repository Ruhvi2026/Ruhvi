import { NextResponse } from 'next/server';
import { handleMediaJobCallback } from '@/lib/ai/co-founder/workers/marketing/media-job-service';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-ruhvi-signature');
    const secret = process.env.MEDIA_PROCESSOR_SECRET || 'ruhvi_secret';

    // Validate webhook signature / secret if in production
    if (process.env.NODE_ENV === 'production' && signature !== secret) {
      return NextResponse.json(
        { error: 'Unauthorized webhook callback signature' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { job_id, jobId, status, final_video_url, finalVideoUrl, public_id, publicId, error } = body;

    const targetJobId = job_id || jobId;
    if (!targetJobId) {
      return NextResponse.json(
        { error: 'job_id is required in webhook payload' },
        { status: 400 }
      );
    }

    const normalizedStatus = (status || 'COMPLETED').toUpperCase() as 'COMPLETED' | 'FAILED';
    const targetUrl = final_video_url || finalVideoUrl;
    const targetPublicId = public_id || publicId;

    const result = await handleMediaJobCallback({
      jobId: targetJobId,
      status: normalizedStatus,
      finalVideoUrl: targetUrl,
      finalPublicId: targetPublicId,
      error,
    });

    await logAuditEvent({
      portal: 'admin',
      action: `marketing_media_job_${normalizedStatus.toLowerCase()}`,
      entityType: 'marketing_media_job',
      entityId: targetJobId,
      changes: {
        status: normalizedStatus,
        finalVideoUrl: targetUrl,
        error,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      job: result.job,
      message: `Media job ${targetJobId} successfully processed and recorded.`,
    });
  } catch (err: any) {
    console.error('Media callback error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process media callback' },
      { status: 500 }
    );
  }
}
