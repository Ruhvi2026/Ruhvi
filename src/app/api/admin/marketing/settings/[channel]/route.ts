import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

// In-memory mock store for settings
const mockSettings: Record<string, any> = {
  email: {
    apiKey: 'xkeysib-mock-123',
    senderName: 'Ruhvi Marketing',
    senderEmail: 'marketing@ruhvi.in',
  },
  whatsapp: {
    accessToken: 'mock-whatsapp-token',
    phoneNumberId: '919876543210',
    businessAccountId: 'ruhvi-biz-123',
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const { channel } = await params;
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = mockSettings[channel] || {};
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const { channel } = await params;
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Merge new settings with existing mock settings
    mockSettings[channel] = {
      ...(mockSettings[channel] || {}),
      ...body,
    };

    return NextResponse.json({
      success: true,
      settings: mockSettings[channel],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
