import {
  EmailCategory,
  EmailProviderId,
  NormalizedEmailMessage,
  ProviderSendResult,
} from '@/types/email-orchestrator';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { EMAIL_CONFIG } from './config';
import { SuppressionService } from './suppression-service';
import { TemplateRenderer } from './template-renderer';
import { RouterService } from './router-service';
import { QuotaService } from './quota-service';
import { getAdapter } from './adapters';

export interface DispatchEmailInput {
  category: EmailCategory;
  eventKey: string;
  eventType: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  templateFileName?: string;
  html?: string;
  variables?: Record<string, any>;
  priority?: number;
  customCampaign?: string;
}

export class EmailOrchestrator {
  /**
   * Dispatches an email with idempotency, quota protection, safety mode checks,
   * outbox tracking, and automatic provider fallback.
   */
  static async send(input: DispatchEmailInput): Promise<{
    success: boolean;
    deliveryId?: string;
    provider?: EmailProviderId;
    providerMessageId?: string | null;
    error?: string;
  }> {
    const normalizedEmail = input.recipientEmail.trim().toLowerCase();

    // 1. Safe Mode Filter: Block non-allowlisted recipients in dev/staging
    if (!EMAIL_CONFIG.isRecipientAllowedInSafeMode(normalizedEmail)) {
      console.info(
        `[EmailOrchestrator] SAFE_MODE active: Suppressing send to ${normalizedEmail}. Only allowlisted addresses are permitted.`
      );
      return { success: true, error: 'SUPPRESSED_BY_SAFE_MODE' };
    }

    // 2. Global Suppression Check
    const suppression = await SuppressionService.isSuppressed(normalizedEmail);
    if (suppression.suppressed) {
      console.warn(
        `[EmailOrchestrator] Recipient ${normalizedEmail} is suppressed (Reason: ${suppression.reason}).`
      );
      return {
        success: false,
        error: `RECIPIENT_SUPPRESSED: ${suppression.reason}`,
      };
    }

    // 3. Marketing Consent Check
    if (input.category === 'marketing_campaign') {
      const hasConsent =
        await SuppressionService.hasMarketingConsent(normalizedEmail);
      if (!hasConsent) {
        console.warn(
          `[EmailOrchestrator] No marketing consent for ${normalizedEmail}.`
        );
        return { success: false, error: 'NO_MARKETING_CONSENT' };
      }
    }

    // 4. Render Template or Direct Content
    const variables = input.variables || {};
    const templateSource = input.html || input.templateFileName || '';
    const { html, text } = TemplateRenderer.render(templateSource, variables);

    // 5. Check/Insert Outbox Delivery in Supabase for Idempotency
    let deliveryId = crypto.randomUUID();
    let isExisting = false;
    try {
      const supabase = await getSupabaseAdmin();
      const { data: inserted, error: insertError } = await supabase
        .from('email_deliveries')
        .insert({
          id: deliveryId,
          event_key: input.eventKey,
          event_type: input.eventType,
          category: input.category,
          recipient_email: normalizedEmail,
          recipient_name: input.recipientName || null,
          subject: input.subject,
          template_key: input.templateFileName,
          template_variables: input.variables,
          status: 'queued',
          priority: input.priority || 50,
        })
        .select('id, status, selected_provider, provider_message_id')
        .single();

      if (insertError) {
        // If unique violation on event_key, retrieve existing
        if (insertError.code === '23505') {
          const { data: existing } = await supabase
            .from('email_deliveries')
            .select('id, status, selected_provider, provider_message_id')
            .eq('event_key', input.eventKey)
            .single();

          if (existing) {
            deliveryId = existing.id;
            isExisting = true;
            // If already accepted or delivered, return idempotent success
            if (
              ['accepted', 'delivered', 'sending'].includes(existing.status)
            ) {
              return {
                success: true,
                deliveryId: existing.id,
                provider: existing.selected_provider as EmailProviderId,
                providerMessageId: existing.provider_message_id,
              };
            }
          }
        }
      } else if (inserted) {
        deliveryId = inserted.id;
      }
    } catch (e: any) {
      console.warn(
        '[EmailOrchestrator] Outbox insert bypassed (staging/dev mode):',
        e.message
      );
    }

    // 6. Provider Resolution & Quota Reservation
    const routingDecision = await RouterService.selectProviderWithQuota(
      input.category
    );
    if (!routingDecision) {
      await this.updateDeliveryStatus(
        deliveryId,
        'failed',
        null,
        'QUOTA_EXHAUSTED',
        'No provider quota available'
      );
      return { success: false, deliveryId, error: 'QUOTA_EXHAUSTED' };
    }

    const { provider } = routingDecision;
    const adapter = getAdapter(provider);

    const message: NormalizedEmailMessage = {
      deliveryId,
      idempotencyKey: input.eventKey,
      category: input.category,
      from: {
        email: EMAIL_CONFIG.defaultSenderEmail,
        name: EMAIL_CONFIG.defaultSenderName,
      },
      to: {
        email: normalizedEmail,
        name: input.recipientName,
      },
      subject: input.subject,
      html,
      text,
      customCampaign: input.customCampaign,
    };

    // 7. Dispatch via Selected Provider
    const startTime = Date.now();
    let result: ProviderSendResult;
    try {
      result = await adapter.sendTransactional(message);
    } catch (err: any) {
      result = {
        provider,
        accepted: false,
        providerMessageId: null,
        customId: deliveryId,
        error: {
          code: 'UNHANDLED_EXCEPTION',
          message: err.message || 'Unknown adapter exception',
          retryable: true,
        },
      };
    }
    const durationMs = Date.now() - startTime;

    // 8. Commit or Fallback
    if (result.accepted) {
      await QuotaService.commitQuota(provider, 1);
      await this.recordAttempt(
        deliveryId,
        provider,
        1,
        'accepted',
        200,
        result.providerMessageId,
        result.providerMessageUuid,
        null,
        null,
        durationMs
      );
      await this.updateDeliveryStatus(
        deliveryId,
        'accepted',
        provider,
        null,
        null,
        result.providerMessageId,
        result.providerMessageUuid
      );
      return {
        success: true,
        deliveryId,
        provider,
        providerMessageId: result.providerMessageId,
      };
    }

    // 9. Failure Handling & Atomic Fallback Attempt
    await QuotaService.releaseQuota(provider, 1);
    await this.recordAttempt(
      deliveryId,
      provider,
      1,
      'rejected',
      null,
      null,
      null,
      result.error?.code || 'SEND_ERROR',
      result.error?.message || 'Send failed',
      durationMs
    );

    // If retryable and fallback provider exists, attempt fallback
    const policy = await RouterService.getPolicy(input.category);
    if (
      result.error?.retryable &&
      policy.fallbackEnabled &&
      policy.fallbackProvider &&
      policy.fallbackProvider !== provider
    ) {
      console.info(
        `[EmailOrchestrator] Falling back from ${provider} to ${policy.fallbackProvider} for delivery ${deliveryId}...`
      );
      const fallbackReserved = await QuotaService.reserveQuota(
        policy.fallbackProvider,
        1
      );
      if (fallbackReserved) {
        const fallbackAdapter = getAdapter(policy.fallbackProvider);
        const fbStartTime = Date.now();
        const fbResult = await fallbackAdapter.sendTransactional(message);
        const fbDuration = Date.now() - fbStartTime;

        if (fbResult.accepted) {
          await QuotaService.commitQuota(policy.fallbackProvider, 1);
          await this.recordAttempt(
            deliveryId,
            policy.fallbackProvider,
            2,
            'accepted',
            200,
            fbResult.providerMessageId,
            fbResult.providerMessageUuid,
            null,
            null,
            fbDuration
          );
          await this.updateDeliveryStatus(
            deliveryId,
            'accepted',
            policy.fallbackProvider,
            null,
            null,
            fbResult.providerMessageId,
            fbResult.providerMessageUuid
          );
          return {
            success: true,
            deliveryId,
            provider: policy.fallbackProvider,
            providerMessageId: fbResult.providerMessageId,
          };
        } else {
          await QuotaService.releaseQuota(policy.fallbackProvider, 1);
          await this.recordAttempt(
            deliveryId,
            policy.fallbackProvider,
            2,
            'rejected',
            null,
            null,
            null,
            fbResult.error?.code || 'FALLBACK_SEND_ERROR',
            fbResult.error?.message || 'Fallback send failed',
            fbDuration
          );
        }
      }
    }

    await this.updateDeliveryStatus(
      deliveryId,
      'failed',
      provider,
      result.error?.code,
      result.error?.message
    );
    return {
      success: false,
      deliveryId,
      provider,
      error: result.error?.message || 'Email delivery failed across providers',
    };
  }

