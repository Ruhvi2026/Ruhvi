import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate and enforce Admin privileges
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized. Admin access required.' },
        { status: auth.status || 401 }
      );
    }

    if (auth.role !== 'super_admin' && auth.role !== 'admin') {
      return NextResponse.json(
        {
          error:
            'Forbidden. Super Admin or Admin access required to manage VIP status.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { user_id, action, days = 365, reason } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Target user_id is required.' },
        { status: 400 }
      );
    }

    if (!['grant', 'revoke', 'extend'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be grant, revoke, or extend.' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 2. Fetch admin profile and target user profile
    const { data: adminUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', auth.uid)
      .maybeSingle();

    const { data: targetUser, error: targetErr } = await supabase
      .from('users')
      .select(
        'id, full_name, email, is_vip, vip_joined_at, vip_expires_at, vip_source'
      )
      .eq('id', user_id)
      .maybeSingle();

    if (targetErr || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found in database.' },
        { status: 404 }
      );
    }

    const now = new Date();
    let newExpiresAt: string | null = null;
    let newSource = 'admin_grant';
    let isVip = true;

    if (action === 'grant') {
      const grantDays = Number(days) > 0 ? Number(days) : 365;
      newExpiresAt = new Date(
        Date.now() + grantDays * 24 * 60 * 60 * 1000
      ).toISOString();
      newSource = 'admin_grant';
      isVip = true;

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_vip: true,
          vip_joined_at: targetUser.vip_joined_at || now.toISOString(),
          vip_expires_at: newExpiresAt,
          vip_source: newSource,
        })
        .eq('id', user_id);

      if (updateErr) throw updateErr;
    } else if (action === 'extend') {
      const extendDays = Number(days) > 0 ? Number(days) : 365;
      const currentExpiry = targetUser.vip_expires_at
        ? new Date(targetUser.vip_expires_at).getTime()
        : 0;
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      newExpiresAt = new Date(
        baseTime + extendDays * 24 * 60 * 60 * 1000
      ).toISOString();
      newSource = 'admin_extended';
      isVip = true;

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_vip: true,
          vip_expires_at: newExpiresAt,
          vip_source: newSource,
        })
        .eq('id', user_id);

      if (updateErr) throw updateErr;
    } else if (action === 'revoke') {
      newExpiresAt = now.toISOString();
      newSource = 'admin_revoked';
      isVip = false;

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_vip: false,
          vip_expires_at: newExpiresAt,
          vip_source: newSource,
        })
        .eq('id', user_id);

      if (updateErr) throw updateErr;
    }

    // 3. Log Audit Event
    await logAuditEvent({
      actorId: auth.uid,
      actorEmail: adminUser?.email,
      portal: 'admin',
      action: `vip_status_${action}`,
      entityType: 'user',
      entityId: user_id,
      changes: {
        targetEmail: targetUser.email,
        targetName: targetUser.full_name,
        action,
        days: Number(days),
        reason: reason || 'Manual Admin VIP Status Adjustment',
        previous_is_vip: targetUser.is_vip,
        previous_expires_at: targetUser.vip_expires_at,
        new_is_vip: isVip,
        new_expires_at: newExpiresAt,
        new_source: newSource,
      },
    });

    return NextResponse.json({
      success: true,
      user_id,
      is_vip: isVip,
      vip_expires_at: newExpiresAt,
      vip_source: newSource,
      message:
        action === 'revoke'
          ? `Ruhvi Privé VIP status revoked for ${targetUser.full_name || targetUser.email}.`
          : `Ruhvi Privé VIP status ${action === 'extend' ? 'extended' : 'granted'} for ${targetUser.full_name || targetUser.email} until ${new Date(newExpiresAt!).toLocaleDateString('en-IN')}.`,
    });
  } catch (error: any) {
    console.error('[ADMIN-VIP-STATUS] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
