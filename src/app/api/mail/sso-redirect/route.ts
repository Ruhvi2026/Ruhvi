import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createServerClient } from '@supabase/ssr';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const RUHMAIL_SSO_SECRET =
  process.env.RUHMAIL_SSO_SECRET ||
  'ruhvi_sso_secret_73012e9170b1c74522222d12694ee063_2026';
const RUHMAIL_URL =
  process.env.NEXT_PUBLIC_RUHMAIL_URL || 'https://mail.ruhvi.in';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok || !adminCheck.uid) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', '/api/mail/sso-redirect');
      return NextResponse.redirect(loginUrl);
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    });

    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name, role, department')
      .eq('id', adminCheck.uid)
      .maybeSingle();

    const userEmail = (user?.email || '').toLowerCase().trim();
    const userRole = (user?.role || adminCheck.role || 'staff').toLowerCase();
    const fullName = user?.full_name || 'Staff Member';

    const requestedMailbox = request.nextUrl.searchParams.get('mailbox');
    let targetEmail = '';
    let allowedEmails: string[] = [];

    // Role-based & Identity-based mailbox assignment
    if (userRole === 'super_admin' || userEmail === 'ruhvi.main@gmail.com') {
      // Super Admin: master access to all inboxes
      allowedEmails = [
        'admin@ruhvi.in',
        'subhas.das@ruhvi.in',
        'shreya.maity@ruhvi.in',
        'support@ruhvi.in',
        'orders@ruhvi.in',
        'sales@ruhvi.in',
      ];
      if (requestedMailbox) {
        const cleaned = requestedMailbox.toLowerCase().trim();
        targetEmail = cleaned.includes('@') ? cleaned : `${cleaned}@ruhvi.in`;
      } else {
        targetEmail = 'admin@ruhvi.in';
      }
    } else if (
      userEmail === 'subhasdas1996@gmail.com' ||
      userRole === 'manager'
    ) {
      // Subhas (Manager): personal mailbox + operations/support/orders/sales
      allowedEmails = [
        'subhas.das@ruhvi.in',
        'support@ruhvi.in',
        'orders@ruhvi.in',
        'sales@ruhvi.in',
      ];
      if (requestedMailbox) {
        const cleaned = requestedMailbox.toLowerCase().trim();
        const fullCleaned = cleaned.includes('@')
          ? cleaned
          : `${cleaned}@ruhvi.in`;
        targetEmail = allowedEmails.includes(fullCleaned)
          ? fullCleaned
          : 'subhas.das@ruhvi.in';
      } else {
        targetEmail = 'subhas.das@ruhvi.in';
      }
    } else if (userEmail === 'shreyamaity26@gmail.com') {
      // Shreya (Staff): personal mailbox + orders/support
      allowedEmails = [
        'shreya.maity@ruhvi.in',
        'orders@ruhvi.in',
        'support@ruhvi.in',
      ];
      if (requestedMailbox) {
        const cleaned = requestedMailbox.toLowerCase().trim();
        const fullCleaned = cleaned.includes('@')
          ? cleaned
          : `${cleaned}@ruhvi.in`;
        targetEmail = allowedEmails.includes(fullCleaned)
          ? fullCleaned
          : 'shreya.maity@ruhvi.in';
      } else {
        targetEmail = 'shreya.maity@ruhvi.in';
      }
    } else if (userEmail === 'jarviscomputers.online@gmail.com') {
      targetEmail = 'tech@ruhvi.in';
      allowedEmails = ['tech@ruhvi.in'];
    } else {
      const sanitizedName = (fullName || 'staff')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.');
      targetEmail = `${sanitizedName}@ruhvi.in`;
      allowedEmails = [targetEmail];
    }

    const payload = {
      uid: adminCheck.uid,
      email: userEmail,
      name: fullName,
      role: userRole,
      targetEmail,
      allowedEmails,
      exp: Math.floor(Date.now() / 1000) + 120, // 2-minute expiration
      nonce: crypto.randomUUID(),
    };

    const payloadStr = JSON.stringify(payload);
    const b64Payload = Buffer.from(payloadStr).toString('base64url');
    const hmac = crypto.createHmac('sha256', RUHMAIL_SSO_SECRET);
    hmac.update(payloadStr);
    const sigHex = hmac.digest('hex');
    const ticket = `${b64Payload}.${sigHex}`;

    const ssoTargetUrl = new URL('/api/auth/sso', RUHMAIL_URL);
    ssoTargetUrl.searchParams.set('ticket', ticket);

    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam) {
      ssoTargetUrl.searchParams.set('redirect', redirectParam);
    }

    return NextResponse.redirect(ssoTargetUrl.toString(), 303);
  } catch (error) {
    console.error('[SSO Redirect Error]:', error);
    return NextResponse.redirect(
      new URL('/admin?error=sso_failed', request.url)
    );
  }
}
