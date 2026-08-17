/**
 * AI Error Classifier
 *
 * Centralizes error classification for the AI routing engine.
 * Every error from any provider goes through this classifier to determine
 * the correct routing behavior — preventing unnecessary credential rotation
 * for errors caused by the request itself (not the credential).
 */

export type ErrorCategory =
  | 'RATE_LIMIT' // 429, RPM exceeded — rotate credential, with cooldown
  | 'QUOTA_EXHAUSTED' // Daily/monthly quota exhausted — longer cooldown
  | 'AUTH_INVALID' // 401/403, invalid/revoked API key — mark credential invalid
  | 'REQUEST_ERROR' // 400, bad request — do NOT rotate credential, fail immediately
  | 'MODEL_ERROR' // Model not found, deprecated, unsupported — trigger model fallback
  | 'SAFETY_ERROR' // Content blocked by safety filter — do NOT retry with other credentials
  | 'SERVER_ERROR' // 500/502/503 — limited retry with same credential, then next
  | 'TIMEOUT' // Network timeout, AbortError — retry/fallback
  | 'UNKNOWN'; // Fallback category

export interface ClassifiedError {
  category: ErrorCategory;
  shouldRotateCredential: boolean; // Move to next credential?
  shouldRotateProvider: boolean; // Move to next provider?
  shouldMarkInvalid: boolean; // Permanently disable this credential?
  shouldCooldown: boolean; // Temporarily disable with backoff?
  shouldRetry: boolean; // Retry same credential?
  maxRetries: number; // How many times to retry before moving on
  httpStatus?: number;
  providerErrorCode?: string;
}

/**
 * Rate-limit & quota patterns by provider
 */
const RATE_LIMIT_PATTERNS = [
  /rate.?limit/i,
  /too many requests/i,
  /requests per minute/i,
  /rpm.*exceeded/i,
  /resource.?exhausted/i,
  /quota.*exceeded/i,
  /quota.*exhausted/i,
  /tokens.*per.*minute/i,
  /tpm.*exceeded/i,
  /overloaded/i,
  /temporarily.*unavailable/i,
  /service.*temporarily/i,
  /try again.*later/i,
  /backoff/i,
  /RESOURCE_EXHAUSTED/,
];

const QUOTA_EXHAUSTED_PATTERNS = [
  /daily.*quota/i,
  /monthly.*quota/i,
  /quota.*exhausted/i,
  /exhausted.*quota/i,
  /billing.*quota/i,
  /insufficient.*quota/i,
  /account.*quota/i,
  /BILLING_HARD_LIMIT_EXCEEDED/,
  /DAILY_LIMIT_EXCEEDED/,
  /QUOTA_EXCEEDED/,
];

const AUTH_INVALID_PATTERNS = [
  /invalid.*api.?key/i,
  /api.?key.*invalid/i,
  /unauthorized/i,
  /authentication.*failed/i,
  /access.*denied/i,
  /forbidden/i,
  /revoked/i,
  /expired.*key/i,
  /key.*expired/i,
  /invalid.*credentials/i,
  /INVALID_API_KEY/,
  /API_KEY_INVALID/,
  /UNAUTHENTICATED/,
  /PERMISSION_DENIED/,
];

const MODEL_ERROR_PATTERNS = [
  /model.*not.*found/i,
  /model.*not.*exist/i,
  /no.*such.*model/i,
  /model.*deprecated/i,
  /deprecated.*model/i,
  /model.*unavailable/i,
  /model.*does.*not.*support/i,
  /model.*not.*support/i,
  /unknown.*model/i,
  /invalid.*model/i,
  /MODEL_NOT_FOUND/,
  /MODEL_DEPRECATED/,
  /MODEL_UNAVAILABLE/,
];

const SAFETY_ERROR_PATTERNS = [
  /safety.*filter/i,
  /content.*policy/i,
  /blocked.*by.*safety/i,
  /safety.*block/i,
  /harm.*category/i,
  /recitation/i,
  /inappropriate.*content/i,
  /content.*filtered/i,
  /SAFETY/,
];

const REQUEST_ERROR_PATTERNS = [
  /invalid.*request/i,
  /bad.*request/i,
  /malformed.*request/i,
  /invalid.*parameter/i,
  /unsupported.*configuration/i,
  /missing.*required/i,
  /field.*required/i,
  /schema.*validation/i,
  /INVALID_ARGUMENT/,
  /BAD_REQUEST/,
];

/**
 * Extract HTTP status code from error message or error object
 */
function extractHttpStatus(error: any): number | undefined {
  if (error?.status) return Number(error.status);
  if (error?.statusCode) return Number(error.statusCode);

  const msg = error?.message || '';
  const statusMatch = msg.match(/\b(4\d\d|5\d\d)\b/);
  return statusMatch ? Number(statusMatch[1]) : undefined;
}

/**
 * Extract provider-specific error code from error message
 */
function extractProviderErrorCode(error: any): string | undefined {
  const msg = error?.message || '';

  // Gemini error codes (ALL_CAPS_UNDERSCORE)
  const geminiMatch = msg.match(/\b([A-Z][A-Z_]{2,})\b/);
  if (geminiMatch) return geminiMatch[1];

  return undefined;
}

/**
 * Classify an error from any AI provider into a structured category
 * that the routing engine can act upon.
 */
