/**
 * AI Provider API Key Resolution & Masking Utility
 * Centralizes secure API key lookup from DB and environment variables,
 * masking, and prevents accidental resets or browser autofill corruptions.
 */

export const ENV_KEY_MAP: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  custom: 'CUSTOM_GATEWAY_API_KEY',
};

/**
 * Checks if a key string is a masked placeholder or sentinel value
 */
export function isMaskedPlaceholder(key: string | null | undefined): boolean {
  if (!key) return true;
  const trimmed = key.trim();
  if (trimmed === '') return true;
  if (trimmed === '__STORED_KEY__' || trimmed === '__UNCHANGED__') return true;
  if (trimmed === '********') return true;
  if (trimmed.includes('••••') || trimmed.includes('****')) return true;
  return false;
}

/**
 * Gets the environment variable API key for a given provider type
 */
export function getEnvApiKey(providerType: string): string {
  const envVar = ENV_KEY_MAP[providerType];
  if (!envVar) return '';
  return process.env[envVar]?.trim() || '';
}

/**
 * Formats a key for safe display (e.g. AIza••••••••WspH)
 */
export function maskApiKey(key: string | null | undefined): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••••••';
  }
  return `${trimmed.substring(0, 4)}••••••••••••${trimmed.substring(trimmed.length - 4)}`;
}

/**
 * Resolves the effective API key for a provider, prioritizing:
 * 1. An explicitly provided new raw key (not masked/placeholder)
 * 2. Stored key in database
 * 3. Server environment variable (e.g. GEMINI_API_KEY)
 */
export function resolveEffectiveApiKey(
  providerType: string,
  providedKey?: string | null,
  dbKey?: string | null
): {
  apiKey: string;
  source: 'direct' | 'database' | 'environment' | 'none';
  hasKey: boolean;
  isEnvKey: boolean;
  maskedKey: string;
} {
  // 1. Direct explicit key from user input
  if (
    providedKey &&
    !isMaskedPlaceholder(providedKey) &&
    providedKey !== '__CLEAR_KEY__'
  ) {
    const cleanKey = providedKey.trim();
    return {
      apiKey: cleanKey,
      source: 'direct',
      hasKey: true,
      isEnvKey: false,
      maskedKey: maskApiKey(cleanKey),
    };
  }

  // If explicitly cleared by user, do not fallback to dbKey
  if (providedKey === '__CLEAR_KEY__') {
    const envKey = getEnvApiKey(providerType);
    if (envKey) {
      return {
        apiKey: envKey,
        source: 'environment',
        hasKey: true,
        isEnvKey: true,
        maskedKey: maskApiKey(envKey),
      };
    }
    return {
      apiKey: '',
      source: 'none',
      hasKey: false,
      isEnvKey: false,
      maskedKey: '',
    };
  }

  // 2. Stored database key
  if (dbKey && !isMaskedPlaceholder(dbKey)) {
    const cleanKey = dbKey.trim();
    return {
      apiKey: cleanKey,
      source: 'database',
      hasKey: true,
      isEnvKey: false,
      maskedKey: maskApiKey(cleanKey),
    };
  }

  // 3. Environment variable fallback
  const envKey = getEnvApiKey(providerType);
  if (envKey) {
    return {
      apiKey: envKey,
      source: 'environment',
      hasKey: true,
      isEnvKey: true,
      maskedKey: maskApiKey(envKey),
    };
  }

  return {
    apiKey: '',
    source: 'none',
    hasKey: false,
    isEnvKey: false,
    maskedKey: '',
  };
}

/**
 * Fetch the raw API key for a specific credential from the database.
 * This is server-side only — used by the routing engine.
 *
 * @param credentialId - UUID of the ai_provider_credentials row
 * @param supabaseAdmin - Pre-initialized Supabase admin client
 * @returns The raw API key, or empty string if not found
 */
export async function getCredentialKeyFromDB(
  credentialId: string,
  supabaseAdmin: any
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_provider_credentials')
      .select('encrypted_key')
      .eq('id', credentialId)
      .single();

    if (error || !data) return '';
    // encrypted_key is stored AES-256-GCM encrypted at rest. This helper is
    // shared with client bundles and cannot import the Node crypto module, so
    // server-side callers should use getCredentialKey (lib/ai/credentials.ts),
    // which decrypts transparently. See lib/ai/credential-encryption.ts.
    return data.encrypted_key || '';
  } catch {
    return '';
  }
}
