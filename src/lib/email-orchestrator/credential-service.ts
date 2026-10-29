import { EmailProviderId } from '@/types/email-orchestrator';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import {
  decryptApiKey,
  encryptApiKey,
  isEncrypted,
} from '@/lib/ai/credential-encryption';

export interface DecryptedProviderCredentials {
  resend?: {
    apiKey: string;
    senderEmail?: string;
    senderName?: string;
  };
  mailjet?: {
    publicKey: string;
    secretKey: string;
    senderEmail?: string;
    senderName?: string;
  };
  brevo?: {
    apiKey: string;
    senderEmail?: string;
    senderName?: string;
  };
}

export interface MaskedProviderStatus {
  provider: EmailProviderId;
  configured: boolean;
  source: 'database' | 'environment' | 'missing';
  enabled: boolean;
  senderEmail: string;
  senderName: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck?: string;
  lastError?: string;
}

export class CredentialService {
  /**
   * Retrieves active credentials for a provider with environment fallback.
   * Never exposed to frontend/client components.
   */
  static async getCredentials(
    provider: EmailProviderId
  ): Promise<
    DecryptedProviderCredentials[keyof DecryptedProviderCredentials] | null
  > {
    try {
      const supabase = await getSupabaseAdmin();
      const { data: dbConfig } = await supabase
        .from('email_provider_configs')
        .select('*')
        .eq('provider', provider)
        .single();

      if (
        dbConfig?.encrypted_credentials &&
        isEncrypted(dbConfig.encrypted_credentials)
      ) {
        try {
          const decryptedJson = decryptApiKey(dbConfig.encrypted_credentials);
          if (decryptedJson) {
            const parsed = JSON.parse(decryptedJson);
            return {
              ...parsed,
              senderEmail: dbConfig.sender_email,
              senderName: dbConfig.sender_name,
            };
          }
        } catch (e) {
          console.warn(
            `[CredentialService] Failed to decrypt DB credentials for ${provider}, falling back to env.`
          );
        }
      }
    } catch (dbErr) {
      // In offline/staging without migrations applied, gracefully fallback to env
    }

    // Fallback to Environment Variables
    if (provider === 'resend') {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return null;
      return {
        apiKey,
        senderEmail:
          process.env.RESEND_SENDER_EMAIL || 'notifications@ruhvi.in',
        senderName: 'Ruhvi',
      };
    }

    if (provider === 'mailjet') {
      const publicKey = process.env.MAILJET_API_KEY_PUBLIC;
      const secretKey = process.env.MAILJET_API_KEY_SECRET;
      if (!publicKey || !secretKey) return null;
      return {
        publicKey,
        secretKey,
        senderEmail:
          process.env.MAILJET_SENDER_EMAIL || 'notifications@ruhvi.in',
        senderName: process.env.MAILJET_SENDER_NAME || 'Ruhvi',
      };
    }

    if (provider === 'brevo' || provider === 'brevo_legacy') {
      const rawKey = process.env.BREVO_API_KEY || process.env.BREVO_MCP_API_KEY;
      if (!rawKey) return null;
      let apiKey = rawKey.trim();
      if (apiKey.startsWith('eyJ')) {
        try {
          const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          if (parsed.api_key) apiKey = parsed.api_key;
        } catch {}
      }
      return {
        apiKey,
        senderEmail: process.env.BREVO_SENDER_EMAIL || 'notifications@ruhvi.in',
        senderName: process.env.BREVO_SENDER_NAME || 'Ruhvi Staff',
      };
    }

    return null;
  }

  /**
   * Saves encrypted credentials to the database.
   */
  static async saveCredentials(
    provider: EmailProviderId,
    credentials: Record<string, any>,
    senderEmail?: string,
    senderName?: string
  ): Promise<boolean> {
    const supabase = await getSupabaseAdmin();
    const encrypted = encryptApiKey(JSON.stringify(credentials));

    const { error } = await supabase.from('email_provider_configs').upsert(
      {
        provider,
        enabled: true,
        encrypted_credentials: encrypted,
        sender_email: senderEmail || 'notifications@ruhvi.in',
        sender_name: senderName || 'Ruhvi',
        health_status: 'healthy',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider' }
    );

    if (error) {
      console.error(
        `[CredentialService] Failed to save credentials for ${provider}:`,
        error
      );
      throw new Error(
        `Failed to save provider configuration: ${error.message}`
      );
    }

    return true;
  }

  /**
   * Returns sanitized, masked status for Admin UI inspection.
   */
  static async getMaskedStatus(
    provider: EmailProviderId
  ): Promise<MaskedProviderStatus> {
    const creds = await CredentialService.getCredentials(provider);
    let dbConfig: any = null;
    try {
      const supabase = await getSupabaseAdmin();
      const { data } = await supabase
        .from('email_provider_configs')
        .select('*')
        .eq('provider', provider)
        .single();
      dbConfig = data;
    } catch {}

    const isDb = !!dbConfig?.encrypted_credentials;
    const isEnv = !isDb && !!creds;

    return {
      provider,
      configured: !!creds,
      source: isDb ? 'database' : isEnv ? 'environment' : 'missing',
      enabled: dbConfig ? dbConfig.enabled : !!creds,
      senderEmail:
        dbConfig?.sender_email ||
        (creds as any)?.senderEmail ||
        'notifications@ruhvi.in',
      senderName:
        dbConfig?.sender_name || (creds as any)?.senderName || 'Ruhvi',
      healthStatus:
        dbConfig?.health_status || (creds ? 'healthy' : 'unhealthy'),
      lastHealthCheck: dbConfig?.last_health_check_at,
      lastError: dbConfig?.last_error,
    };
  }
}