  private static async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    provider: EmailProviderId | null,
    errorCode?: string | null,
    errorMessage?: string | null,
    providerMessageId?: string | null,
    providerMessageUuid?: string | null
  ) {
    try {
      const supabase = await getSupabaseAdmin();
      await supabase
        .from('email_deliveries')
        .update({
          status,
          selected_provider: provider,
          provider_message_id: providerMessageId || null,
          provider_message_uuid: providerMessageUuid || null,
          last_error_code: errorCode || null,
          last_error_message: errorMessage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);
    } catch {}
  }

  private static async recordAttempt(
    deliveryId: string,
    provider: EmailProviderId,
    attemptNumber: number,
    status: string,
    httpStatus: number | null,
    providerMessageId: string | null,
    providerMessageUuid: string | null,
    errorCode: string | null,
    errorMessage: string | null,
    durationMs: number
  ) {
    try {
      const supabase = await getSupabaseAdmin();
      await supabase.from('email_delivery_attempts').insert({
        delivery_id: deliveryId,
        provider,
        attempt_number: attemptNumber,
        custom_id: deliveryId,
        status,
        http_status: httpStatus,
        provider_message_id: providerMessageId,
        provider_message_uuid: providerMessageUuid,
        error_code: errorCode,
        error_message: errorMessage,
        duration_ms: durationMs,
      });
    } catch {}
  }
}
