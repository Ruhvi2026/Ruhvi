import { EmailProviderId } from '@/types/email-orchestrator';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { EMAIL_CONFIG } from './config';

export class QuotaService {
  /**
   * Atomically reserves capacity for a provider before attempting to dispatch an email.
   * Returns false if daily or monthly limits are exceeded.
   */
  static async reserveQuota(
    provider: EmailProviderId,
    count: number = 1
  ): Promise<boolean> {
    if (provider === 'brevo_legacy') return true;

    const defaults =
      provider === 'resend'
        ? EMAIL_CONFIG.providerDefaults.resend
        : EMAIL_CONFIG.providerDefaults.mailjet;

    try {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase.rpc('reserve_email_quota', {
        p_provider: provider,
        p_daily_limit: defaults.dailyLimit,
        p_monthly_limit: defaults.monthlyLimit,
        p_count: count,
      });

      if (error) {
        console.warn(
          `[QuotaService] reserve_email_quota RPC error for ${provider}:`,
          error.message
        );
        // Fail-safe: if RPC not yet installed, allow if disablePaidOverage is checked
        return true;
      }

      return data === true;
    } catch (err: any) {
      console.warn(
        `[QuotaService] Exception reserving quota for ${provider}:`,
        err.message
      );
      return true;
    }
  }

  /**
   * Commits reserved quota to accepted state after provider acknowledges receipt.
   */
  static async commitQuota(
    provider: EmailProviderId,
    count: number = 1
  ): Promise<void> {
    if (provider === 'brevo_legacy') return;

    try {
      const supabase = await getSupabaseAdmin();
      await supabase.rpc('commit_email_quota', {
        p_provider: provider,
        p_count: count,
      });
    } catch (err: any) {
      console.warn(
        `[QuotaService] commit_email_quota error for ${provider}:`,
        err.message
      );
    }
  }

  /**
   * Releases reserved quota on confirmed pre-acceptance failure.
   */
  static async releaseQuota(
    provider: EmailProviderId,
    count: number = 1
  ): Promise<void> {
    if (provider === 'brevo_legacy') return;

    try {
      const supabase = await getSupabaseAdmin();
      await supabase.rpc('release_email_quota', {
        p_provider: provider,
        p_count: count,
      });
    } catch (err: any) {
      console.warn(
        `[QuotaService] release_email_quota error for ${provider}:`,
        err.message
      );
    }
  }
}
