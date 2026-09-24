import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;

  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, full_name, email, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();

  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

const DEFAULT_SETTINGS = {
  allow_staff_direct_messages: true,
  allow_staff_group_creation: true,
  max_attachment_size_mb: 20,
  enable_file_attachments: true,
  broadcast_channel_name: '📢 Official Staff Broadcast',
  auto_archive_resolved_after_days: 30,
};

// GET /api/internal-chat/admin/settings
export async function GET() {
  try {
    const user = await getAuthenticatedStaff();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data: row, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'internal_chat_settings')
      .maybeSingle();

    if (error) {
      console.error('Error fetching chat settings:', error);
    }

    const settings = row?.value
      ? { ...DEFAULT_SETTINGS, ...row.value }
      : DEFAULT_SETTINGS;
    return NextResponse.json({
      settings,
      is_admin: ['super_admin', 'admin'].includes(user.role),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/internal-chat/admin/settings
export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedStaff();
    if (!user || !['super_admin', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden. Only Admins can modify chat settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updatedSettings = {
      ...DEFAULT_SETTINGS,
      ...body,
    };

    const supabase = getServiceClient();
    const { error } = await supabase.from('settings').upsert(
      {
        key: 'internal_chat_settings',
        value: updatedSettings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
