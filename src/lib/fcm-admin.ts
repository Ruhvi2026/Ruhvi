/**
 * Firebase Cloud Messaging (FCM) HTTP v1 Admin Client
 *
 * Implements server-side push notification sending via the official FCM HTTP
 * v1 API, using a Google service-account OAuth2 token signed with `jose`.
 *
 * This mirrors the project's `firebase-admin.ts` REST approach, deliberately
 * avoiding the `firebase-admin` / `jwks-rsa` ESM bundler conflicts on Vercel
 * Serverless.
 */
import { SignJWT, importPKCS8 } from 'jose';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\\n/g, '\n').trim();
  if (!cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    cleaned = `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
  }
  return cleaned;
}

let cachedFcmToken: { token: string; expiresAt: number } | null = null;

async function getFcmAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedFcmToken && cachedFcmToken.expiresAt > now + 60) {
    return cachedFcmToken.token;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error(
      'FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be configured to send FCM notifications.'
    );
  }

  const privateKey = await importPKCS8(
    formatPrivateKey(rawPrivateKey),
    'RS256'
  );

  const jwt = await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        'Failed to obtain FCM access token'
    );
  }

  cachedFcmToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return data.access_token;
}

export interface FcmMessage {
  title: string;
  body?: string;
  url?: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

/**
 * Sends a push notification to a single device token via FCM HTTP v1.
 * Returns the FCM message ID on success.
 */
export async function sendFcmToToken(
  token: string,
  message: FcmMessage
): Promise<string> {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ruhvi-f707c';
  const accessToken = await getFcmAccessToken();

  const fcmMessage: any = {
    token,
    notification: {
      title: message.title,
      body: message.body || '',
    },
    data: message.data || {},
  };

  if (message.imageUrl) {
    fcmMessage.notification.image = message.imageUrl;
  }
  if (message.url) {
    fcmMessage.data = { ...(message.data || {}), url: message.url };
    fcmMessage.webpush = {
      fcm_options: { link: message.url },
      headers: {},
      notification: { title: message.title, body: message.body || '' },
    };
    if (message.imageUrl) {
      fcmMessage.webpush.notification.image = message.imageUrl;
    }
  }

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message: fcmMessage }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'FCM send failed');
  }

  return data.name || '';
}

/**
 * Sends a push notification to multiple device tokens (batched, one request
 * per token — FCM v1 has no single-call multicast endpoint).
 * Returns the number of successful sends.
 */
export async function sendFcmToTokens(
  tokens: string[],
  message: FcmMessage
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const token of tokens) {
    try {
      await sendFcmToToken(token, message);
      sent++;
    } catch (err) {
      failed++;
      console.error('[FCM] Send failed for token:', err);
    }
  }

  return { sent, failed };
}

/**
 * Fetches all registered push tokens for a set of user ids.
 */
export async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('user_push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (error) {
    console.error('[FCM] Failed to fetch user tokens:', error);
    return [];
  }

  return (data || []).map((row: any) => row.token);
}
