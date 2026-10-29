import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/service';

export class SuppressionService {
  static hashEmail(email: string): string {
    return crypto
      .createHash('sha256')
      .update(email.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * Checks if an email is suppressed globally.
   */
  static async isSuppressed(
    email: string
  ): Promise<{ suppressed: boolean; reason?: string }> {
    const hash = this.hashEmail(email);
    try {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase
        .from('email_suppressions')
        .select('reason')
        .eq('email_hash', hash)
        .limit(1);

      if (error || !data || data.length === 0) {
        return { suppressed: false };
      }

      return { suppressed: true, reason: data[0].reason };
    } catch {
      return { suppressed: false };
    }
  }

  /**
   * Adds an email to the suppression table.
   */
  static async addSuppression(
    email: string,
    reason:
      | 'unsubscribe'
      | 'hard_bounce'
      | 'spam_complaint'
      | 'manual_block'
      | 'invalid',
    sourceProvider?: string
  ): Promise<void> {
    const hash = this.hashEmail(email);
    const normalized = email.trim().toLowerCase();
    try {
      const supabase = await getSupabaseAdmin();
      await supabase.from('email_suppressions').upsert(
        {
          email_hash: hash,
          email: normalized,
          reason,
          source_provider: sourceProvider || null,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'email_hash' }
      );
    } catch (e: any) {
      console.warn(
        '[SuppressionService] Failed to record suppression:',
        e.message
      );
    }
  }

  /**
   * Checks if marketing consent is active for promotional campaigns.
   */
  static async hasMarketingConsent(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    try {
      const supabase = await getSupabaseAdmin();
      const { data } = await supabase
        .from('email_marketing_consent')
        .select('has_consent')
        .eq('email', normalized)
        .limit(1);

      if (!data || data.length === 0) return false;
      return data[0].has_consent === true;
    } catch {
      return false;
    }
  }
}
