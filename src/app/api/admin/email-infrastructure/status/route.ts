import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { CredentialService } from '@/lib/email-orchestrator/credential-service';
import {
  INITIAL_ROUTING_POLICIES,
  EMAIL_CONFIG,
} from '@/lib/email-orchestrator/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseAdmin();

    // 1. Provider Statuses
    const resendStatus = await CredentialService.getMaskedStatus('resend');
    const mailjetStatus = await CredentialService.getMaskedStatus('mailjet');
    const brevoStatus = await CredentialService.getMaskedStatus('brevo');

    // 2. Active Routing Policies
    let policies = INITIAL_ROUTING_POLICIES;
    try {
      const { data: dbPolicies } = await supabase
        .from('email_routing_policies')
        .select('*');
      if (dbPolicies && dbPolicies.length > 0) {
        const mapped: Record<string, any> = { ...INITIAL_ROUTING_POLICIES };
        for (const p of dbPolicies) {
          mapped[p.category] = {
            category: p.category,
            primaryProvider: p.primary_provider,
            fallbackProvider: p.fallback_provider,
            enabled: p.enabled,
            fallbackEnabled: p.fallback_enabled,
            priority: p.priority,
            maxAttempts: p.max_attempts,
          };
        }
        policies = mapped as any;
      }
    } catch {}

    // 3. Live Quota Windows
    let quotaWindows: any[] = [];
    try {
      const { data: windows } = await supabase
        .from('email_quota_windows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      quotaWindows = windows || [];
    } catch {}

    // 4. Recent Deliveries
    let recentDeliveries: any[] = [];
    try {
      const { data: deliveries } = await supabase
        .from('email_deliveries')
        .select(
          'id, event_key, event_type, category, recipient_email, subject, status, selected_provider, provider_message_id, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(25);
      recentDeliveries = deliveries || [];
    } catch {}

    return NextResponse.json({
      success: true,
      config: {
        v2Enabled: EMAIL_CONFIG.isV2Enabled(),
        safeMode: EMAIL_CONFIG.isSafeMode(),
        disablePaidOverage: EMAIL_CONFIG.disablePaidOverage(),
        defaultSender: EMAIL_CONFIG.defaultSenderEmail,
      },
      providers: {
        resend: resendStatus,
        mailjet: mailjetStatus,
        brevo: brevoStatus,
      },
      policies,
      quotaWindows,
      recentDeliveries,
    });
  } catch (error: any) {
    console.error('[Admin Email Status Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
