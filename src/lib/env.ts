import { z } from 'zod';

const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .or(z.undefined());
const optionalString = z.string().optional().or(z.literal(''));

const envSchema = z.object({
  // Next configs
  NEXT_PUBLIC_APP_URL: optionalUrl,

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .default('https://placeholder.supabase.co'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .default('placeholder-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: optionalString,

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  UPSTASH_REDIS_REST_READONLY_URL: optionalUrl,
  UPSTASH_REDIS_REST_READONLY_TOKEN: optionalString,

  // Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY: optionalString,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_APP_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: optionalString,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optionalString,

  // Firebase Admin (service account — server-only, used by FCM + Auth REST clients)
  FIREBASE_CLIENT_EMAIL: optionalString,
  FIREBASE_PRIVATE_KEY: optionalString,

  // Meta/Analytics
  NEXT_PUBLIC_META_PIXEL_ID: optionalString,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString,

  // PostHog (Product Analytics, Web Analytics, Session Replay)
  NEXT_PUBLIC_POSTHOG_KEY: optionalString,
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  NEXT_PUBLIC_POSTHOG_UI_HOST: optionalUrl,
  POSTHOG_PERSONAL_API_KEY: optionalString,
  POSTHOG_PROJECT_ID: optionalString,

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: optionalString,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: optionalString,

  // Resend Email (Transactional)
  RESEND_API_KEY: optionalString,
  RESEND_SENDER_EMAIL: optionalString,

  // Brevo Email (Marketing)
  BREVO_API_KEY: optionalString,
  BREVO_SENDER_NAME: optionalString,
  BREVO_SENDER_EMAIL: optionalString,

  // EspoCRM (agent console at crm.support.ruhvi.in)
  ESPO_ENABLED: optionalString,
  ESPO_BASE_URL: optionalUrl,
  ESPO_API_KEY: optionalString,
  ESPO_WEBHOOK_SECRET: optionalString,
  RUHVI_BASE_URL: optionalUrl,
  ESPO_DEFAULT_ASSIGNEE_EMAIL: optionalString,
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_READONLY_URL: process.env.UPSTASH_REDIS_REST_READONLY_URL,
  UPSTASH_REDIS_REST_READONLY_TOKEN:
    process.env.UPSTASH_REDIS_REST_READONLY_TOKEN,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_POSTHOG_UI_HOST: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
  POSTHOG_PERSONAL_API_KEY: process.env.POSTHOG_PERSONAL_API_KEY,
  POSTHOG_PROJECT_ID: process.env.POSTHOG_PROJECT_ID,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET:
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,

  // EspoCRM
  ESPO_ENABLED: process.env.ESPO_ENABLED,
  ESPO_BASE_URL: process.env.ESPO_BASE_URL,
  ESPO_API_KEY: process.env.ESPO_API_KEY,
  ESPO_WEBHOOK_SECRET: process.env.ESPO_WEBHOOK_SECRET,
  RUHVI_BASE_URL: process.env.RUHVI_BASE_URL,
  ESPO_DEFAULT_ASSIGNEE_EMAIL: process.env.ESPO_DEFAULT_ASSIGNEE_EMAIL,
});

if (!_env.success) {
  console.warn('⚠️ Environment variables warning:', _env.error.format());
}

export const env = _env.success
  ? _env.data
  : (process.env as unknown as z.infer<typeof envSchema>);

