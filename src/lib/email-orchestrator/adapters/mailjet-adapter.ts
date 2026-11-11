import {
  EmailProviderAdapter,
  NormalizedEmailMessage,
  ProviderSendResult,
  ProviderUsageSnapshot,
} from '@/types/email-orchestrator';
import { CredentialService } from '../credential-service';
import { EMAIL_CONFIG } from '../config';

export class MailjetAdapter implements EmailProviderAdapter {
  readonly id = 'mailjet' as const;

  private async getCredentials(): Promise<{
    publicKey: string;
    secretKey: string;
    senderEmail: string;
    senderName: string;
    authHeader: string;
  }> {
    const creds = await CredentialService.getCredentials('mailjet');
    if (
      !creds ||
      !('publicKey' in creds) ||
      !creds.publicKey ||
      !creds.secretKey
    ) {
      throw new Error('Mailjet API credentials are not configured.');
    }
    const authHeader = `Basic ${Buffer.from(`${creds.publicKey}:${creds.secretKey}`).toString('base64')}`;
    return {
      publicKey: creds.publicKey,
      secretKey: creds.secretKey,
      senderEmail: creds.senderEmail || EMAIL_CONFIG.defaultSenderEmail,
      senderName: creds.senderName || EMAIL_CONFIG.defaultSenderName,
      authHeader,
    };
  }

  async validateCredentials(): Promise<{ valid: boolean; detail?: string }> {
    try {
      const { authHeader } = await this.getCredentials();
      // Calling GET /v3/REST/user validates the API credentials
      const res = await fetch('https://api.mailjet.com/v3/REST/user', {
        headers: { Authorization: authHeader },
      });
      if (!res.ok) {
        return {
          valid: false,
          detail: `Mailjet authentication failed with HTTP ${res.status}`,
        };
      }
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        detail: error.message || 'Failed to connect to Mailjet',
      };
    }
  }

  async checkSenderIdentity(
    sender: string
  ): Promise<{ verified: boolean; detail?: string }> {
    try {
      const { authHeader } = await this.getCredentials();
      const res = await fetch(
        `https://api.mailjet.com/v3/REST/sender?Email=${encodeURIComponent(sender)}`,
        {
          headers: { Authorization: authHeader },
        }
      );
      if (!res.ok) {
        return {
          verified: false,
          detail: `Mailjet check failed with HTTP ${res.status}`,
        };
      }
      const data = await res.json();
      const senderRecord = data.Data?.find(
        (s: any) => s.Email.toLowerCase() === sender.toLowerCase()
      );
      if (!senderRecord) {
        return {
          verified: false,
          detail: `Sender email ${sender} is not registered in Mailjet.`,
        };
      }
      if (senderRecord.Status !== 'Active') {
        return {
          verified: false,
          detail: `Sender email ${sender} status is ${senderRecord.Status}. Must be Active.`,
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
    try {
      const { authHeader, senderEmail, senderName } =
        await this.getCredentials();
      const fromAddress = message.from.email || senderEmail;
      const fromName = message.from.name || senderName;

      const payload = {
        Messages: [
          {
            From: {
              Email: fromAddress,
              Name: fromName,
            },
            To: [
              {
                Email: message.to.email,
                Name: message.to.name || undefined,
              },
            ],
            Subject: message.subject,
            HTMLPart: message.html,
            TextPart: message.text || undefined,
            CustomID: message.deliveryId,
            ...(message.customCampaign
              ? { CustomCampaign: message.customCampaign }
              : {}),
            ...(message.replyTo ? { ReplyTo: { Email: message.replyTo } } : {}),
            ...(message.headers ? { Headers: message.headers } : {}),
          },
        ],
      };

      const res = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // HTTP 401 (blocked/unauthorized), 402 (payment/quota), 403 (forbidden), 429 (rate limit), and 5xx are provider outages that MUST trigger fallback
        const isRetryable =
          res.status === 401 ||
          res.status === 402 ||
          res.status === 403 ||
          res.status === 429 ||
          res.status >= 500;
        const errorDetail =
          data?.ErrorMessage || data?.message || `HTTP ${res.status}`;
        return {
          provider: 'mailjet',
          accepted: false,
          providerMessageId: null,
          customId: message.deliveryId,
          error: {
            code: `MAILJET_HTTP_${res.status}`,
            message: errorDetail,
            retryable: isRetryable,
          },
        };
      }

      const messageResult = data?.Messages?.[0];
      if (messageResult?.Status === 'success') {
        const toResult = messageResult.To?.[0];
        const messageId = toResult?.MessageID
          ? String(toResult.MessageID)
          : null;
        const messageUuid = toResult?.MessageUUID || null;

        return {
          provider: 'mailjet',
          accepted: true,
          providerMessageId: messageId,
          providerMessageUuid: messageUuid,
          customId: message.deliveryId,
          acceptedAt: new Date().toISOString(),
          rawStatus: messageResult.Status,
        };
      }

      // Handle message-level rejections (e.g. invalid recipient or policy error)
      const errorMsg =
        messageResult?.Errors?.[0]?.ErrorMessage ||
        'Message rejected by Mailjet';
      const errorCode =
        messageResult?.Errors?.[0]?.ErrorCode || 'MAILJET_SEND_ERROR';

      return {
        provider: 'mailjet',
        accepted: false,
        providerMessageId: null,
        customId: message.deliveryId,
        error: {
          code: errorCode,
          message: errorMsg,
          retryable: false,
        },
      };
    } catch (error: any) {
      const isRetryable =
        /ECONNRESET|ETIMEDOUT|timeout|network|fetch failed/i.test(
          error.message || ''
        );
      return {
        provider: 'mailjet',
        accepted: false,
        providerMessageId: null,
        customId: message.deliveryId,
        error: {
          code: error.code || 'MAILJET_NETWORK_ERROR',
          message:
            error.message || 'Unknown network error communicating with Mailjet',
          retryable: isRetryable,
        },
      };
    }
  }

  async reconcile(
    customId: string
  ): Promise<'accepted' | 'not_found' | 'unknown'> {
    try {
      const { authHeader } = await this.getCredentials();
      const res = await fetch(
        `https://api.mailjet.com/v3/REST/message?CustomID=${encodeURIComponent(customId)}`,
        {
          headers: { Authorization: authHeader },
        }
      );
      if (!res.ok) return 'unknown';
      const data = await res.json();
      if (data.Count > 0 && data.Data?.length > 0) {
        return 'accepted';
      }
      return 'not_found';
    } catch {
      return 'unknown';
    }
  }

  async getUsage(): Promise<ProviderUsageSnapshot | null> {
    return {
      provider: 'mailjet',
      dailyUsed: 0,
      dailyLimit: EMAIL_CONFIG.providerDefaults.mailjet.dailyLimit,
      monthlyUsed: 0,
      monthlyLimit: EMAIL_CONFIG.providerDefaults.mailjet.monthlyLimit,
      timestamp: new Date().toISOString(),
    };
  }
}
