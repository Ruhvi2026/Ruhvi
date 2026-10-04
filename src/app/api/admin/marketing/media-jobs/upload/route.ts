import { NextResponse } from 'next/server';
import {
  validateVideoUpload,
  uploadMarketingVideoToCloudinary,
} from '@/lib/ai/co-founder/workers/marketing/cloudinary-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clipIndexStr = (formData.get('clipIndex') as string) || '1';
    const campaignId = (formData.get('campaignId') as string) || 'general';
    const taskId = (formData.get('taskId') as string) || 'general_task';

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided for upload.' },
        { status: 400 }
      );
    }

    const clipIndex = parseInt(clipIndexStr, 10) as 1 | 2;
    if (clipIndex !== 1 && clipIndex !== 2) {
      return NextResponse.json(
        { error: 'clipIndex must be 1 (for Video 1) or 2 (for Video 2).' },
        { status: 400 }
      );
    }

    // 1. Validate file format and size
    const validation = validateVideoUpload({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Read file buffer and upload to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await uploadMarketingVideoToCloudinary(buffer, {
      campaignId,
      taskId,
      clipIndex,
      fileName: file.name,
    });

    return NextResponse.json({
      success: true,
      clipIndex,
      secureUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      duration: uploadResult.duration,
      bytes: uploadResult.bytes,
      message: `Video ${clipIndex} successfully uploaded to Cloudinary.`,
    });
  } catch (err: any) {
    console.error('Video upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload video to Cloudinary' },
      { status: 500 }
    );
  }
}