export function classifyError(
  error: any,
  httpStatus?: number
): ClassifiedError {
  const message: string = error?.message || error?.toString() || '';
  const status = httpStatus ?? extractHttpStatus(error);
  const providerErrorCode = extractProviderErrorCode(error);

  // ── HTTP 429 or rate-limit patterns ──────────────────────────────────────
  if (status === 429 || RATE_LIMIT_PATTERNS.some((p) => p.test(message))) {
    // Check if it's a daily/quota exhaustion (longer cooldown needed)
    if (QUOTA_EXHAUSTED_PATTERNS.some((p) => p.test(message))) {
      return {
        category: 'QUOTA_EXHAUSTED',
        shouldRotateCredential: true,
        shouldRotateProvider: false,
        shouldMarkInvalid: false,
        shouldCooldown: true,
        shouldRetry: false,
        maxRetries: 0,
        httpStatus: status,
        providerErrorCode,
      };
    }
    return {
      category: 'RATE_LIMIT',
      shouldRotateCredential: true,
      shouldRotateProvider: false,
      shouldMarkInvalid: false,
      shouldCooldown: true,
      shouldRetry: false,
      maxRetries: 0,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── HTTP 401/403 or auth patterns ────────────────────────────────────────
  if (
    status === 401 ||
    status === 403 ||
    AUTH_INVALID_PATTERNS.some((p) => p.test(message))
  ) {
    return {
      category: 'AUTH_INVALID',
      shouldRotateCredential: true,
      shouldRotateProvider: false,
      shouldMarkInvalid: true,
      shouldCooldown: false,
      shouldRetry: false,
      maxRetries: 0,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── Model errors ──────────────────────────────────────────────────────────
  if (status === 404 || MODEL_ERROR_PATTERNS.some((p) => p.test(message))) {
    return {
      category: 'MODEL_ERROR',
      shouldRotateCredential: false, // Don't rotate credential — rotate model
      shouldRotateProvider: false,
      shouldMarkInvalid: false,
      shouldCooldown: false,
      shouldRetry: false,
      maxRetries: 0,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── Safety/policy errors ─────────────────────────────────────────────────
  if (SAFETY_ERROR_PATTERNS.some((p) => p.test(message))) {
    return {
      category: 'SAFETY_ERROR',
      shouldRotateCredential: false, // Don't rotate — it's a content issue
      shouldRotateProvider: false,
      shouldMarkInvalid: false,
      shouldCooldown: false,
      shouldRetry: false,
      maxRetries: 0,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── Bad request / invalid request ─────────────────────────────────────────
  if (status === 400 || REQUEST_ERROR_PATTERNS.some((p) => p.test(message))) {
    return {
      category: 'REQUEST_ERROR',
      shouldRotateCredential: false, // Don't rotate — it's a bad request
      shouldRotateProvider: false,
      shouldMarkInvalid: false,
      shouldCooldown: false,
      shouldRetry: false,
      maxRetries: 0,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── Timeout ───────────────────────────────────────────────────────────────
  if (
    error?.name === 'AbortError' ||
    /timeout/i.test(message) ||
    /timed.?out/i.test(message)
  ) {
    return {
      category: 'TIMEOUT',
      shouldRotateCredential: true,
      shouldRotateProvider: false,
      shouldMarkInvalid: false,
      shouldCooldown: false,
      shouldRetry: true,
      maxRetries: 1,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── Server errors (5xx) ───────────────────────────────────────────────────
  if (status && status >= 500 && status < 600) {
    return {
      category: 'SERVER_ERROR',
      shouldRotateCredential: true,
      shouldRotateProvider: false,
      shouldMarkInvalid: false,
      shouldCooldown: false,
      shouldRetry: true,
      maxRetries: 1,
      httpStatus: status,
      providerErrorCode,
    };
  }

  // ── Unknown ───────────────────────────────────────────────────────────────
  return {
    category: 'UNKNOWN',
    shouldRotateCredential: true,
    shouldRotateProvider: false,
    shouldMarkInvalid: false,
    shouldCooldown: false,
    shouldRetry: false,
    maxRetries: 0,
    httpStatus: status,
    providerErrorCode,
  };
}

/**
 * Get a human-readable description of the routing action taken
 */
export function getFailoverActionDescription(
  classified: ClassifiedError
): string {
  switch (classified.category) {
    case 'RATE_LIMIT':
      return 'Credential entered cooldown (rate limited). Routing to next credential.';
    case 'QUOTA_EXHAUSTED':
      return 'Credential quota exhausted. Routing to next credential with extended cooldown.';
    case 'AUTH_INVALID':
      return 'Credential marked invalid (auth failure). Routing to next healthy credential.';
    case 'MODEL_ERROR':
      return 'Model unavailable or deprecated. Attempting model-level fallback.';
    case 'SAFETY_ERROR':
      return 'Request blocked by content safety filter. No credential rotation performed.';
    case 'REQUEST_ERROR':
      return 'Request error (bad request format). No credential rotation performed.';
    case 'TIMEOUT':
      return 'Request timed out. Retrying with next credential.';
    case 'SERVER_ERROR':
      return 'Provider server error. Attempting limited retry then next credential.';
    default:
      return 'Unknown error. Attempting next credential.';
  }
}
