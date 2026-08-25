import crypto from 'crypto';

const PREFIX = 'enc:v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SCRYPT_SALT = 'ruhvi-ai-credentials-v1';

let cachedKey: Buffer | null = null;
let keyMissWarned = false;

/**
 * Get the master encryption key derived from CREDENTIAL_ENCRYPTION_KEY.
 * Returns null (instead of throwing) when the env var is missing,
 * so callers can gracefully fall back to plaintext keys.
 */
function getMasterKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const passphrase = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!passphrase) {
    if (!keyMissWarned) {
      console.warn(
        '[AI Credentials] CREDENTIAL_ENCRYPTION_KEY is not set. ' +
          'Encrypted credentials cannot be decrypted. ' +
          'Plaintext credentials will be used as-is.'
      );
      keyMissWarned = true;
    }
    return null;
  }
  try {
    cachedKey = crypto.scryptSync(passphrase, SCRYPT_SALT, KEY_BYTES);
    return cachedKey;
  } catch (error) {
    console.warn(
      '[AI Credentials] Failed to generate master key from passphrase.'
    );
    return null;
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith(PREFIX);
}

export function encryptApiKey(plaintext: string): string {
  if (typeof plaintext !== 'string') return '';
  const key = getMasterKey();
  if (!key) {
    // Without an encryption key, store plaintext (legacy behavior).
    // Log a warning so admins know encryption is not active.
    console.warn(
      '[AI Credentials] Storing API key in plaintext — set CREDENTIAL_ENCRYPTION_KEY to enable encryption.'
    );
    return plaintext;
  }
  try {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      PREFIX,
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  } catch (error) {
    console.error('[AI Credentials] Encryption failed:', error);
    return plaintext;
  }
}

export function decryptApiKey(stored: string): string {
  if (!stored || typeof stored !== 'string') return '';
  // If value is not encrypted, return as-is (legacy plaintext key)
  if (!isEncrypted(stored)) return stored;

  const key = getMasterKey();
  if (!key) {
    // Cannot decrypt without the master key — return empty and log
    console.warn(
      '[AI Credentials] Cannot decrypt credential — CREDENTIAL_ENCRYPTION_KEY not set.'
    );
    return '';
  }

  const body = stored.slice(PREFIX.length + 1);
  const parts = body.split(':');
  if (parts.length < 3) return '';
  const [ivB64, tagB64, ...ctParts] = parts;
  if (!ivB64 || !tagB64 || ctParts.length === 0) return '';
  const ctB64 = ctParts.join(':');
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    console.warn(
      '[AI Credentials] Failed to decrypt credential — key may be incorrect.'
    );
    return '';
  }
}
