import { NextResponse, NextRequest } from 'next/server';
import { getCurrentSupportUser } from '@/lib/support/serverAuth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentSupportUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      canned_responses: [],
    });
  } catch (err: any) {
    console.error('Canned responses GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentSupportUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'canned responses storage not configured' },
      { status: 501 }
    );
  } catch (err: any) {
    console.error('Canned responses POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
