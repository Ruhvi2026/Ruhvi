import {
  EmailProviderAdapter,
  NormalizedEmailMessage,
  ProviderSendResult,
  ProviderUsageSnapshot,
} from '@/types/email-orchestrator';
import { CredentialService } from '../credential-service';
import { EMAIL_CONFIG } from '../config';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_ACCOUNT_URL = 'https://api.brevo.com/v3/account';

export class BrevoAdapter implements EmailProviderAdapter {
  readonly id = 'brevo' as const;

  private async getClientCredentials(): Promise<{
    apiKey: string;
    senderEmail: string;
    senderName: string;
  }> {
    const creds = await CredentialService.getCredentials('brevo');
    if (!creds || !('apiKey' in creds) || !creds.apiKey) {
      throw new Error('Brevo API key is not configured.');
    }
    return {
      apiKey: creds.apiKey,
      senderEmail: creds.senderEmail || 'notifications@ruhvi.in',
      senderName: creds.senderName || 'Ruhvi Staff',
    };
  }

  async validateCredentials(): Promise<{ valid: boolean; detail?: string }> {
    try {
      const { apiKey } = await this.getClientCredentials();
      const res = await fetch(BREVO_ACCOUNT_URL, {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          valid: false,
          detail: `Brevo credentials invalid (${res.status}): ${text}`,
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        detail: error.message || 'Failed to authenticate with Brevo',
      };
    }
  }

  async checkSenderIdentity(
    sender: string
  ): Promise<{ verified: boolean; detail?: string }> {
    try {
      const { apiKey } = await this.getClientCredentials();
      const res = await fetch('https://api.brevo.com/v3/senders', {
        headers: {
          'api-key': apiKey,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        return {
          verified: false,
          detail: `Failed to fetch senders (${res.status})`,
        };
      }

      const data = await res.json();
      const senderNormalized = sender.toLowerCase().trim();
      const match = data.senders?.find(
        (s: any) =>
          s.email?.toLowerCase().trim() === senderNormalized && s.active
      );

      if (!match) {
        return {
          verified: false,
          detail: `Sender ${sender} not active or verified in Brevo`,
        };
      }

      return { verified: true };
    } catch (error: any) {
      return { verified: false, detail: error.message };
    }
  }

  async sendTransactional(
    message: NormalizedEmailMessage
  ): Promise<ProviderSendResult> {
    const customId = message.deliveryId;
    try {
      const { apiKey, senderEmail, senderName } =
        await this.getClientCredentials();
      const fromEmail = message.from.email || senderEmail;
      const fromName = message.from.name || senderName;

      const payload: Record<string, any> = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: message.to.email, name: message.to.name || undefined }],
        subject: message.subject,
        htmlContent: message.html,
        headers: {
          'X-Ruhvi-Delivery-Id': message.deliveryId,
          ...(message.headers || {}),
        },
        tags: [
          'internal_staff',
          ...(message.tags ? Object.values(message.tags) : []),
        ],
      };

      if (message.text) {
        payload.textContent = message.text;
      }
      if (message.replyTo) {
        payload.replyTo = { email: message.replyTo };
      }

      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = responseBody.message || response.statusText;
        const retryable = response.status >= 500 || response.status === 429;
        return {
          provider: 'brevo',
          accepted: false,
          providerMessageId: null,
          customId,
          error: {
            code: responseBody.code || `HTTP_${response.status}`,
            message: errorMsg,
            retryable,
          },
        };
      }

      return {
        provider: 'brevo',
        accepted: true,
        providerMessageId: responseBody.messageId || null,
        customId,
        acceptedAt: new Date().toISOString(),
        rawStatus: '201_CREATED',
      };
    } catch (error: any) {
      return {
        provider: 'brevo',
        accepted: false,
        providerMessageId: null,
        customId,
        error: {
          code: 'NETWORK_OR_CLIENT_ERROR',
          message: error.message || 'Unknown network error sending via Brevo',
          retryable: true,
        },
      };
    }
  }

  async getUsage(): Promise<ProviderUsageSnapshot | null> {
    const limits = EMAIL_CONFIG.providerDefaults.brevo;
    return {
      provider: 'brevo',
      dailyUsed: 0,
      dailyLimit: limits.dailyLimit,
      monthlyUsed: 0,
      monthlyLimit: limits.monthlyLimit,
      timestamp: new Date().toISOString(),
    };
  }
}
