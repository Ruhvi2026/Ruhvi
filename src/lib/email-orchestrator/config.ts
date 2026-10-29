import {
  EmailCategory,
  EmailProviderId,
  EmailRoutingPolicy,
} from '@/types/email-orchestrator';

export const EMAIL_CONFIG = {
  isV2Enabled: (): boolean => process.env.EMAIL_ROUTING_V2_ENABLED === 'true',
  isSafeMode: (): boolean => process.env.EMAIL_SAFE_MODE !== 'false',
  disablePaidOverage: (): boolean =>
    process.env.EMAIL_DISABLE_PAID_OVERAGE !== 'false',

  defaultSenderEmail:
    process.env.RESEND_SENDER_EMAIL || 'notifications@ruhvi.in',
  defaultSenderName: 'Ruhvi',

  allowlist: (): string[] => {
    const raw = process.env.EMAIL_TEST_ALLOWLIST || '';
    return raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },

  isRecipientAllowedInSafeMode: (email: string): boolean => {
    if (!EMAIL_CONFIG.isSafeMode()) return true;
    const normalized = email.trim().toLowerCase();
    const allowlist = EMAIL_CONFIG.allowlist();
    if (allowlist.length === 0) {
      // In safe mode without allowlist, only ruhvi admin/main or test domains are allowed
      return (
        normalized.endsWith('@ruhvi.in') ||
        normalized === 'ruhvi.main@gmail.com'
      );
    }
    return allowlist.includes(normalized);
  },

  providerDefaults: {
    resend: {
      dailyLimit: 100,
      monthlyLimit: 3000,
      requiresAudienceForMarketing: true,
    },
    mailjet: {
      dailyLimit: 200,
      monthlyLimit: 6000,
      storedContactLimit: 1000,
    },
    brevo: {
      dailyLimit: 300,
      monthlyLimit: 9000,
    },
  },
};

export const INITIAL_ROUTING_POLICIES: Record<
  EmailCategory,
  EmailRoutingPolicy
> = {
  account_security: {
    category: 'account_security',
    primaryProvider: 'resend',
    fallbackProvider: 'mailjet',
    enabled: true,
    fallbackEnabled: true,
    priority: 100,
    maxAttempts: 4,
  },
  account_lifecycle: {
    category: 'account_lifecycle',
    primaryProvider: 'resend',
    fallbackProvider: 'mailjet',
    enabled: true,
    fallbackEnabled: true,
    priority: 80,
    maxAttempts: 4,
  },
  order_transactional: {
    category: 'order_transactional',
    primaryProvider: 'mailjet',
    fallbackProvider: 'resend',
    enabled: true,
    fallbackEnabled: true,
    priority: 90,
    maxAttempts: 4,
  },
  shipping_transactional: {
    category: 'shipping_transactional',
    primaryProvider: 'mailjet',
    fallbackProvider: 'resend',
    enabled: true,
    fallbackEnabled: true,
    priority: 85,
    maxAttempts: 4,
  },
  customer_support: {
    category: 'customer_support',
    primaryProvider: 'mailjet',
    fallbackProvider: 'resend',
    enabled: true,
    fallbackEnabled: true,
    priority: 70,
    maxAttempts: 4,
  },
  marketing_campaign: {
    category: 'marketing_campaign',
    primaryProvider: 'mailjet',
    fallbackProvider: null, // Marketing fallback to Resend requires synced Audience contacts
    enabled: true,
    fallbackEnabled: false,
    priority: 20,
    maxAttempts: 3,
  },
  internal_staff: {
    category: 'internal_staff',
    primaryProvider: 'brevo',
    fallbackProvider: 'mailjet',
    enabled: true,
    fallbackEnabled: true,
    priority: 50,
    maxAttempts: 3,
  },
};
