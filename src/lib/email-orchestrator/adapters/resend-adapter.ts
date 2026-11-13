import { Resend } from 'resend';
import {
  EmailProviderAdapter,
  NormalizedEmailMessage,
  ProviderSendResult,
  ProviderUsageSnapshot,
} from '@/types/email-orchestrator';
import { CredentialService } from '../credential-service';
import { EMAIL_CONFIG } from '../config';

export class ResendAdapter implements EmailProviderAdapter {
  readonly id = 'resend' as const;

  private async getClient(): Promise<{
    client: Resend;
    senderEmail: string;
    senderName: string;
  }> {
    const creds = await CredentialService.getCredentials('resend');
    if (!creds || !('apiKey' in creds) || !creds.apiKey) {
      throw new Error('Resend API key is not configured.');
    }
    return {
      client: new Resend(creds.apiKey),
      senderEmail: creds.senderEmail || EMAIL_CONFIG.defaultSenderEmail,
      senderName: creds.senderName || EMAIL_CONFIG.defaultSenderName,
    };
  }

  async validateCredentials(): Promise<{ valid: boolean; detail?: string }> {
    try {
      const { client } = await this.getClient();
      // Calling domains.list() verifies the API token is valid
      const result = await client.domains.list();
      if (result.error) {
        return { valid: false, detail: result.error.message };
      }
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        detail: error.message || 'Failed to authenticate with Resend',
      };
    }
  }

  async checkSenderIdentity(
    sender: string
  ): Promise<{ verified: boolean; detail?: string }> {
    try {
      const { client } = await this.getClient();
      const domainName = sender.split('@')[1]?.toLowerCase().trim();
      if (!domainName)
        return { verified: false, detail: 'Invalid sender domain' };

      const domains = await client.domains.list();
      if (domains.error || !domains.data?.data) {
        return {
          verified: false,
          detail: domains.error?.message || 'Could not list domains',
        };
      }

      const match = domains.data.data.find(
        (d: any) => d.name.toLowerCase() === domainName
      );
      if (!match) {
        return {
          verified: false,
          detail: `Domain ${domainName} is not registered in Resend`,
        };
      }
      if (match.status !== 'verified') {
        return {
          verified: false,
          detail: `Domain ${domainName} status is ${match.status}`,
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
      const { client, senderEmail, senderName } = await this.getClient();
      const fromAddress = message.from.email || senderEmail;
      const fromName = message.from.name || senderName;
      const fromFormatted = `${fromName} <${fromAddress}>`;

      const emailPayload: any = {
        from: fromFormatted,
        to: message.to.name
          ? `${message.to.name} <${message.to.email}>`
          : message.to.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        headers: {
          'Idempotency-Key': message.idempotencyKey,
          ...(message.headers || {}),
        },
        tags: message.tags
          ? Object.entries(message.tags).map(([name, value]) => ({
              name,
              value: String(value),
            }))
          : undefined,
      };

      if (message.cc?.length) {
        emailPayload.cc = message.cc;
      }
      if (message.bcc?.length) {
        emailPayload.bcc = message.bcc;
      }
      if (message.attachments?.length) {
        emailPayload.attachments = message.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType,
        }));
      }

      const response = await client.emails.send(emailPayload);

      if (response.error) {
        const isRetryable =
          response.error.name === 'rate_limit_exceeded' ||
          response.error.name === 'internal_server_error' ||
          /timeout|connection|5\d\d/i.test(response.error.message);

        return {
          provider: 'resend',
          accepted: false,
          providerMessageId: null,
          customId: message.deliveryId,
          error: {
            code: response.error.name || 'RESEND_API_ERROR',
            message: response.error.message,
            retryable: isRetryable,
          },
        };
      }

      return {
        provider: 'resend',
        accepted: true,
        providerMessageId: response.data?.id || null,
        customId: message.deliveryId,
        acceptedAt: new Date().toISOString(),
        rawStatus: 'sent',
      };
    } catch (error: any) {
      const isRetryable = /ECONNRESET|ETIMEDOUT|timeout|network|5\d\d/i.test(
        error.message || ''
      );
      return {
        provider: 'resend',
        accepted: false,
        providerMessageId: null,
        customId: message.deliveryId,
        error: {
          code: error.code || 'RESEND_TRANSPORT_ERROR',
          message:
            error.message || 'Unknown error occurred while contacting Resend',
          retryable: isRetryable,
        },
      };
    }
  }

  async getUsage(): Promise<ProviderUsageSnapshot | null> {
    return {
      provider: 'resend',
      dailyUsed: 0,
      dailyLimit: EMAIL_CONFIG.providerDefaults.resend.dailyLimit,
      monthlyUsed: 0,
      monthlyLimit: EMAIL_CONFIG.providerDefaults.resend.monthlyLimit,
      timestamp: new Date().toISOString(),
    };
  }
}
