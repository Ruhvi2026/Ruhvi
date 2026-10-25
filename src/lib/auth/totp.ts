import crypto from 'crypto';

// Standard RFC 4648 Base32 Alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer into a standard Base32 string (RFC 4648).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer.
 * Handles spaces, hyphens, and lowercase characters gracefully.
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      continue; // Skip invalid or padding characters
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates an RFC 6238 compliant TOTP secret (20 random bytes -> 32 base32 chars).
 */
export function generateTotpSecret(byteLength: number = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

/**
 * Generates the standard otpauth:// URL for QR code generation in authenticator apps.
 */
export function generateOtpAuthUri({
  secret,
  accountName,
  issuer = 'Ruhvi',
}: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a 6-digit TOTP code for a given secret at a specific counter.
 */
export function generateTotpCode(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code against a secret.
 * Allows +/- windowStep tolerance (default 1 step = +/- 30s) to handle phone clock drift.
 */
export function verifyTotpCode({
  secret,
  code,
  windowSteps = 1,
  timeStepSeconds = 30,
}: {
  secret: string;
  code: string;
  windowSteps?: number;
  timeStepSeconds?: number;
}): boolean {
  if (!secret || !code) return false;
  const cleanCode = code.trim().replace(/\D/g, '');
  if (cleanCode.length !== 6) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / timeStepSeconds);
  const candidateTarget = Buffer.from(cleanCode);

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const expected = generateTotpCode(secret, currentCounter + i);
    const expectedBuffer = Buffer.from(expected);

    if (
      candidateTarget.length === expectedBuffer.length &&
      crypto.timingSafeEqual(candidateTarget, expectedBuffer)
    ) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// AES-256-GCM Encryption for Storing TOTP Secrets at Rest
// =============================================================================

const TOTP_ENC_PREFIX = 'enc:totp:v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const SCRYPT_SALT = 'ruhvi-totp-encryption-salt-v1';

let cachedMasterKey: Buffer | null = null;

function getTotpMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;
  const passphrase =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.SUPABASE_JWT_SECRET ||
    'fallback-insecure-dev-key';

  cachedMasterKey = crypto.scryptSync(passphrase, SCRYPT_SALT, KEY_BYTES);
  return cachedMasterKey;
}

/**
 * Encrypts a TOTP secret using AES-256-GCM before saving to PostgreSQL.
 */
export function encryptTotpSecret(plaintextSecret: string): string {
  if (!plaintextSecret) return '';
  const key = getTotpMasterKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintextSecret, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    TOTP_ENC_PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypts a TOTP secret stored in PostgreSQL.
 */
export function decryptTotpSecret(encryptedString: string): string {
  if (!encryptedString) return '';
  if (!encryptedString.startsWith(TOTP_ENC_PREFIX)) {
    // If not encrypted (legacy or dev), return as-is
    return encryptedString;
  }

  const parts = encryptedString.split(':');
  // Format: ['enc', 'totp', 'v1', iv, tag, ciphertext]
  if (parts.length < 6) return '';

  const ivB64 = parts[3];
  const tagB64 = parts[4];
  const ctB64 = parts.slice(5).join(':');

  try {
    const key = getTotpMasterKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[TOTP] Failed to decrypt secret:', error);
    return '';
  }
}

// =============================================================================
// Emergency One-Time Backup Recovery Codes
// =============================================================================

/**
 * Hashes a backup recovery code for secure database storage.
 */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generates an array of single-use emergency backup codes (e.g. ['A84F-92C1', ...]).
 * Returns both plaintext codes (for the user to save) and hashed codes (to store in DB).
 */
export function generateBackupCodes(count: number = 8): {
  plaintextCodes: string[];
  hashedCodes: string[];
} {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate an 8-character hex code split into 4-4: 'A7B2-C9D4'
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    plaintextCodes.push(formatted);
    hashedCodes.push(hashBackupCode(formatted));
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Validates a user-entered backup code against their hashed codes in DB.
 * If valid, returns { valid: true, remainingHashedCodes } with that specific code consumed.
 */
export function verifyAndConsumeBackupCode(
  inputCode: string,
  storedHashedCodes: string[] | null | undefined
): { valid: boolean; remainingHashedCodes: string[] } {
  if (!inputCode || !storedHashedCodes || storedHashedCodes.length === 0) {
    return { valid: false, remainingHashedCodes: storedHashedCodes || [] };
  }

  const inputHash = hashBackupCode(inputCode);
  const index = storedHashedCodes.indexOf(inputHash);

  if (index !== -1) {
    // Code found! Remove it so it cannot be used again
    const remainingHashedCodes = [...storedHashedCodes];
    remainingHashedCodes.splice(index, 1);
    return { valid: true, remainingHashedCodes };
  }

  return { valid: false, remainingHashedCodes: storedHashedCodes };
}
