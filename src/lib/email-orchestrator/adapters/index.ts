import {
  EmailProviderAdapter,
  EmailProviderId,
} from '@/types/email-orchestrator';
import { ResendAdapter } from './resend-adapter';
import { MailjetAdapter } from './mailjet-adapter';
import { BrevoAdapter } from './brevo-adapter';

const adapters: Partial<Record<EmailProviderId, EmailProviderAdapter>> = {
  resend: new ResendAdapter(),
  mailjet: new MailjetAdapter(),
  brevo: new BrevoAdapter(),
  brevo_legacy: new BrevoAdapter(),
};

export function getAdapter(provider: EmailProviderId): EmailProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Unsupported email provider: ${provider}`);
  }
  return adapter;
}
