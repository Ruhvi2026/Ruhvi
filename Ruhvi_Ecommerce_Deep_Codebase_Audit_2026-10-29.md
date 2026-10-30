# Ruhvi E-commerce — Deep Codebase Audit & Free Improvement Roadmap

**Audit date:** 29 October 2026  
**Repository inspected:** [Ruhvi2026/Ruhvi](https://github.com/Ruhvi2026/Ruhvi), default branch `main`  
**Mode:** Read-only; no code, files, commits, settings, or deployments were changed.  
**Scope excluded by request:** Payment integration, shipping integration, product-catalog implementation, WhatsApp integration and Meta integration. Site-wide SEO/sitemap and cross-cutting credential hygiene are still included where they affect the overall platform.

## 1. Executive summary

Ruhvi already has a sizeable foundation: Next.js 15 App Router, React 19, TypeScript strict mode, Supabase, custom session/RBAC middleware, Jest, Playwright, PostHog, Sentry, Vercel Speed Insights and OpenTelemetry-related packages. The repository also has a centralized AI gateway, an AI Co-Founder context engine, proactive signals, email/task/blog automations and a multi-portal host-routing design.

**The best next investment is not adding another big platform.** It is to improve verification, safe operations, observability and data correctness around what is already installed. A small set of free tools—Playwright Test, axe-core, Lighthouse CI and Promptfoo—can add valuable guardrails, preferably running on GitHub Actions rather than on the founder's low-memory laptop.

### Most important findings

| Priority | Finding | Confidence | Why it matters |
|---|---|---|---|
| **P0 — immediate** | `/api/cron/automations` only rejects unauthorized calls when `CRON_SECRET` is set. If the variable is absent, the check is skipped. | Confirmed in inspected code | Public requests could trigger scheduled emails, tasks, blog publishing and AI scans if production configuration is incomplete. |
| **P0 — immediate verification** | `.env.example` contains non-placeholder values in two Cloudinary chat-credential fields. Values are intentionally not reproduced here; I did not validate whether they are live. | Confirmed values exist; live validity unknown | Example files are committed source. If these are real credentials, rotate them and remove them from the repository/history as appropriate. |
| **P1 — high** | OpenTelemetry's OTLP exporter is hard-coded to `http://localhost:4318/v1/traces`. | Confirmed in inspected code | A Vercel serverless runtime normally will not have a local collector there, so these traces may not reach a backend. |
| **P1 — high** | The blog publisher comment says it runs every 15 minutes, but `vercel.json` configures the only visible Vercel cron at `0 4 * * *` (once daily). | Confirmed in inspected files | Scheduled publication may be delayed until the next daily run; other automation cadence may also be misunderstood. |
| **P1 — high** | The customer chatbot's prompt promises verified customer/order context, but the inspected `/api/chat` handler passes conversation text to the AI and does not itself load a verified customer identity or order context. | Confirmed in the inspected handler; other surrounding integrations not exhaustively indexed | It needs a safe, authenticated handoff for account-specific answers rather than relying on instructions in a prompt. |
| **P1 — high** | The inspected PostHog pageview/helper files call `capture` and `identify`, but I did not find `posthog.init()` in those entry points. | Needs repository-wide verification | If there is no initialization elsewhere, pageviews and user identification will not be configured correctly. Verify before assuming analytics events are arriving. |
| **P1 — high** | The analytics time-range code uses the server's local date boundaries, without an explicit `Asia/Kolkata` timezone in the inspected logic. | Confirmed implementation pattern; actual runtime impact needs tests | Daily/“today” metrics can be cut at the wrong boundary for an India-based business if runtime timezone differs. |
| **P1 — high** | Rate limiting falls back to a per-process in-memory map if Upstash Redis is missing or unreachable. | Confirmed in inspected code | In serverless/multi-instance deployments, that fallback is not a reliable global limit. Abuse-sensitive routes need a deliberate degraded-mode policy. |
| **P2 — medium** | Sitemap gives every static/category page `lastModified: new Date()` and silently returns no dynamic product URLs if the query fails. | Confirmed in inspected code | `lastModified` can imply pages changed on every generation, and a query failure can produce an incomplete sitemap without an alert. |
| **P2 — medium** | The offline banner says “Operating in offline mode,” but the inspected component only observes browser online/offline events. | Confirmed for this component; service-worker/offline cache not fully verified | The text may promise offline functionality that this component does not implement. |
| **P2 — medium** | `package.json` has Jest but no explicit `typecheck`, `test:e2e`, `test:a11y` or `test:coverage` script. `playwright` is a dependency, but no Playwright Test runner/config was confirmed in the files inspected. | Confirmed in `package.json`; complete CI tree could not be enumerated | The project can have many features without automatically proving that core customer and portal flows still work. |

## 2. What I actually inspected

This was a code-based review, not a review of documentation alone. Files inspected included:

- [`package.json`](https://github.com/Ruhvi2026/Ruhvi/blob/main/package.json), [`tsconfig.json`](https://github.com/Ruhvi2026/Ruhvi/blob/main/tsconfig.json), [`jest.config.js`](https://github.com/Ruhvi2026/Ruhvi/blob/main/jest.config.js), [`next.config.js`](https://github.com/Ruhvi2026/Ruhvi/blob/main/next.config.js)
- [`src/middleware.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/middleware.ts), [`resolve-host.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/middleware/resolve-host.ts), [`rbac-cache.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/middleware/rbac-cache.ts), [`security-headers.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/middleware/security-headers.ts)
- [`src/lib/rate-limit.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/rate-limit.ts), [`src/lib/supabase/server.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/supabase/server.ts), [`src/lib/supabase/service.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/supabase/service.ts), [`src/lib/env.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/env.ts)
- [`src/app/layout.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/layout.tsx), [`src/app/robots.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/robots.ts), [`src/app/sitemap.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/sitemap.ts), [`OfflineDetector.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/components/layout/OfflineDetector.tsx)
- [`src/app/api/chat/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/chat/route.ts), [`src/lib/ai/index.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/index.ts), [`brain.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/brain.ts), [`proactive.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/proactive.ts), [`analytics.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/analytics.ts), [`memory-engine.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/memory-engine.ts)
- [`src/app/api/cron/automations/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/automations/route.ts), [`src/lib/cron/blog-publisher.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/cron/blog-publisher.ts), [`vercel.json`](https://github.com/Ruhvi2026/Ruhvi/blob/main/vercel.json)
- [`src/components/PostHogProvider.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/components/PostHogProvider.tsx), [`PostHogPageView.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/components/PostHogPageView.tsx), [`gtag.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/gtag.ts), [`src/instrumentation-otel.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/instrumentation-otel.ts), [`sentry.server.config.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/sentry.server.config.ts), [`sentry-ignore.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/sentry-ignore.ts)

### Important limitation

The connected GitHub file reader let me inspect important files and paths, but it did not provide a complete recursive source tree or indexed full-code search in this session. A direct local clone also could not be completed because the environment could not resolve GitHub. Therefore, I **did not claim to read every file, execute Jest, run `next build`, run a live deployment check, or validate the live credentials**. Findings below distinguish confirmed code patterns from items requiring runtime/repository-wide verification. No source files were changed.

## 3. Detailed findings and recommended fixes

### A. Security and safe operations

#### A1. Cron authentication must fail closed — P0
**Evidence:** [`src/app/api/cron/automations/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/automations/route.ts)

The route checks the authorization header only inside `if (process.env.CRON_SECRET && ...)`. If `CRON_SECRET` is absent, that condition does not reject the request. The route has access to a service-role Supabase client and triggers multiple side effects.

**Recommendation:** Require a configured secret; if missing, return a server error and never continue. Compare the exact bearer header before any database action. Add tests for (1) missing secret, (2) wrong secret, (3) correct secret. Also use a run ID, idempotency key and per-step outcome record so an accidental double invocation cannot send duplicate reminders or repeat tasks.

#### A2. Credential-like values in `.env.example` — P0 verification
**Evidence:** [`/.env.example`](https://github.com/Ruhvi2026/Ruhvi/blob/main/.env.example)

Two Cloudinary chat credential variables have populated, non-placeholder values in the committed example file. I am not copying the values into this report and have not tested whether they authenticate.

**Recommendation:** Check privately whether they are real. If real, rotate/revoke them immediately, replace the example values with obvious placeholders, and consider removing the sensitive values from Git history. Never rely only on deleting a secret from the latest commit: old commits can remain public. Then use GitHub's public-repository secret-scanning alerts and add a local/CI secret scan if needed. Do not put any production secret in browser-exposed `NEXT_PUBLIC_*` variables.

#### A3. Service client should fail fast on missing project URL — P1
**Evidence:** [`src/lib/supabase/service.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/supabase/service.ts)

The service client uses a hard-coded Supabase URL when `NEXT_PUBLIC_SUPABASE_URL` is absent. It still requires the service-role key, but a fallback target can make a misconfigured environment point at an unintended project.

**Recommendation:** Require both URL and service-role key for this privileged client; do not silently default to a project URL. Add `import 'server-only'` at the module boundary to make accidental client-side use harder. Add environment validation tests for production and preview settings.

#### A4. Content Security Policy still allows unsafe inline/eval — P1/P2
**Evidence:** [`src/lib/middleware/security-headers.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/middleware/security-headers.ts)

The code explicitly leaves `unsafe-eval` and `unsafe-inline` in CSP and includes a TODO to move to nonce-based CSP. This may be necessary for current scripts, so do not remove the directives blindly.

**Recommendation:** First inventory which libraries need inline/eval. Then migrate incrementally to nonce/hash-based scripts, test authentication and portal host routing, and tighten CSP only after browser testing. Keep the existing response-security headers and test them in middleware tests.

#### A5. Verify server-side RBAC on every protected API — P1
**Evidence:** [`src/middleware.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/middleware.ts), [`src/lib/middleware/rbac-cache.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/middleware/rbac-cache.ts)

The project uses host isolation and a signed five-minute RBAC cache. That can be a reasonable performance technique, but cached role data can remain valid for up to five minutes after a role change. This review did not enumerate every API handler, so I cannot confirm every protected route has independent authorization.

**Recommendation:** Create a permissions matrix for customer, staff, manager, admin and super-admin; test every sensitive server action/API with allowed and denied roles. Make sure portal hiding or client-side checks are never the only access control. For high-impact actions, re-check current authorization in the handler and consider invalidation/revocation behavior for cached roles.

### B. Monitoring, analytics and operational visibility

#### B1. OpenTelemetry export points at localhost — P1
**Evidence:** [`src/instrumentation-otel.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/instrumentation-otel.ts)

The exporter URL is hard-coded to `http://localhost:4318/v1/traces`, and the log message says it expects a local Jaeger/OTLP collector. That is not a safe assumption for Vercel serverless.

**Recommendation:** Make the OTLP endpoint configurable with an environment variable, and only start the exporter when a valid endpoint is configured. Otherwise rely on the already integrated Sentry instrumentation until a collector is chosen. Do not install a heavyweight self-hosted observability stack just for this: it adds a server to maintain and may cost money. Add a small deployment health check to verify that traces/errors are actually arriving.

#### B2. Sentry samples 100% of traces — P2 / cost guard
**Evidence:** [`sentry.server.config.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/sentry.server.config.ts)

`tracesSampleRate: 1` requests full trace sampling. That may be useful while diagnosing an early-stage system, but it can burn a free quota quickly as traffic grows.

**Recommendation:** Make the sample rate environment-configurable. Start with a modest production sample (for example 0.1) after measuring traffic, while retaining 100% of errors. Use targeted sampling for slow requests, failures and important workflows. Re-check Sentry plan limits before the setting is finalized.

#### B3. Verify PostHog is initialized and events are arriving — P1 verification
**Evidence:** [`PostHogProvider.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/components/PostHogProvider.tsx), [`PostHogPageView.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/components/PostHogPageView.tsx), [`gtag.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/gtag.ts)

These inspected files call `identify`, `reset` and `capture`, but I could not confirm the actual `posthog.init()` call from the available repository search. This is not enough evidence to label analytics definitely broken, but it is an important verification item.

**Recommendation:** In the browser devtools and PostHog Live Events, verify (a) the SDK is initialized once, (b) pageviews occur once per navigation, (c) login identifies the correct user, (d) logout resets identity, and (e) no cross-user events bleed across sessions. Add a lightweight smoke test. Avoid capturing emails or other personal data in event properties unless there is a clear need and the privacy notice/settings cover it.

#### B4. Avoid per-instance rate-limit assumptions — P1
**Evidence:** [`src/lib/rate-limit.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/rate-limit.ts)

When Redis is unavailable or unconfigured, the fallback map lives inside a single process. That is useful as a local fallback but not a global rate limit across serverless instances.

**Recommendation:** Decide separately for each route whether a Redis outage should fail open or fail closed. For public abuse-prone endpoints, emit an alert when the system falls back; test fallback behavior; avoid presenting the in-memory limit as equivalent to a distributed limit.

#### B5. Add job run history and alerting — P1
**Evidence:** [`src/app/api/cron/automations/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/automations/route.ts)

The route catches some individual step errors, returns structured results, and logs exceptions. That is a useful starting point, but it is not a durable job ledger: a log can be missed and it is difficult to prove which customers/tasks were processed after a timeout.

**Recommendation:** Write a compact run record (run ID, started/completed times, per-step counts, error summary, idempotency key) to Supabase. Alert on missing daily runs and repeated failures. Make side effects idempotent and use bounded concurrency rather than unbounded sequential processing over an entire customer list.

### C. Automation and background jobs

#### C1. Schedule mismatch — P1
**Evidence:** [`vercel.json`](https://github.com/Ruhvi2026/Ruhvi/blob/main/vercel.json), [`src/lib/cron/blog-publisher.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/cron/blog-publisher.ts)

The blog publisher comments that it runs every 15 minutes, but the visible Vercel cron entry calls `/api/cron/automations` once daily at `0 4 * * *`. That route invokes the blog publisher, so the configured schedule does not match the comment.

Vercel's current documentation says Hobby cron jobs can run only once per day, with up to 59 minutes of timing variance; more frequent schedules require a different plan. If Ruhvi remains on Vercel Hobby, do not design business-critical logic assuming a 15-minute Vercel cron. See [Vercel Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).

**Free/low-cost options:**
1. Keep low-urgency daily jobs on the existing daily cron and correct the comments/expectations.
2. For workflows that genuinely need retries, durable steps or frequent schedules, evaluate [Inngest](https://www.inngest.com/pricing). Its official pricing page currently advertises a $0 plan with 50,000 executions/month and no credit card; check limits again before adopting.
3. GitHub Actions scheduled workflows can call a protected endpoint for noncritical housekeeping, and standard GitHub-hosted runners are free for public repositories. Scheduled workflows are not a precise real-time queue, so do not use them for customer-visible, time-critical side effects.

Do not add Inngest solely because it exists. Use it only after measuring whether current job cadence/retry needs justify an additional service.

#### C2. Prevent duplicate email/task side effects — P1
**Evidence:** [`src/app/api/cron/automations/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/automations/route.ts)

Several actions send an email and then update the corresponding timestamp. If two invocations overlap, a timeout occurs after sending, or the route retries before the update completes, a duplicate can be possible. The birthday/anniversary and win-back logic also loops over users and performs repeated individual queries/updates.

**Recommendation:** Store a unique event key such as `(user_id, campaign_type, campaign_period)` and enforce uniqueness in the database before sending. Use bounded batches, pagination, retry-safe states (`pending`, `sending`, `sent`, `failed`) and a dead-letter/error queue. Audit marketing consent/unsubscribe suppression in the sending functions before any live campaign; this route's visible query alone does not establish that suppression is handled downstream.

#### C3. Timezone correctness in KPIs — P1
**Evidence:** [`src/lib/ai/co-founder/analytics.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/analytics.ts)

The time-range helper creates day boundaries using `new Date(year, month, day)` and does not explicitly use `Asia/Kolkata` in the inspected logic. This depends on the runtime's local timezone and needs a test rather than an assumption.

**Recommendation:** Define the business timezone explicitly (`Asia/Kolkata`) and test midnight, month-end, year-end and daylight/timezone edge cases. Report both the timezone and freshness timestamp in dashboards/Co-Founder summaries.

### D. AI customer support and Co-Founder quality

#### D1. Safe customer/order context in chatbot — P1
**Evidence:** [`src/app/api/chat/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/chat/route.ts)

The prompt says customer/order questions must use verified context, but the inspected handler only takes the incoming message array, includes the last six messages in a generated prompt and calls `generateAIContent('chatbot', prompt)`. It does not itself fetch a verified customer session, an order, a ticket or other customer-specific context.

**Recommendation:** Split the chatbot into safe intent routes. Public questions can use approved store knowledge. Account/order questions should require a verified session, fetch only that user's permitted records, cite the source/freshness internally and return a safe fallback if data is unavailable. Add a support-ticket handoff for unresolved queries. Never trust a customer-supplied user ID/order ID as proof of ownership.

#### D2. Treat all conversation history as untrusted input — P1
**Evidence:** [`src/app/api/chat/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/chat/route.ts)

The latest query is wrapped in `<user_input>` tags, but earlier messages are concatenated into free-form `Customer:` / `Assistant:` lines. Prompt delimiters are not an authorization boundary, and earlier user messages can contain instruction-like text.

**Recommendation:** Prefer the provider's structured message API with roles rather than concatenating all history into one prompt. Validate the schema and sender of every message, treat every customer message as untrusted content, and keep system instructions/tool policy separate. Add regression cases for prompt injection in both the newest and an earlier turn.

#### D3. Proactive signals need evidence-based confidence — P1/P2
**Evidence:** [`src/lib/ai/co-founder/proactive.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/proactive.ts)

The competitor-discount detector inspects stored `latest_insights`, promotions and notes; that is not by itself proof that a competitor's current live price was fetched. The cart-abandonment detector treats at least three recent cart-item rows as a signal and estimates value from product price/quantity; those rows alone do not prove checkout abandonment.

**Recommendation:** Label each signal `confirmed`, `strong`, `possible` or `insufficient_evidence` based on data actually available. Record source table, timestamp, sample size and evidence in the signal. Avoid messages such as “competitor launched a discount” unless the current data was freshly fetched and verified. For cart abandonment, use a real checkout/cart session and order-conversion window rather than row-count alone. Require approval before consequential action.

#### D4. Add AI regression tests with Promptfoo — P1/P2
**Why:** The AI gateway has provider failover and the Co-Founder has tools/memory/proactive signals; these can regress when prompts or provider config changes.

**Recommendation:** Create a small, versioned benchmark of 30–50 scenarios: Bengali/Banglish/English support, unknown answer, user privacy, order ownership, prompt injection, tool selection, worker-routing, approval-required action, failed provider, invalid JSON, stale memory and incorrect metrics. Run deterministic mocked tests on each PR; run a small optional live-provider suite manually because model/API usage may incur cost.

Open-source repository: [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) (MIT; free CLI/library). Promptfoo itself is free, but real model calls are not necessarily free.

### E. SEO, accessibility and storefront quality (excluding product-catalog implementation)

#### E1. Sitemap `lastModified` and silent failure — P2
**Evidence:** [`src/app/sitemap.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/sitemap.ts)

Every static/category URL receives `lastModified: new Date()`, although the static content may not have changed. Dynamic URL generation catches all errors and returns an empty list without logging. The dynamic query does not use pagination; that may be fine at the present size but should be monitored as the site grows.

**Recommendation:** Use real content `updated_at` values for genuinely changed pages. For pages without trustworthy dates, omit `lastModified` instead of making up a fresh timestamp. Log/monitor sitemap query failures, set a timeout, and paginate or split large sitemaps when needed. Next.js supports programmatic sitemap generation and multiple sitemap files; see [Next.js sitemap docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap).

#### E2. Language and localization semantics — P2
**Evidence:** [`src/app/layout.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/layout.tsx)

The root document is always `<html lang="en">` and organization structured data lists English/Hindi. The customer-facing AI has Bengali/Banglish/Hindi language ambitions, but that does not automatically mean the storefront itself is localized.

**Recommendation:** If storefront UI will support Bengali/Hindi, implement explicit locale routing/translations and set the correct `lang` per page. If the UI remains English-only for now, keep the current language accurate and do not advertise unsupported translated pages. Do not machine-translate critical policies without review.

#### E3. Accessibility regression testing — P2
**Evidence:** The root layout already includes a skip-to-main-content link, which is a positive base. No automated axe test setup was confirmed in `package.json` or the inspected test configuration.

**Recommendation:** Add `axe-core` to a small Playwright accessibility suite for homepage, login, navigation/menu, chatbot, support forms and each portal's representative page. Pair it with manual keyboard/focus testing and check color contrast. Axe can find many common issues but does not replace manual review.

Open-source repository: [dequelabs/axe-core](https://github.com/dequelabs/axe-core) (MPL-2.0).

#### E4. Offline-state wording and PWA decision — P3
**Evidence:** [`OfflineDetector.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/components/layout/OfflineDetector.tsx)

The component detects network state and displays a banner; that alone does not cache pages or make the shopping experience work offline. I did not verify the entire public directory/service-worker setup.

**Recommendation:** Either change the message to “You appear to be offline; reconnect to continue,” or deliberately build/test a PWA with a service worker, cache strategy and safe behavior for authenticated data. I would not prioritize a full offline storefront for a jewellery shop before reliability/testing.

#### E5. Core Web Vitals budget — P2

The repo already contains `@vercel/speed-insights/next` and Next.js package optimization. Keep these; do not install another analytics platform simply to measure performance. Add a repeatable Lighthouse CI check against a production build/preview and track LCP, INP, CLS, JavaScript bundle size and accessibility/SEO regression. Set realistic budgets after measuring the current baseline rather than guessing a score target.

Open-source repository: [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) (open source, can run in CI).

### F. Tests, CI/CD and dependency hygiene

#### F1. Make the existing test stack a release gate — P1
**Evidence:** [`package.json`](https://github.com/Ruhvi2026/Ruhvi/blob/main/package.json) has `build`, `lint`, `test` (Jest), `analyze` and production audit scripts; [`jest.config.js`](https://github.com/Ruhvi2026/Ruhvi/blob/main/jest.config.js) configures unit tests.

**Gap:** I did not confirm a complete CI workflow or a Playwright Test config from the files available. The direct paths tried for common workflow filenames were not found, so I am not claiming that no CI exists under a differently named file.

**Recommendation:** Establish a required PR gate in this order: install from lockfile (`npm ci`), ESLint, `tsc --noEmit`, Jest, production build, dependency audit, then a small Playwright smoke suite. Run heavier browser tests on GitHub-hosted runners, not on the 4 GB local laptop. For a public repo, standard GitHub-hosted Actions runners are free; check the current [GitHub Actions billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

Add `test:coverage` and coverage reports; do not immediately set a very high global coverage percentage. Start by requiring tests for business-critical logic and gradually raise thresholds.

Open-source repository: [microsoft/playwright](https://github.com/microsoft/playwright). Because `playwright` is in the package but `@playwright/test` and an E2E script were not confirmed, first check the lockfile/configuration and add only the test-runner pieces actually needed.

#### F2. Dependency updates and supply-chain guardrails — P2

The package has a large integration surface (AI SDKs, Firebase, Supabase, Sentry, PostHog, editor packages, LiveKit, Three.js and more). This is not a reason to remove them, but it does increase upgrade and compatibility burden.

**Recommendation:** Enable Dependabot security alerts and scheduled dependency updates; keep a lockfile and validate updates through CI. Review version alignment between `next`, `eslint-config-next` and `@next/bundle-analyzer`, plus `jest`/`ts-jest`, using the actual lockfile and build output before upgrading. Add a monthly dependency review rather than bulk-upgrading everything at once. Do not run `lint:fix` or broad dependency updates on production without reviewing the diff.

### G. Data reliability, recovery and customer privacy

#### G1. Database backup and restore drill — P1 before launch

The code inspection did not verify the actual Supabase backup plan, backup schedule or ability to restore. Do not equate “database provider has backups” with “the app can be restored.”

**Recommendation:** Document what data is stored, export/backup frequency, retention, encryption, storage location, access controls and restore steps. Run a restore drill into a non-production project and record how long it takes. An encrypted logical backup to existing low-cost object storage can be explored, but verify current free-tier quotas and never put customer database dumps into a public GitHub artifact or repository. Restore testing matters more than adding another dashboard.

#### G2. Analytics privacy and retention — P2

`PostHogProvider` identifies logged-in users with email and role. The Sentry filter includes some PII scrubbing, which is positive, but each analytics tool needs its own review.

**Recommendation:** Minimize personal data sent to analytics, mask session-replay fields, verify cookie/consent behavior where applicable, define retention/deletion behavior, and add a privacy notice describing actual tracking. Test login/logout identity resets and avoid logging message bodies, OTPs, tokens or personal order details.

## 4. Free/open-source options: what I recommend and what I would skip

| Tool / repository | Cost / license signal | Best Ruhvi use | My recommendation |
|---|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) | Open-source browser testing | E2E smoke tests across customer pages and multi-subdomain portals | **Use**; build a small test suite first. |
| [axe-core](https://github.com/dequelabs/axe-core) | Open-source accessibility engine, MPL-2.0 | Accessibility checks within browser tests | **Use** for top customer/portal flows. |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | Open-source CI tooling | Performance, SEO, accessibility regressions and budgets | **Use** once there is a stable preview/build URL. |
| [Promptfoo](https://github.com/promptfoo/promptfoo) | MIT open source | LLM response regression and agent/tool evaluation | **Use** with deterministic mocked CI tests; live model checks optional because API calls can cost money. |
| [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | Standard hosted runners free for public repos | Run lint, typecheck, Jest, build, E2E and scheduled checks | **Use** rather than depending on the laptop. |
| [Inngest](https://www.inngest.com/pricing) | Official page currently lists a free plan with 50,000 executions/month | Retry-safe/frequent background workflows if daily Vercel cron is insufficient | **Optional**; adopt only if job cadence/retries justify another service. Confirm limits before relying on it. |
| GitHub Secret Scanning | Public repositories: free scanning/alerts according to current docs | Detect committed credentials | **Check/enforce now**, especially because `.env.example` has suspicious populated values. [Docs](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning). |
| [Umami](https://github.com/umami-software/umami) | MIT open source but self-hosting needs Node/Postgres or other supported setup | Lightweight web analytics | **Skip for now**; Ruhvi already has PostHog and Speed Insights. Another analytics system adds operations without solving the current gaps. |
| Self-hosted PostHog / Langfuse / OpenReplay-style stack | Open-source/self-hostable options, but operational footprint varies | Advanced analytics, AI tracing or session replay | **Do not self-host now** on the constrained laptop. First use the existing PostHog/Sentry stack correctly. |

## 5. Implementation roadmap (zero/near-zero recurring tool cost)

### Phase 0 — Immediate safety checks
1. Privately verify the two Cloudinary values in `.env.example`; rotate if real and replace with placeholders.
2. Fix the cron route's missing-secret behavior so missing `CRON_SECRET` cannot run jobs.
3. Review the open [wallet-top-up security PR #1](https://github.com/Ruhvi2026/Ruhvi/pull/1) separately before launch. Although the payment integration itself was excluded from this audit, its PR description raises a cross-cutting hard-coded-secret/RBAC concern; do not assume it is fixed while the PR remains open.
4. Confirm the actual Vercel cron schedule and correct the blog publisher documentation/expectations.

### Phase 1 — Prove the app still works
1. Add explicit `typecheck` script (`tsc --noEmit`).
2. Add/verify CI on pull requests: `npm ci` → lint → typecheck → Jest → build.
3. Add Playwright Test for public navigation, login/logout, chatbot handoff, support-ticket flow, portal-host redirects, and role-denied access. Keep payment/shipping/product-catalog integrations outside this test plan as requested.
4. Add axe checks to the same smoke suite.
5. Add a basic health check/alert for the app and cron runs.

### Phase 2 — Correct telemetry and scheduled work
1. Verify PostHog init and real pageview capture.
2. Make OTLP endpoint configurable or disable the exporter on Vercel until a collector exists.
3. Make Sentry sampling configurable, then inspect quota/volume.
4. Add cron run records, idempotency keys, pagination and bounded concurrency.
5. Make daily business metrics explicitly `Asia/Kolkata` and add boundary tests.

### Phase 3 — Customer and AI correctness
1. Separate public policy questions from authenticated account/order questions.
2. Add verified context and safe human-support/ticket handoff for unresolved questions.
3. Add Promptfoo scenarios for Bengali/Banglish/English, hallucination refusal, privacy, prompt injection and tool/worker approvals.
4. Ensure every proactive signal exposes its source, timestamp and confidence; change weak heuristics to “possible signal” rather than fact.

### Phase 4 — SEO, UX and resilience
1. Fix sitemap modification dates and report sitemap generation errors.
2. Run Lighthouse CI and fix the largest measured mobile bottlenecks first.
3. Test keyboard navigation, screen-reader landmarks, dialogs, contrast and reduced-motion behavior.
4. Decide whether the storefront should support localized Bengali/Hindi UI; update document language/metadata only when the translation actually exists.
5. Document and test database restore, and review analytics PII/retention.

## 6. Acceptance checklist (before calling the platform “launch-ready”)

- [ ] No real secret remains in `.env.example`, docs, source, issues or repository history; relevant keys rotated.
- [ ] Missing `CRON_SECRET` makes cron refuse to execute.
- [ ] One cron run has a durable run ID and duplicate invocations do not duplicate side effects.
- [ ] CI runs lint, typecheck, Jest and build on every PR; failures block merging.
- [ ] Playwright smoke tests cover navigation, auth, support and portal access control.
- [ ] Accessibility tests run on key pages and manual keyboard checks pass.
- [ ] PostHog Live Events confirm one pageview per navigation and correct identify/reset behavior.
- [ ] Production tracing has a real configured endpoint or is intentionally disabled; no localhost exporter is assumed.
- [ ] “Today” analytics are based on an explicit `Asia/Kolkata` business day and include freshness timestamps.
- [ ] Chatbot never exposes account/order details without verified ownership and never invents metrics.
- [ ] Proactive alerts distinguish confirmed facts from heuristics and show evidence.
- [ ] Sitemap errors are observable and timestamps reflect actual content changes.
- [ ] Backup restoration has been tested into a non-production environment.
- [ ] Analytics PII masking, retention and privacy disclosures have been reviewed.

## 7. What not to do right now

- Do not buy a new analytics/monitoring product before confirming PostHog, Sentry and Vercel Speed Insights work correctly.
- Do not self-host a large observability, analytics or queue stack on the low-memory local laptop.
- Do not rebuild the frontend or do a broad code refactor before tests exist.
- Do not add a full PWA, complex AI workflow builder, extra BI tool or new AI framework before the critical reliability fixes.
- Do not treat package presence or a prompt instruction as proof that a feature works end-to-end.

## 8. External references used

- [Next.js sitemap documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Vercel Cron usage and pricing (updated Jan 28, 2026)](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel Cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub secret scanning for public repositories](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning)
- [Playwright GitHub repository](https://github.com/microsoft/playwright)
- [axe-core GitHub repository](https://github.com/dequelabs/axe-core)
- [Lighthouse CI GitHub repository](https://github.com/GoogleChrome/lighthouse-ci)
- [Promptfoo GitHub repository](https://github.com/promptfoo/promptfoo)
- [Inngest pricing](https://www.inngest.com/pricing)
- [Cloudflare Web Analytics docs](https://developers.cloudflare.com/web-analytics/about/)

---

**Final recommendation:** For Ruhvi's current budget, prioritize three things: (1) fix the cron/secret issues, (2) make GitHub Actions + Playwright + axe + Lighthouse your free quality gate, and (3) improve existing PostHog/Sentry/AI telemetry instead of adding duplicate services. Those will make the platform measurably more future-ready while preserving its current architecture.
