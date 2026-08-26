import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary only if the secrets are available
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error:
            'Missing Cloudinary configuration. Please ensure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in your environment variables.',
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const nextCursor = searchParams.get('next_cursor');
    const folder = searchParams.get('folder') || '';

    let expression = 'resource_type:image';
    if (folder) {
      expression += ` AND folder=${folder}`;
    }

    const result = await cloudinary.search
      .expression(expression)
      .sort_by('created_at', 'desc')
      .max_results(30)
      .next_cursor(nextCursor || undefined)
      .execute();

    return NextResponse.json({
      resources: result.resources,
      next_cursor: result.next_cursor,
      total_count: result.total_count,
    });
  } catch (error: any) {
    console.error('Cloudinary API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch images from Cloudinary' },
      { status: 500 }
    );
  }
}
