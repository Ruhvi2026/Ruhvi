import { PostHog } from 'posthog-node';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let posthogClient: PostHog | null = null;

/**
 * Returns a lazily-initialized PostHog server client for use in Server
 * Components, Route Handlers, and Server Actions.
 *
 * `flushAt: 1` + `flushInterval: 0` makes each event flush immediately, so
 * events are not lost when a serverless function is torn down mid-batch.
 * When the project key is not configured the client is a no-op.
 */
export function PostHogClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;

  if (!posthogClient) {
    posthogClient = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

export { POSTHOG_KEY, POSTHOG_HOST };
