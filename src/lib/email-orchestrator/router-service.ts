import {
  EmailCategory,
  EmailProviderId,
  EmailRoutingPolicy,
} from '@/types/email-orchestrator';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { INITIAL_ROUTING_POLICIES } from './config';
import { QuotaService } from './quota-service';

function normalizeCategory(category: EmailCategory): EmailCategory {
  switch (category) {
    case 'order':
      return 'order_transactional';
    case 'shipping':
      return 'shipping_transactional';
    case 'account':
      return 'account_lifecycle';
    case 'auth':
      return 'account_security';
    case 'support':
      return 'customer_support';
    case 'marketing_automation':
      return 'marketing_campaign';
    default:
      return category;
  }
}

export class RouterService {
  /**
   * Retrieves active routing policy for a category.
   */
  static async getPolicy(
    rawCategory: EmailCategory
  ): Promise<EmailRoutingPolicy> {
    const category = normalizeCategory(rawCategory);
    try {
      const supabase = await getSupabaseAdmin();
      const { data } = await supabase
        .from('email_routing_policies')
        .select('*')
        .eq('category', category)
        .single();

      if (data && data.enabled) {
        return {
          category: data.category as EmailCategory,
          primaryProvider: data.primary_provider as EmailProviderId,
          fallbackProvider: (data.fallback_provider as EmailProviderId) || null,
          enabled: data.enabled,
          fallbackEnabled: data.fallback_enabled,
          priority: data.priority,
          maxAttempts: data.max_attempts,
          dailyLimitBudget: data.daily_limit_budget,
        };
      }
    } catch {}

    return (
      INITIAL_ROUTING_POLICIES[category] ||
      INITIAL_ROUTING_POLICIES.order_transactional
    );
  }

  /**
   * Resolves the best provider with quota reservation for an email dispatch.
   */
  static async selectProviderWithQuota(
    category: EmailCategory
  ): Promise<{ provider: EmailProviderId; isFallback: boolean } | null> {
    const policy = await this.getPolicy(category);
    if (!policy.enabled) return null;

    // 1. Try Primary Provider with Quota Reservation
    const primaryReserved = await QuotaService.reserveQuota(
      policy.primaryProvider,
      1
    );
    if (primaryReserved) {
      return { provider: policy.primaryProvider, isFallback: false };
    }

    // 2. Try Fallback Provider if configured & enabled
    if (policy.fallbackEnabled && policy.fallbackProvider) {
      // Marketing to Resend is restricted unless Audience sync is explicitly handled
      if (
        category === 'marketing_campaign' &&
        policy.fallbackProvider === 'resend'
      ) {
        console.warn(
          '[RouterService] Marketing fallback to Resend /emails is disallowed.'
        );
        return null;
      }

      const fallbackReserved = await QuotaService.reserveQuota(
        policy.fallbackProvider,
        1
      );
      if (fallbackReserved) {
        return { provider: policy.fallbackProvider, isFallback: true };
      }
    }

    console.warn(
      `[RouterService] No provider quota available for category: ${category}`
    );
    return null;
  }
}
