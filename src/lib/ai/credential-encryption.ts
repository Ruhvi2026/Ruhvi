import crypto from 'crypto';

const PREFIX = 'enc:v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SCRYPT_SALT = 'ruhvi-ai-credentials-v1';

let cachedKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey;
  const passphrase = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!passphrase) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY must be set to encrypt/decrypt AI credentials'
    );
  }
  cachedKey = crypto.scryptSync(passphrase, SCRYPT_SALT, KEY_BYTES);
  return cachedKey;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
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
}

export function decryptApiKey(stored: string): string {
  if (!stored) return '';
  if (!isEncrypted(stored)) return stored;
  const body = stored.slice(PREFIX.length + 1);
  const parts = body.split(':');
  if (parts.length < 3) return '';
  const [ivB64, tagB64, ...ctParts] = parts;
  if (!ivB64 || !tagB64 || ctParts.length === 0) return '';
  const ctB64 = ctParts.join(':');
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getMasterKey(),
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    return '';
  }
}