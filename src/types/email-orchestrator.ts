export type EmailProviderId = 'resend' | 'mailjet' | 'brevo' | 'brevo_legacy';

export type EmailCategory =
  | 'account_security'
  | 'account_lifecycle'
  | 'order_transactional'
  | 'shipping_transactional'
  | 'customer_support'
  | 'marketing_campaign'
  | 'marketing_automation'
  | 'internal_staff'
  | 'order'
  | 'shipping'
  | 'account'
  | 'auth'
  | 'support';

export type EmailDeliveryStatus =
  | 'queued'
  | 'reserved'
  | 'sending'
  | 'accepted'
  | 'delivered'
  | 'delivery_delayed'
  | 'retry_scheduled'
  | 'failed'
  | 'unknown'
  | 'bounced'
  | 'complained'
  | 'suppressed'
  | 'cancelled'
  | 'dead_letter';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface NormalizedEmailMessage {
  deliveryId: string;
  idempotencyKey: string;
  category: EmailCategory;
  from: EmailAddress;
  to: EmailAddress;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  tags?: Record<string, string>;
  customCampaign?: string;
}

export interface ProviderSendResult {
  provider: EmailProviderId;
  accepted: boolean;
  providerMessageId: string | null;
  providerMessageUuid?: string | null;
  customId: string;
  acceptedAt?: string;
  rawStatus?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface ProviderUsageSnapshot {
  provider: EmailProviderId;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  resetAtUtc?: string;
  timestamp: string;
}

export interface EmailProviderAdapter {
  readonly id: EmailProviderId;
  validateCredentials(): Promise<{ valid: boolean; detail?: string }>;
  checkSenderIdentity(
    sender: string
  ): Promise<{ verified: boolean; detail?: string }>;
  sendTransactional(
    message: NormalizedEmailMessage
  ): Promise<ProviderSendResult>;
  sendMarketingRecipient?(
    message: NormalizedEmailMessage
  ): Promise<ProviderSendResult>;
  reconcile?(customId: string): Promise<'accepted' | 'not_found' | 'unknown'>;
  getUsage?(): Promise<ProviderUsageSnapshot | null>;
}

export interface EmailRoutingPolicy {
  category: EmailCategory;
  primaryProvider: EmailProviderId;
  fallbackProvider: EmailProviderId | null;
  enabled: boolean;
  fallbackEnabled: boolean;
  priority: number;
  maxAttempts: number;
  dailyLimitBudget?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface QueuedDeliveryJob {
  deliveryId: string;
  schemaVersion: number;
}
