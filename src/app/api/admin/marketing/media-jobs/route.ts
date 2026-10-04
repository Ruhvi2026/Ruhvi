import { NextResponse } from 'next/server';
import {
  createAndDispatchMediaJob,
  getMediaJob,
  listMediaJobs,
} from '@/lib/ai/co-founder/workers/marketing/media-job-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const campaignId = searchParams.get('campaignId') || undefined;

    if (jobId) {
      const job = getMediaJob(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Media job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job });
    }

    const jobs = listMediaJobs(campaignId);
    return NextResponse.json({ success: true, jobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list media jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      campaignId,
      taskId,
      video1Url,
      video1PublicId,
      video2Url,
      video2PublicId,
      voiceoverLanguage,
      voiceoverScript,
      targetAspectRatio,
      targetDurationSeconds,
      webhookUrl,
    } = body;

    if (!video1Url || !video2Url) {
      return NextResponse.json(
        { error: 'Both video1Url and video2Url are required to start media processing.' },
        { status: 400 }
      );
    }

    const job = await createAndDispatchMediaJob({
      campaignId: campaignId || `cmp_${Date.now()}`,
      taskId: taskId || `task_${Date.now()}`,
      video1Url,
      video1PublicId,
      video2Url,
      video2PublicId,
      voiceoverLanguage,
      voiceoverScript,
      targetAspectRatio,
      targetDurationSeconds,
      webhookUrl,
    });

    return NextResponse.json({
      success: true,
      job,
      message: 'Media processing job dispatched to n8n webhook pipeline.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create media job' },
      { status: 500 }
    );
  }
}
