import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server';
import { getCampaignStats, sendTransactionalEmail } from '@/lib/brevo';

function hasPermission(profile: any, reqPerm: string) {
  if (!profile) return false;
  const role = profile.role?.toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  const perms = profile.permissions || [];
  if (perms.includes('*') || perms.includes(reqPerm)) return true;
  const [module] = reqPerm.split('.');
  if (perms.includes(`${module}.*`)) return true;
  return false;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!hasPermission(profile, 'campaigns.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call Brevo API to get campaign stats
    const stats = await getCampaignStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching campaign stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (
      !hasPermission(profile, 'campaigns.create') &&
      !hasPermission(profile, 'campaigns.edit')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { to, subject, htmlContent } = body;

    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing required fields (to, subject, htmlContent)' },
        { status: 400 }
      );
    }

    // Safety check: Only allow sending to test emails or the logged-in admin's email
    // To prevent spamming real customers during development
    const allowedEmails = [
      user.email,
      'test@ruhvi.in',
      'dev@ruhvi.in',
      'marketing@ruhvi.in',
    ];
    const isAllowed = allowedEmails.includes(to.toLowerCase());

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: `Safety lock active: Can only send test emails to authorized addresses (${allowedEmails.join(', ')}).`,
        },
        { status: 403 }
      );
    }

    const result = await sendTransactionalEmail(
      to,
      subject,
      htmlContent,
      'Ruhvi Marketing'
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending campaign email:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
