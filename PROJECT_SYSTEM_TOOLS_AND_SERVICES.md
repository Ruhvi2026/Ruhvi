# Project Ruhvi - Complete Tools, Services, Skills, MCP & Domain DNS Audit Documentation

**Generated Date:** 2026-10-10  
**Project:** Ruhvi E-commerce (Next.js 15 App Router, Supabase, Firebase)

---

## 1. External Services & Technical Integrations (তৃতীয় পক্ষীয় পরিষেবা ও ইন্টিগ্রেশন)

| Tool / Service | Category | Purpose / Role in Project | Status | Primary Config / Implementation Files |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js 15** | Framework | Full-stack React App Router framework handling SSR, SSG, Server Actions, and API routes. | Active | `package.json`, `next.config.js` |
| **Supabase** | Database & Storage | Primary PostgreSQL database source of truth, RLS policies, site asset storage, Supabase Realtime subscriptions, and Disaster Recovery Runbook (`docs/DATABASE_BACKUP_AND_DISASTER_RECOVERY_RUNBOOK.md`). | Active | `src/lib/supabase/*`, `supabase/migrations/*`, `docs/DATABASE_BACKUP_AND_DISASTER_RECOVERY_RUNBOOK.md` |
| **Firebase Auth** | Authentication | Centralized authentication system (Email/Password, Phone OTP, Google OAuth, Facebook Login) coupled with custom Supabase JWT creation. | Active | `src/lib/firebase.ts`, `src/services/authService.ts` |
| **Firebase Cloud Messaging (FCM)** | Push Notifications | Dedicated push notification service used for transactional order updates and marketing broadcasts (OneSignal fully removed). | Active | `src/lib/fcm-admin.ts`, `src/app/api/admin/notifications/route.ts` |
| **Google Identity Toolkit REST API** | Auth Infrastructure | Lightweight REST API migration bypassing heavy `firebase-admin` SDK to prevent ESM bundler conflicts on Vercel Serverless. | Active | `src/lib/firebase-admin.ts` |
| **Cloudinary (Main)** | Image Optimization | Main cloud storage and optimization pipeline for product catalog images and support attachments. | Active | `src/services/cloudinaryService.ts` |
| **Cloudinary (RuhChat Dedicated)** | Media Storage | Dedicated Cloudinary account specifically allocated for RuhChat staff messenger attachments and marketing video flow. Configured fail-closed via environment variables (`CHAT_CLOUDINARY_*`) with zero hardcoded secret fallbacks. | Active | `src/app/api/internal-chat/upload/route.ts`, `src/lib/ai/co-founder/workers/marketing/cloudinary-service.ts` |
| **Cloudinary Audio Voice Notes & 45-Day Lifecycle Purge Engine** | Audio Retention & Storage | WhatsApp-style in-chat voice note upload pipeline (`ruhvi/chat_voice_notes`) with strict 45-day retention policy. Automated daily cron job (`/api/cron/cleanup-voice-notes`) systematically purges assets older than 45 days via Cloudinary API and updates database state with graceful frontend expired state handling. | Active | `src/lib/chat/cloudinary-audio.ts`, `src/app/api/cron/cleanup-voice-notes/route.ts` |
| **Resend** | Transactional Email | Core delivery engine for all transactional and transactional system emails (orders, reset links, OTPs). | Active | `src/lib/resend.ts` |
| **Brevo** | Email Marketing | Email marketing platform used for automated cron campaigns, newsletters, and abandoned cart emails. | Active | `src/lib/brevo.ts`, `src/lib/brevo/mcp.ts` |
| **Zoho Mail** | Business Email | Official custom domain mailboxes (`support@ruhvi.in` for customer tickets/helpdesk and `admin@ruhvi.in` for third-party platform registrations & administrative accounts). | Active | Cloudflare MX (`mx.zoho.in`) |
| **EspoCRM** | Customer CRM | Self-hosted CRM instance (`crm.support.ruhvi.in`) running on VPS for support staff ticket lifecycle management and customer context sync. | Active | `src/lib/espo/*`, `src/app/api/integrations/espo/*` |
| **PostHog** | Product Analytics | Full product analytics, user funnel tracking, heatmaps, and session replay recording. Configured with strict PII minimization (identifies by UID and role only; customer emails and names strictly excluded; DNT respected). | Active | `src/lib/posthog.ts`, `src/services/posthog-analytics.service.ts`, `src/components/PostHogProvider.tsx` |
| **Meta Pixel & Meta CAPI** | Ad Analytics | Browser Meta Pixel and server-side Conversion API (CAPI) for ad performance and event tracking. | Active | `src/app/api/capi/route.ts` |
| **Google Analytics 4 (GA4)** | Web Analytics | E-commerce transaction tracking and overall site traffic monitoring. | Active | `src/lib/gtag.ts`, `src/app/layout.tsx` |
| **Cloudflare Turnstile** | Anti-Bot Security | Bot prevention challenge integrated into checkout and sensitive authentication routes. | Active | `src/app/checkout/page.tsx` |
| **Cloudflare D1 (Serverless SQL)** | Co-Founder Database | Dedicated serverless relational database for AI Co-Founder memory, task runs, reflections, RSI proposals, eval benchmarks, capability gaps, and audit events (`ruhvi-cofounder-prod`, `ruhvi-cofounder-staging`, `ruhvi-cofounder-dev`). Fully migrated with `0001_initial_schema.sql` (24 operational tables) and `0002_artifact_metadata.sql` (`artifacts` table) across all three environments with persistent idempotency. | Active | Cloudflare D1 (APAC) |
| **Cloudflare R2 (Object Storage)** | Artifacts & Backup Storage | High-durability zero-egress object storage (`ruhvi-cofounder-artifacts` in APAC) for research reports, D1 SQL backup exports, and evaluation bundles. Direct authenticated proxy upload/download/delete endpoints in Worker with SHA-256 checksums, 25MB max size limits, and environment namespace isolation (`production/`, `staging/`, `dev/`). | Active | Cloudflare R2 (APAC) |
| **Cloudflare Zero Trust / Access** | API Security & M2M Auth | Machine-to-machine service token authorization (`Ruhvi Co-Founder Service Auth`, Client ID: `8a02808c9062809d43ea3bbd6e4e8348.access`) protecting `cofounder-data.ruhvi.in`. Edge enforces Service Auth policy and Worker cryptographically verifies `Cf-Access-Jwt-Assertion` (validating `iss: https://floral-recipe-5dfd.cloudflareaccess.com`, `aud`, `exp`, and `common_name`). | Active | Cloudflare One / Access |
| **Human-Governed RSI Subsystem** | Self-Improvement & Evolution | 12-phase Recursive Self-Improvement engine (`src/lib/ai/co-founder/rsi/`) providing memory management, self-observation, reflection, capability registry, research engine, gap detection, evaluation lab, and proposal lifecycle. Governed by 8 strict immutable non-negotiable invariants (read-only production, human approval required for code/deployments, sandboxed evaluation). Features tokenized relevance memory ranking, 10-fixture multilingual jewellery domain Golden Evaluation Suite, and automated nightly telemetry reflection cron (`/api/cron/rsi-reflection`). | Active | `src/lib/ai/co-founder/rsi/*`, `src/app/api/cron/rsi-reflection/route.ts` |
| **PhonePe** | Payment Gateway | E-commerce payment gateway supporting standard checkout and 10% Partial-COD pre-payments. | Active | `src/app/api/checkout/phonepe`, `src/lib/orders/finalize-phonepe-order.ts` |
| **Paytm Payment Gateway** | Payment Gateway | Alternative backup payment gateway configured for online transactions. | Active (Keys Pending) | `src/lib/payments/paytm.ts`, `src/app/api/checkout/paytm` |
| **Shiprocket** | Logistics & Shipping | Automated courier allocation, shipping label generation, and order tracking status sync. | Active | `src/lib/shiprocket.ts`, `src/app/api/admin/shiprocket/create-order` |
| **DeepSeek AI** | AI LLM Engine | DeepSeek LLM models (`deepseek-reasoner` [R1] for complex reasoning tasks, `deepseek-chat` [V3] for conversational) configured with working API key as the automatic tertiary failover tier in the multi-credential routing engine if all Gemini accounts encounter rate limits, 503 high demand spikes, or outages. | Active | `src/lib/ai/providers/deepseek.ts`, `src/lib/ai/index.ts` |
| **Google Gemini & Imagen 3** | AI Multimodal & Image Generation | Google Gemini configured as **Primary Priority 1** across all features: `gemini-3.5-flash` for deep reasoning (`product_description`, `co_founder`, `support_reply`), `gemini-3.5-flash-lite` for ultra-fast customer chatbot / SEO, and `gemini-3.5-transcribe` for accurate multilingual speech-to-text dictation (Bengali, Hindi, Indian English). Powered by encrypted multi-credential rotation (Primary Account 1 -> Secondary Account 2 backup) before escalating to DeepSeek. Imagen 3 powers studio photography. | Active | `src/lib/ai/credentials.ts`, `src/lib/ai/index.ts`, `src/lib/ai/transcribe-service.ts`, `src/lib/ai/co-founder/studio-photography.ts` |
| **OpenTelemetry (OTel)** | Distributed Tracing | Server-side trace telemetry export pipeline configurable via `OTEL_EXPORTER_OTLP_ENDPOINT` (with optional headers). Gracefully skips in serverless production when unconfigured, with optional dev-only Jaeger fallback (`ENABLE_LOCAL_OTEL=true`). | Active | `src/instrumentation-otel.ts` |
| **Vercel Hosting & Speed Insights**| Hosting & CWV | Production deployment platform and real-time Core Web Vitals performance analytics. | Active | `src/app/layout.tsx` |
| **Sentry** | Observability | Application performance monitoring, client/server error tracking with PII scrubbing, 10% production trace sampling guard (configurable via `SENTRY_TRACES_SAMPLE_RATE`), MCP server instrumentation, and security-hardened v10.78.0 patch (mitigating tunnel middleware bypass advisory GHSA-mchm-gjx6-7h55). | Active | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| **n8n Workflow Engine** | Automation Engine | Self-hosted workflow automation engine (`n8n.ruhvi.in`) driving AI blog draft generation and background tasks. | Active | `src/app/api/operations/blog/generate-draft/route.ts` |
| **Motion (Framer Motion)** | UI Animation | Hardware-accelerated 60fps animations, layout transitions, and micro-interactions for Live Worker Workspace. | Active | `src/components/co-founder/workspace/LiveWorkspace.tsx` |
| **Expo Camera** | Mobile Scanning | High-performance native barcode scanning library powering the mobile Inventory Scan & Add workflow. | Active | `ruhvi-mobile_DO_NOT_DELETE/package.json`, `ruhvi-mobile_DO_NOT_DELETE/src/screens/InventoryScanScreen.tsx` |
| **JsBarcode** | Barcode Generation | Industry-standard vector SVG barcode encoding engine powering A4 sheet and thermal roll barcode printing. | Active | `package.json`, `src/app/operations/inventory/barcode/page.tsx` |
| **QRCode** | QR Code Generation | Zero-cloud offline QR code generation engine powering Google Authenticator TOTP 2FA enrollment. | Active | `package.json`, `src/app/api/auth/mfa/setup/route.ts` |
| **otplib (RFC 6238 TOTP)** | Two-Factor Authentication (2FA) | Cryptographic TOTP token generation, HMAC-SHA1 validation, master emergency email fallback, and backup code hashing for backend staff logins. | Active | `src/lib/auth/totp.ts`, `src/app/api/auth/mfa/*` |
| **jsPDF** | PDF Generation | High-performance client & server vector PDF document generator with auto-table styling for GST Rule 46 Invoices, Bill of Supply, and Bespoke Quotation downloads (replaces `@react-pdf/renderer`). | Active | `src/lib/accounts/pdf/InvoicePDF.ts`, `src/components/accounts/PdfDownloadButton.tsx` |
| **Playwright & axe-core** | E2E & Accessibility Testing | Automated browser testing suite for storefront smoke flows, login, navigation, and automated WCAG 2.1 AA accessibility auditing. | Active | `playwright.config.ts`, `tests/e2e/smoke.spec.ts` |
| **Ruhvi PWA Engine** | Client PWA & Offline Engine | Complete Progressive Web App layer (public/site.webmanifest, public/sw.js, public/offline.html, and PwaInstallPrompt.tsx) delivering zero-friction home screen installation, network-first navigation with offline fallback, and static asset caching across Android & iOS devices. | Active | public/site.webmanifest, public/sw.js, src/components/pwa/* |
| **Get Shit Done (GSD) Workflow Engine** | Autonomous AI Spec & Context Engineering | Official GSD framework core (`@opengsd/gsd-core` v1.20.1) enforcing strict 3-state execution cycles (Plan -> Execute -> Verify), automated context-rot mitigation rolling summaries (`GSD_CONTEXT.md`), dedicated planning folders (`.gsd/`, `plans/`, `tasks/`), and automated verification test runner gates (`gsd_runner.ps1`, `gsd_runner.sh`). | Active | `@opengsd/gsd-core`, `.gsd/config.json`, `.gsd/state.json`, `GSD_PLAN.md`, `GSD_CONTEXT.md`, `scripts/gsd-engine.mjs`, `gsd_runner.ps1`, `gsd_runner.sh` |

---

## 2. DNS Infrastructure & Domain Architecture (ডোমেন ও সাব-ডোমেন ম্যাপিং)

**Authoritative Name Servers:** `mariah.ns.cloudflare.com`, `newt.ns.cloudflare.com` (Managed via Cloudflare DNS)

### A. Web Portals & Web App Subdomains

| Domain / Subdomain | Target / IP / Proxy | Purpose / Application Function |
| :--- | :--- | :--- |
| **`ruhvi.in`** | `216.198.79.1` (Direct A Record) | **Main Customer Storefront**: Primary e-commerce website for customers to browse catalog, cart, and checkout. |
| **`www.ruhvi.in`** | `ruhvi.in` (CNAME) | **Storefront Redirect Alias**: Standard `www` alias pointing to the root storefront. |
| **`accounts.ruhvi.in`** | Vercel (`cname.vercel-dns.com`) | **Accounts & GST Billing Portal**: Official GST Rule 46 Tax Invoicing, Bill of Supply, Bespoke Quotation & Price Estimate Builder, Direct Client-Side PDF Downloads (`jsPDF`), GSTR-1 & GSTR-3B filing, GSTR-2B ITC reconciliation, NIC E-Way Bill JSON generation, AI Paper Bill OCR Scanner, Jewellery Manufacturing BOM & Karigar Loss Tracking, Recurring Invoices (Swarna Nidhi plans), Rule 52 Payment Vouchers with WhatsApp Dispatch, Income Tax / Sec 44AD Advance Tax Estimator, and CA Tally/Excel Backup & Export Center. Integrated into AI Co-Founder system tools and knowledge base. |
| **`admin.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **Super Admin Panel**: Master administrative portal for platform settings, audit logs, staff productivity, and system configurations. |
| **`co-founder.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **AI Co-Founder Workspace**: Workspace for AI agent collaboration, business intelligence tools, and competitive analysis. |
| **`marketing.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **Marketing Portal**: Campaign hub for Meta/Google Ads tracking, ROAS analysis, and email broadcast dispatches. |
| **`operation.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **Operations & Inventory Portal**: Product catalog management, SKU generation, inventory adjustments, and CMS/blog post management. |
| **`orders.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **Orders & Logistics Portal**: Order processing dashboard, Shiprocket courier dispatch, status updates, and SLA alert center. |
| **`support.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **Customer Support Portal**: Customer-facing support ticket tracking and Gia AI concierge interface. |
| **`tech.ruhvi.in`** | Vercel (`0edb5b...vercel-dns-017.com`) | **Developer & Tech Portal**: API key management (n8n/external services), system diagnostics, and developer documentation. |
| **`crm.support.ruhvi.in`** | `34.28.51.59` (GCP/VPS Direct A) | **EspoCRM Agent Console**: Self-hosted backend CRM dashboard for internal support agents to resolve tickets with live Supabase context. |

### B. Tunneling, Server APIs & Automation

| Subdomain | Target / Connection | Purpose / Role |
| :--- | :--- | :--- |
| **`ai.ruhvi.in`** | Cloudflare Argo Tunnel (`66370576...cfargotunnel.com`) | Secure Cloudflare tunnel routing external API requests to internal AI model microservices/endpoints. |
| **`n8n.ruhvi.in`** | Cloudflare Argo Tunnel (`66370576...cfargotunnel.com`) | Cloudflare tunnel routing webhooks to the self-hosted n8n workflow engine (e.g., automated blog generation). |
| **`cofounder-data.ruhvi.in`** | Cloudflare Access (`cofounder-data`) + Worker Domain | Dedicated Co-Founder Data API origin protected by Cloudflare Access Service Token authentication, routing to `ruhvi-cofounder-data-api` Worker, D1 and R2. |

### C. Email Authentication, Sending & Security (DKIM, SPF, DMARC, MX)

| Record / Hostname | Type | Service / Provider | Purpose |
| :--- | :--- | :--- | :--- |
| `ruhvi.in` | MX | **Zoho Mail** (`mx.zoho.in`) | Primary business inbox hosting (`support@ruhvi.in` for customer helpdesk/tickets & `admin@ruhvi.in` for multi-platform registrations/third-party accounts). |
| `send.ruhvi.in` | MX & TXT | **Amazon SES** (`amazonses.com`) | AWS SES email sending subdomain and SPF policy configuration. |
| `zmail._domainkey.ruhvi.in` | TXT | **Zoho Mail DKIM** | Cryptographic DKIM key verifying authenticity of emails sent from Zoho inboxes (`support@ruhvi.in` and `admin@ruhvi.in`). |
| `resend._domainkey.ruhvi.in` | TXT | **Resend DKIM** | Cryptographic DKIM signature enabling high-deliverability transactional emails from Resend. |
| `brevo1._domainkey` & `brevo2._domainkey` | CNAME | **Brevo DKIM** | Dual DKIM key CNAME records authenticating marketing email campaigns sent via Brevo. |
| `noreply.ruhvi.in` / `img.noreply` / `r.noreply` | CNAME | **Brevo Custom Sending Subdomains** | Custom brand domain wrappers for Brevo email headers, tracking links, and embedded campaign images. |
| `firebase1._domainkey` & `firebase2._domainkey` | CNAME | **Firebase Mail DKIM** | DKIM keys authenticating Firebase Auth system emails (verification/OTP fallback). |
| `_dmarc.ruhvi.in` | TXT | **DMARC Security Policy** | Enforces DMARC compliance and sends email deliverability audit reports to Brevo (`rua=mailto:rua@dmarc.brevo.com`). |
| `ruhvi.in` (SPF TXT) | TXT | **Unified SPF Policy** | Authorizes **Zoho Mail** and **Firebase Mail** (`include:_spf.firebasemail.com include:zohomail.in`) to send emails on behalf of `ruhvi.in`. |
| `ruhvi.in` (Brevo Code TXT) | TXT | **Brevo Verification** | Domain ownership validation key for Brevo account verification. |

---

## 3. MCP (Model Context Protocol) Servers

| Server Name | Usage / Purpose | Config Location / Endpoint |
| :--- | :--- | :--- |
| **Ruhvi Internal MCP Server** | Exposes 16 custom tools (11 read-only, 5 write) over SSE/HTTP for AI Assistants to query DB, manage orders, and check inventory. | `src/app/api/mcp/route.ts`, `src/lib/ai/mcp-tools.ts` |
| **Brevo MCP Client** | Direct integration using `@modelcontextprotocol/sdk` to fetch marketing contacts and campaign stats for AI tool invocation. | `src/lib/brevo/mcp.ts` |
| **firebase-mcp-server** | Manages Firebase projects, security rules, environment configs, and app deployments. | `.gemini/antigravity-ide/mcp/firebase-mcp-server` |
| **chrome-devtools-mcp** | Automates headless browser testing, page inspection, accessibility audits, and network request monitoring. | `.gemini/antigravity-ide/mcp/chrome-devtools-mcp` |
| **sentry** | Sentry MCP server integration (`@sentry/mcp-server`) scoped to `ruhvi-jewels/javascript-nextjs` for inspecting errors & stack traces. | `.agents/mcp_config.json` |
| **Meta Ads MCP Server** | Direct first-party Meta remote MCP server for AI Co-Founder live ROAS analytics, ad set management, and draft creative uploads under App ID `1516695129765369`. | `https://mcp.facebook.com/ads`, `.env.local` |
| **Cloudflare MCP Server** | Official Cloudflare remote MCP server (Code Mode) providing AI assistants direct access to documentation, OpenAPI specs, and dynamic execution tools for managing DNS (`ruhvi.in`), Argo Tunnels (`ai.ruhvi.in`, `n8n.ruhvi.in`), and Workers across account `73012e9170b1c74522222d12694ee063`. | `https://mcp.cloudflare.com/mcp`, `.agents/mcp_config.json`, `.cursor/mcp.json`, `.env.local` |

---

## 4. Registered Skills (এআই এজেন্ট দক্ষতা)

### A. Local Workspace Skills (.agents/skills/)
1. **ai-ui-ux-motion-engine**: Minimalist 3D particle simulations, Grok-inspired dynamic dot matrix avatar bodies, and reactive spatial animations.
2. **api-and-interface-design**: Standards for stable REST/GraphQL endpoint creation, type contracts, and module boundaries.
3. **banner-design**: Social media, advertising, print, and web hero banner generation with AI visual direction.
4. **brand**: Brand voice, visual identity, tone guidelines, and marketing asset compliance.
5. **code-review-and-quality**: Multi-axis code reviews (correctness, architecture, security, performance) integrated with **code-simplification principles** (behavior preservation, clarity over cleverness, over-simplification avoidance).
6. **debugging-and-error-recovery**: Systematic root-cause debugging workflows for broken builds, runtime errors, and test failures.
7. **frontend-ui-engineering**: Production-grade, accessible (WCAG compliant), responsive UI engineering integrated with **anti-slop UI craft floor rules** (layout animation bans, explicit transitions, instant focus-visible, prefers-reduced-motion).
8. **gia-human-conversation**: Humanized customer support and jewellery shopping conversations for GIA (Golden Concierge) across English, Bengali, Banglish, and Hindi; enriched with **anti-AI writing guardrails** (eliminating synthetic staging, dramatic one-line closers, and forced triads).
9. **performance-optimization**: Cross-stack performance optimization (Core Web Vitals, N+1 DB queries, JS payload reductions).
10. **planning-and-task-breakdown**: Structured task breakdown, scope estimation, and ordering for complex feature implementations.
11. **playwright**: End-to-End (E2E) test suite authoring, execution, and browser automation debugging for Project Ruhvi.
12. **ruhvi-product-photography**: Luxury jewelry commercial product photography generation protocol strictly preserving exact product design, stone settings, and metal geometry.
13. **scrapling-official**: Adaptive web crawling and intelligence scraping with HTTP, stealth browser rendering, and dynamic page parsing for Worker 5 (Competitor AI).
14. **security-and-hardening**: Code hardening against OWASP vulnerabilities, safe input handling, auth security, and dependency auditing.
15. **slides**: Strategic HTML presentations, pitch decks, and executive reporting with Chart.js.
16. **ui-styling**: Production UI styling with shadcn/ui and Tailwind CSS; integrated with **Three-Layer Token Architecture** (Primitive → Semantic → Component) and comprehensive component state specifications.
17. **ui-ux-pro-max**: Comprehensive UI/UX design intelligence layer (79 searchable UI styles, 192 product palettes & reasoning rules, 74 font pairings, 119 UX guidelines, 22 stack presets including Next.js/React/Tailwind) powered by local zero-latency BM25 search (scripts/search.py). Allocated for UI/UX engineering across administrative and operational subdomains with strict zero-alteration isolation on the main customer storefront.
18. **understand (Knowledge Graph Suite)**: Codebase comprehension and knowledge graph suite consisting of 9 dedicated sub-skills:
    - understand-chat: Direct Q&A on codebase structure using graph metadata.
    - understand-dashboard: Interactive web visualizer for system architecture.
    - understand-diff: Git diff and pull request dependency analysis.
    - understand-domain: Business domain flow extraction and mapping.
    - understand-explain: Deep-dive explanation of specific modules/functions.
    - understand-figma: Figma design file parsing into design tokens/components.
    - understand-knowledge: LLM wiki & topic cluster graph generation.
    - understand-onboard: Interactive developer onboarding document creation.

> **Consolidation Audit Log (2026-11-04):** Redundant, orphaned, and overlapping workspace skills (code-simplification, humanizer, hallmark, design, design-system, security-audit) were audited and safely removed after migrating all critical rules, token architectures, and anti-AI guidelines directly into their respective active parent skills (code-review-and-quality, gia-human-conversation, rontend-ui-engineering, and ui-styling).

### B. Global Builtin & Installed Plugin Skills
1. **agy-customizations**: Reference guide for configuring AGY skills, rules, plugins, hooks, and MCP servers.
2. **antigravity-guide**: Guide and cheat sheet for using Google Antigravity (AGY) CLI and IDE features.
3. **android-cli**: Orchestration for Android project builds, deployments, SDK management, and device diagnostics.
4. **chrome-devtools**: Browser automation, network profiling, and live DOM debugging via DevTools MCP.
5. **a11y-debugging**: Web accessibility (a11y) auditing focusing on ARIA tags, semantic HTML, and contrast standards.
6. **debug-optimize-lcp**: Specialized debugging workflows for Largest Contentful Paint (LCP) performance optimizations.
7. **memory-leak-debugging**: Memory leak analysis and heapsnapshot diagnostics for JavaScript/Node.js runtimes.
8. **modern-web-guidance**: Search tool for modern HTML/CSS/JS web APIs, View Transitions, and container queries.
9. **chrome-extensions**: Manifest V3 browser extension development and Chrome Web Store publishing workflows.
10. **google-antigravity-sdk**: SDK guide for designing, implementations, and debugging autonomous AI multi-agent systems.

---

## 5. Security Architecture & Hardening Baseline (নিরাপত্তা ও হার্ডেনিং নীতিমালা)

Consolidated authoritative record of security assessments, surface hardening, and vulnerability resolutions:

| Subsystem / Surface | Policy / Implemented Hardening | Key Config / Implementation File |
| :--- | :--- | :--- |
| **Fail-Closed Session JWT** | Eliminated fallback JWT signing keys. `verifySessionToken` strictly requires `process.env.SUPABASE_JWT_SECRET`. If undefined, verification immediately fails closed (`return null`). | `src/lib/auth/verify-session.ts` |
| **Meta CAPI Security** | Enforced origin/CSRF verification (`403 Forbidden` for untrusted origins), sliding-window rate limiting (60 req/min per IP via `cf-connecting-ip`/`x-real-ip`), and payload schema validation. | `src/app/api/capi/route.ts` |
| **Content Security Policy (CSP)** | Enforces HTTPS script loading, `form-action 'self'`, `upgrade-insecure-requests;`, `frame-ancestors 'none'`, and explicit `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.google.com https://www.facebook.com;` to support Firebase Auth & social logins. | `src/middleware.ts` |
| **Subdomain Host Isolation** | Dynamic `x-ruhvi-host` routing enforcing strict portal boundaries. Non-storefront administrative and portal subdomains automatically receive `X-Robots-Tag: noindex, nofollow` to prevent search indexing. | `src/middleware.ts` |
| **Turnstile Anti-Bot** | Cloudflare Turnstile token validation active on checkout and sensitive authentication routes to eliminate bot spam. | `src/app/checkout/page.tsx` |
| **Credential Encryption** | AES-256-GCM symmetric encryption for external worker API keys stored in PostgreSQL. | `src/lib/ai/co-founder/credential-crypto.ts` |
| **Staff & Super Admin 2FA (TOTP)** | Self-hosted RFC 6238 TOTP two-factor authentication for all portal subdomains. Secrets AES-256-GCM encrypted at rest. Single-use hashed backup codes. Fail-closed edge middleware verification requiring `mfa_verified: true`. Emergency email recovery locked strictly to `subhasdas1996@gmail.com` with double-defense password re-verification. | `src/lib/auth/totp.ts`, `src/middleware.ts`, `src/app/api/auth/mfa/*` |

---

## 6. Domain Whitelist & Provider Integration Registry (ডোমেন হোয়াইটলিস্টিং রেজিস্ট্রি)

Permanent registry of authorized domains, origins, and callback webhooks across all integrated third-party platforms for `ruhvi.in`:

| Platform | Navigation / Settings Location | Whitelisted Values / Callbacks |
| :--- | :--- | :--- |
| **Firebase Auth** | Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains | `ruhvi.in`, `www.ruhvi.in` |
| **Google Cloud OAuth** | Google Cloud Console ➔ APIs & Services ➔ Credentials ➔ OAuth 2.0 Web Client | Authorized JS Origins: `https://ruhvi.in`, `https://www.ruhvi.in`<br>Authorized Redirect URIs: `https://ruhvi-f707c.firebaseapp.com/__/auth/handler` |
| **Meta Developers** | Facebook App Dashboard ➔ App Settings ➔ Basic | App Domains: `ruhvi.in`<br>Site URL: `https://ruhvi.in`<br>Privacy Policy: `https://ruhvi.in/privacy-policy`<br>Data Deletion: `https://ruhvi.in/data-deletion` |
| **Cloudflare Turnstile** | Cloudflare Dashboard ➔ Turnstile ➔ Manage Widget Settings | Widget Domains: `ruhvi.in`, `www.ruhvi.in` |
| **PhonePe Merchant** | PhonePe Merchant Portal ➔ Developer Settings | Webhook / Callback URL: `https://ruhvi.in/api/webhooks/phonepe` |
| **Paytm Merchant** | Paytm Merchant Portal ➔ API Keys / Callbacks | Callback URL: `https://ruhvi.in/api/checkout/paytm/callback` |
| **PostHog Analytics** | PostHog Project Settings ➔ Authorized Domains | `https://ruhvi.in`, `https://www.ruhvi.in` |
| **Google Search Console** | Search Console Property Settings | Property: `https://ruhvi.in`<br>Sitemap: `https://ruhvi.in/sitemap.xml` |

---

## 7. Performance Architecture Reference (পারফরম্যান্স নীতিমালা ও স্ট্যান্ডার্ড)

Full optimization details, Core Web Vitals baselines, and verification benchmarks are permanently recorded in [`RUHVI_PERFORMANCE_MASTER_REPORT.md`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/RUHVI_PERFORMANCE_MASTER_REPORT.md):
- **Web Fonts**: Zero external font waterfalls; 5 Google Fonts self-hosted via `next/font/google` (`display: swap`).
- **CDN Preconnect**: Root `<head>` preconnects to `res.cloudinary.com`.
- **SSR Deduplication**: Supabase taxonomy and metadata queries wrapped in React `cache()`.
- **Client Cache**: 5-minute memory cache in `useTaxonomy.ts`.
- **Telemetry**: Sentry/OTel traces sample rate capped at 10% in production across client, server, and edge (configurable via `SENTRY_TRACES_SAMPLE_RATE`).
- **Image Formats**: Automatic AVIF + WebP multi-format conversion via Next.js image optimization.

---

## 8. Scheduled Crons & Background Automation Architecture (ক্রন ও ব্যাকগ্রাউন্ড অটোমেশন আর্কিটেকচার)

To maintain 100% compliance with Vercel's Hobby (Free) tier limits (maximum 1 daily cron) while supporting high-frequency 15-minute AI intelligence scans, Ruhvi uses a hybrid VM + Vercel cron architecture:

| Pipeline | Host / Trigger | Schedule | Endpoints & Tasks Executed |
| :--- | :--- | :--- | :--- |
| **Unified 15-Minute Sync** | VM Crontab (`task-scheduler.mjs`) | `*/15 * * * *` (Every 15 mins) | **Endpoint:** `GET /api/cron/task-scheduler`<br>• **Staff Task Scheduler:** Generates daily/weekly/monthly recurring task instances & sends overdue notifications.<br>• **AI Co-Founder Proactive Health:** Autonomous 15-minute scan of business telemetry, stock depletion alerts, cart drop-off anomalies, and competitor price tracking. |
| **System Self-Audit** | VM Crontab (`self-audit-scheduler.mjs`) | `0 */6 * * *` (Every 6 hours) | **Endpoint:** `GET /api/cron/self-audit`<br>• **19 Read-Only Checks:** Evaluates Supabase, PhonePe, Shiprocket, Sentry, config hygiene, and AI health with 20s budget.<br>• **SHA-256 Deduplication:** Ingests findings into PostgreSQL `self_audit_findings` with auto-resolution. |
| **Proactive Intelligence Analysis** | VM Crontab (`proactive-analysis-scheduler.mjs`) | `30 2 * * *` (Daily 8:00 AM IST) | **Endpoint:** `GET /api/intelligence/proactive-analysis`<br>• **Executive Strategy Synthesis:** Analyzes sales momentum, cancellation rates, and dead-stock capital exposure.<br>• **Unified Action Center Bridge:** Generates prioritized human-in-the-loop recommendations. |
| **Master Daily Automation** | Vercel Cloud Cron (`vercel.json`) | `0 4 * * *` (Daily 9:30 AM IST) | **Endpoint:** `GET /api/cron/automations`<br>• Abandoned Cart Recovery emails (>24h)<br>• Customer Win-Back campaigns (`MISSYOU20`)<br>• Birthday & Anniversary automated offers<br>• Blog scheduled publishing automation<br>• Daily Executive Morning Briefing synthesis |
| **Dedicated Morning Briefing** | Standalone / Idempotent | `30 3 * * *` (9:00 AM IST) | **Endpoint:** `GET /api/cron/co-founder/morning-briefing`<br>• Synthesizes 24h store metrics into spoken Bengali & English executive briefing registered in `co_founder_signals`. |
| **Voice Note 45-Day Cleanup** | VM / Scheduled Cron | `0 3 * * *` (Daily 3:00 AM IST) | **Endpoint:** `GET /api/cron/cleanup-voice-notes`<br>• Identifies internal chat voice notes exceeding the strict 45-day retention lifecycle.<br>• Destroys underlying audio assets on Cloudinary via chat credentials (`resource_type: 'video'`).<br>• Atomically updates database records in `internal_chat_messages` to status = `'expired'` with graceful UI fallback. |

---

## 9. Department AI Co-Workers, RuhChat Dispatch Engine & Anti-Collision System (ডিপার্টমেন্ট এআই ও কলিশন প্রতিরোধ আর্কিটেকচার)

Authoritative architectural record of the department-specific AI Co-Workers, cross-channel proactive alerting pipeline, customer PII masking, and customer calling anti-collision engine:

### A. Dedicated AI Co-Workers & Firewall Access Matrix

| Department / Role | Dedicated AI Persona | Allowed Scopes & Tools | Secrecy Firewall Policy | Primary Implementation Files |
| :--- | :--- | :--- | :--- | :--- |
| **Orders & Logistics** | `Orders AI Worker` (`worker_orders_logistics`) | `get_order_pipeline_status`, `get_delivery_failed_and_rto_orders`, `get_courier_sla_delays`, `get_return_requests_and_reasons`, `get_order_call_remarks`, `add_order_call_remark` | **Strict Financial & PII Secrecy**: Gross sales, revenue values, profit margins, and GMV are strictly excluded from tool registry. Customer phone numbers masked (`+91 98301 ••••82`). | `src/lib/ai/co-founder/workers/worker-13-orders-logistics.ts`, `src/app/api/internal-chat/ai-worker/route.ts` |
| **Customer Support** | `Support AI Worker` | `get_support_tickets`, `get_order_call_remarks`, `add_order_call_remark`, `get_return_requests_and_reasons`, `update_support_ticket_status` | **Strict Financial Secrecy**: No financial turnover access. Empathetic customer triage and dispute resolution only. | `src/app/api/internal-chat/ai-worker/route.ts`, `src/components/chat/FloatingStaffMessenger.tsx` |
| **Operations & Inventory** | `Operations AI Worker` | `get_inventory_levels`, `get_days_of_inventory`, `get_restock_recommendations`, `get_products`, `get_categories` | **Draft Only Rule**: Can recommend restock quantities; adjustments must be confirmed inside Operations Portal. Financial GMV excluded. | `src/app/api/internal-chat/ai-worker/route.ts` |
| **Marketing** | `Marketing AI Worker` | `get_products`, `get_categories`, `get_blog_posts`, `create_blog_post`, `get_offers`, `create_offer`, `audit_catalog_seo_health`, `generate_product_studio_photos`, `scan_reddit_social_sentiment` | **Draft Only Rule**: AI drafts blog posts, offers, and generates promo assets. Staff review and publish live from Marketing portal. Financial GMV excluded. | `src/app/api/internal-chat/ai-worker/route.ts` |
| **Technology** | `Tech AI Worker` | `get_system_health`, `get_sentry_errors`, `get_api_logs`, `check_api_endpoint`, `get_db_connection_pool_stats` | **Infrastructure Only**: Diagnostic tools, Sentry 500 error traces, latency monitoring. Production DB mutations blocked. | `src/app/api/internal-chat/ai-worker/route.ts` |
| **Accounts & Taxation** | `Accounts AI Worker` (`worker_accounts_tax`) | `compute_gstr3b_summary`, `compute_itc_breakdown`, `get_income_tax_advisory`, `get_day_book`, `compute_sku_manufacturing_cogs`, `create_double_entry_voucher`, `record_purchase_bill` | **Mandatory Human Approval**: Direct authority over Indian GST Rule 46 Tax Invoices, GSTR-1 & 3B, Section 17(5) ITC ledgering, double-entry cash book, and Section 44AB/206C audits. Write operations strictly require founder approval token. | `src/lib/ai/co-founder/workers/worker-14-accounts.ts`, `src/app/api/admin/co-founder/workers/accounts/route.ts` |
| **Performance Intelligence** | `Performance Intelligence AI Worker` (`worker_performance_intelligence`) | `get_workforce_events`, `calculate_member_scorecard`, `audit_workforce_quality`, `generate_cofounder_report` | **Zero Paid Dependency**: Continuous measurement, deterministic KPI evaluation, scorecards (0-100), and alerts for 16 AI workers and human staff. Strictly uses rule rubrics and mathematical formulas with zero external billable API dependencies. | `src/lib/ai/co-founder/workers/worker-performance-intelligence.ts`, `src/app/api/admin/co-founder/performance/route.ts`, `src/app/api/cron/workforce-performance-audit/route.ts` |
| **Security Intelligence** | `Security Intelligence AI Worker` (`worker_security_intelligence`) | `get_security_posture`, `analyze_vulnerabilities`, `propose_containment`, `inspect_file_security`, `get_incident_report` | **Zero-Cost Defense-in-Depth**: Autonomous threat detection, vulnerability analysis, CI/CD scan synthesis (Trivy, Semgrep, OSV, Gitleaks, ZAP), zero-cost magic-byte file inspection, Cloudflare Queues event decoupling, and reversible containment (quarantine, rate-limit, temporary IP block) with human-in-the-loop approval gating for destructive actions. | `src/lib/ai/co-founder/workers/worker-security-intelligence.ts`, `src/lib/security/file-inspector.ts`, `cloudflare/cofounder-data-api/src/security.ts` |
| **Founder / Executive** | `AI Co-Founder` | Full executive suite (`getHolisticBusinessContext`, `getRevenueMetrics`, `getProfitMargins`, `getExecutiveSignals`, competitive intelligence) | **Admin Only**: Exclusively accessible by Super Admin / Founder. Never accessible to department staff. | `src/lib/ai/co-founder/brain.ts`, `src/app/api/admin/co-founder/chat/route.ts` |

### B. Universal Proactive Dispatch Engine (`/api/internal-chat/proactive-dispatch`)

Autonomous real-time event dispatcher broadcasting markdown alert cards into department channels within RuhChat (`internal_chat_conversations`):

| Department Channel | Channel Name | Trigger Events | Safety & Payload Guard |
| :--- | :--- | :--- | :--- |
| **Orders & Logistics** | `📦 Orders & Logistics Alerts` | • Courier delivery failure (`DELIVERY_FAILED`)<br>• RTO initiated by courier (`RTO_INITIATED`) | Customer phone numbers automatically masked (`maskPhoneNumber`). Deep links directly to `/portal-orders/[id]`. |
| **Customer Support** | `🎧 Customer Support Alerts` | • New return request submitted (`RETURN_REQUESTED`) with customer reason (size, defect, delay) | Customer name masked (`maskCustomerName`). Embedded links to ticket and return claim views. |
| **Operations & Catalog** | `⚙️ Operations Alerts` | • Critical low-stock warning (stock $\le 2$ units on active SKUs)<br>• Stockout risk | Displays SKU, current inventory, threshold, and link to reorder supplier flow. |
| **Technology** | `💻 Tech Alerts` | • Sentry 500 error spikes<br>• 404 page-not-found spikes<br>• High server latency (> 2500ms) | Truncated error snippets, affected route, Sentry issue link. |
| **Marketing** | `📣 Marketing Alerts` | • Flash sale / campaign triggers<br>• Campaign performance milestones | Promo asset preview and direct link to `/marketing`. |

### C. Anti-Collision Call Center & Customer Activity Engine

To eliminate customer annoyance caused by multiple staff members dialing the same phone number following delivery failures or RTOs:
- **Authoritative Database Table**: `public.order_call_remarks` (`0114_order_call_remarks.sql`) storing `order_id`, `staff_id`, `staff_name`, `department`, `call_status`, `remark_text`, and `rescheduled_date`.
- **API Endpoint**: `/api/portal-orders/call-remarks` (GET for history & active call collision check, POST with collision guard returning `409 Conflict` if another teammate initiated a call within the 20-minute window).
- **Interactive UI Components**: `OrderCallRemarksPanel.tsx` & `OrderCallRemarksModal.tsx` embedded in order details and all-orders table.
- **Zero-Dangling-Promise Guard**: `DANGLING_PROMISE_REGEX` in `src/lib/ai/co-founder/orchestrator.ts` automatically intercepts unfulfilled promise phrases (e.g., "আমি চেক করে জানাচ্ছি...") and forces automated iterative tool continuation to guarantee complete, data-backed answers.

---
## 10. Portal Two-Factor Authentication (RFC 6238 TOTP) Architecture & Role-Gated Recovery

Comprehensive architectural specification of internal portal authentication security, mandatory first-login enrollment, and strict role-gated recovery controls:

### A. Core Cryptography & MFA Verification Pipeline
- **Algorithm**: RFC 6238 Time-based One-Time Password (TOTP) utilizing HMAC-SHA1 with 30-second time steps and 6-digit numeric codes. Includes $\pm 30$ second window tolerance for clock drift.
- **Zero-Cloud Secrets & QR Code**: TOTP secrets are generated using native Node.js `crypto.randomBytes(20)` base32 encoded, encrypted via AES-256-GCM prior to persisting in `public.users.totp_secret`. QR codes are rendered strictly in-memory into Data URLs via `qrcode`, eliminating third-party cloud leaks.
- **Session Elevation**: Successful 2FA verification mints the elevated `__session` JWT with claim `mfa_verified: true`, granting entry past internal route RBAC guards.

### B. Strict Role-Gated Recovery & Backup Code Matrix

| User Role | 2FA Setup Requirement | Backup Recovery Codes | Emergency Recovery Email | Device Loss Recovery Procedure |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrators** (`super_admin`, `admin`, `subhasdas1996@gmail.com`) | Mandatory | **8 Single-Use Codes** (Hashed with SHA-256 in DB, consumed atomically). | **Enabled** (Dispatches signed single-use link strictly locked to master email). | Self-service using 8 backup recovery codes or master emergency recovery email. |
| **Staff & Department Operators** (`staff`, `manager`, `operations`, etc.) | Mandatory upon first login | **Disabled** (No backup codes generated or displayed; redirects directly to portal). | **Forbidden** (API returns `403 Forbidden` with admin contact prompt). | Contact System Administrator. Admin clicks **"Reset 2FA"** inside Admin User Management (`/admin/users`), invoking `resetUserMfa` Server Action and logging to `audit_logs`. |

---
## 11. Social & Community Sentiment Intelligence Engine (Reddit Worker Engine)

Authoritative architectural record of the real-time social listening and competitor sentiment pipeline powering Ruhvi's internal AI Workers:

### A. Engine Architecture & Zero-Auth Footprint
- **Native Implementation**: [`src/lib/ai/social/reddit.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/social/reddit.ts).
- **Zero-Credential / Anti-Ban Architecture**: Utilizes public Subreddit XML/Atom feed endpoints (`/r/IndianFashionAddicts.rss`, `/r/Jewelry.rss`, `/r/indiasocial.rss`). Does not require Reddit developer credentials, OAuth tokens, API app keys, or browser session cookies.
- **In-Memory TTL Cache**: 5-minute in-memory caching (`CACHE_TTL_MS = 5 * 60 * 1000`) prevents repeated network requests and strictly respects Reddit's public endpoint limits.
- **Fail-Safe Resilience**: Returns gracefully structured empty or fallback datasets on any network failure or DNS disconnect without throwing or blocking worker execution.

### B. Worker Access Matrix & Capabilities
- **Worker 5 (`Competitor Research Worker`)**: Detects competitor grievances across D2C brands (Giva, Palmonas, Mia by Tanishq, Shaya) including tarnishing complaints, fading gold plating, and customer service delays. Auto-synthesizes these into Ruhvi competitive advantages (e.g., our 18K gold anti-tarnish warranty and authentic 925 sterling silver hallmarking).
- **Worker 2 / Marketing AI Worker (`scan_reddit_social_sentiment`)**: Scans trending jewelry topics, price point conversations (₹1,000–₹3,000 everyday wear), and gifting recommendations to generate high-converting blog posts and marketing angles.
- **AI Co-Founder Brain (`scan_reddit_social_sentiment`)**: Available to executive queries for real-time customer sentiment validation on pricing and market trends.

---

## 12. Shared Intelligence Layer, Business Radar, Action Center, Customer 360, QA Guardian, Decision Simulator & Self-Auditing Architecture (Master Roadmap Tracks B–J)

Authoritative architectural record of the modular intelligence layer, deterministic metrics calculation, human-supervised action center, offline simulation sandbox, automated QA journey testing, and scheduled self-audit engine implemented under the Master Phased Roadmap (v1.0):

### A. Shared Intelligence Layer & Event Pipeline (Track B)
- **Canonical Event Contract**: [`src/lib/intelligence/event-contract.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/event-contract.ts). Standardizes `CanonicalBusinessEvent` across orders, payments, inventory, shopping funnels, support tickets, and operational health with strict Zod validation, schema versioning (`schemaVersion: 1`), and PII exclusion.
- **Idempotent Event Ingestion**: [`src/lib/intelligence/idempotent-processor.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/idempotent-processor.ts). Deduplicates events via fast-path in-memory LRU sliding window and persistent PostgreSQL metadata checks with bounded retries and exponential backoff.
- **Event Producers**: [`src/lib/intelligence/order-lifecycle.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/order-lifecycle.ts), [`src/lib/intelligence/payment-events.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/payment-events.ts), [`src/lib/intelligence/inventory-events.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/inventory-events.ts), [`src/lib/intelligence/storefront-events.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/storefront-events.ts), [`src/lib/intelligence/support-events.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/support-events.ts), and [`src/lib/intelligence/ai-health-events.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/ai-health-events.ts).

### B. Business Radar & Deterministic Metrics Engine (Track C)
- **Deterministic Metrics Service**: [`src/lib/intelligence/metrics-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/metrics-service.ts). Authoritative calculation for Gross Sales, AOV, Net Revenue, Cancellation Rate, Payment Failure Rate, and Stockout Rate across configurable IST time windows (Today, Last 7 Days, Month-to-Date, Year-to-Date) with 5-minute caching.
- **Business Radar Aggregation**: [`src/lib/intelligence/radar-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/radar-service.ts) and [`src/app/admin/business-radar/page.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/admin/business-radar/page.tsx). Synthesizes operational severity against documented thresholds with role-based filtering (frontline staff restricted from financial turnover).
- **Statistical Anomaly Detection**: [`src/lib/intelligence/anomaly-detector.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/anomaly-detector.ts) and [`src/lib/intelligence/anomaly-lifecycle.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/anomaly-lifecycle.ts). Evaluates metric breaches using IQR/z-score statistical models with automatic resolution upon return to normal baselines.

### C. Unified Action Center & Cryptographic Approval Policy (Tracks D & E)
- **Unified Action Item Contract**: [`src/lib/intelligence/action-contract.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/action-contract.ts). Standardizes anomalies, AI recommendations, system alerts, and self-audit findings into an actionable dashboard ([`src/app/admin/action-center/page.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/admin/action-center/page.tsx)).
- **Cryptographic Approval Policy**: [`src/lib/intelligence/approval-policy.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/approval-policy.ts). Enforces human-in-the-loop attribution (`actorType === 'human'`), multi-tier role requirements (`staff`, `manager`, `admin`, `super_admin`), and canonical SHA-256 payload integrity hashing (`computeActionPayloadHash`) to prevent parameter tampering.
- **Narrowly Allowlisted Action Executor**: [`src/lib/intelligence/action-executor.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/action-executor.ts). Restricts automated execution strictly to low-risk inventory safety buffer adjustments (`update_inventory_safety_buffer`) with pre-execution eligibility recheck, dry-run simulation support, and authoritative PostgreSQL readback verification.

### D. Customer 360 & Privacy-Safe Identity Resolution (Track F)
- **Identity Resolution**: [`src/lib/intelligence/customer-identity-resolution.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/customer-identity-resolution.ts). Deterministic 4-level matching precedence (Internal UUID > Verified Auth UID > Verified Email/Phone > Verified Transaction Order) with anti-auto-merge guards against ambiguous contacts and shipping recipients.
- **Privacy & Compliance**: DPDP-compliant Right-to-Erasure anonymization while maintaining pseudonymized records for tax statutory ledgers. Mandatory PII masking for operational staff (`maskCustomerProfilePii`).
- **Portal View**: [`src/app/admin/customer-360/page.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/admin/customer-360/page.tsx) with customer timeline, lifetime value, and support history.

### E. Predictive Inventory & Dead Stock Intelligence (Track G)
- **Velocity Demand Estimation**: [`src/lib/intelligence/inventory-demand-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/inventory-demand-service.ts). Computes daily run-rate, days of inventory remaining (DOI), and historical sales momentum.
- **Stockout Risk Forecasting**: [`src/lib/intelligence/stockout-risk-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/stockout-risk-service.ts). Forecasts critical stockout horizons based on lead times.
- **Dead Stock Analysis**: [`src/lib/intelligence/dead-stock-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/dead-stock-service.ts). Identifies stagnant capital exposure on SKUs with zero sales over 60/90/180 days.
- **Draft Restock Recommendations**: [`src/lib/intelligence/restock-recommendation-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/restock-recommendation-service.ts). Generates advisory reorder plans without auto-submitting purchase orders.

### F. Automated QA Guardian & Critical Regression Journeys (Track H)
- **Critical Regression Registry**: [`src/lib/qa/journey-definitions.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/qa/journey-definitions.ts). Programmatic registry of 14 critical journeys covering guest browse, customer checkout sandbox, COD rules, order status, and staff operations.
- **Health Probes & Synthetic Probing**: [`src/lib/qa/health-probes.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/qa/health-probes.ts) and [`src/lib/qa/synthetic-transaction-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/qa/synthetic-transaction-service.ts). Probes system health with zero live payment or customer communication side effects.
- **Action Center Bridge**: [`src/lib/qa/qa-action-center-bridge.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/qa/qa-action-center-bridge.ts). Surfaces detected probe regressions directly into the Action Center.

### G. AI Decision Simulator Offline Harness (Track I)
- **Sandboxed Simulation Engine**: [`src/lib/intelligence/decision-simulator.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/intelligence/decision-simulator.ts). Deterministic in-memory scenario evaluation for inventory safety buffers, price elasticity, and discount campaigns with zero database mutations.
- **Decision Simulator Interface**: [`src/app/admin/decision-simulator/page.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/admin/decision-simulator/page.tsx) and [`src/app/api/intelligence/simulator/route.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/api/intelligence/simulator/route.ts). Visual scenario comparison tool for business leadership.

### H. Self-Auditing Architecture & Remediation Proposals (Track J)
- **Audit Checks Registry**: [`src/lib/audit/self-audit-registry.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/audit/self-audit-registry.ts). 19 non-destructive checks across architecture, integration, configuration, security, performance, and AI health with bounded timeouts (1s–5s).
- **Scheduled Audit Runner**: [`src/lib/audit/self-audit-runner.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/audit/self-audit-runner.ts). Concurrency bounded to 5, total execution budget capped at 15 seconds, and in-memory ring buffer storing last 50 execution summaries.
- **Findings Persistence**: [`src/lib/audit/self-audit-store.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/audit/self-audit-store.ts) and migration [`supabase/migrations/0117_self_audit_findings.sql`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/supabase/migrations/0117_self_audit_findings.sql). SHA-256 fingerprint deduplication, auto-resolution on healthy check evaluations, and zero plaintext secret storage.
- **Self-Audit UI**: [`src/app/admin/self-audit/page.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/admin/self-audit/page.tsx). Comprehensive admin interface for reviewing run telemetry and active findings.
- **Remediation Proposal Engine**: [`src/lib/audit/self-audit-remediation.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/audit/self-audit-remediation.ts). Generates approval-gated remediation blueprints with hard compile-time safety invariant (`isExecutionBlocked: true`), test/rollback plans, and human Action Center bridge.

---

## 13. AI Co-Founder Multi-Conversation Architecture, Specialist Worker Directory & Collaboration Gateway

Authoritative architectural record of the AI Co-Founder multi-conversation database isolation, 14 canonical specialist worker personas, 1:1 direct chat interface, and recursive-safe worker-to-worker collaboration gateway:

### A. Multi-Conversation Architecture & Context Isolation
- **Database Schema**: [`supabase/migrations/0123_co_founder_multi_conversations.sql`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/supabase/migrations/0123_co_founder_multi_conversations.sql).
  - Tables: `public.co_founder_conversations` (with `id`, `title`, `created_at`, `updated_at`, `is_pinned`, `metadata`) and `public.co_founder_messages` (with `conversation_id`, `role`, `content`, `attachments`, `tool_invocations`, `tokens_used`).
  - Strict Foreign Key cascade deletes ensure deleting a thread leaves other threads and the global business memory 100% intact.
- **Repository Layer**: [`src/lib/ai/co-founder/conversations/repository.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/conversations/repository.ts). Provides typed CRUD operations (`listConversations`, `getConversation`, `createConversation`, `updateConversation`, `deleteConversation`, `appendMessage`, `getConversationMessages`).
- **UI & State**: [`src/components/co-founder/ConversationSidebar.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/co-founder/ConversationSidebar.tsx) and [`src/app/co-founder/page.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/co-founder/page.tsx). Supports pinning, renaming, creating new isolated threads, and auto-associating LiveKit WebRTC audio transcripts with the active conversation.

### B. Canonical 15-Specialist Worker Directory
- **Worker Registry & Aliases**: [`src/lib/ai/co-founder/workers/registry.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workers/registry.ts). Maps canonical IDs (`worker_analytics` through `worker_performance_intelligence`) and colloquial aliases (`marketing`, `logistics`, `tax`, `seo`, `auditor`, `performance`) via `resolveCanonicalWorkerId()`:
  1. `worker_analytics` — Data & Intelligence Specialist
  2. `worker_marketing` — Growth & Performance Marketing Specialist
  3. `worker_seo` — Search Engine & Technical Catalog Specialist
  4. `worker_product` — Merchandising & Product Catalog Specialist
  5. `worker_competitor` — Market & Competitor Intelligence Specialist
  6. `worker_sales` — Revenue & Conversions Specialist
  7. `worker_support` — Customer Experience & Retention Specialist
  8. `worker_content` — Editorial, Craftsmanship & Social Specialist
  9. `worker_inventory` — Supply Chain & Stockout Specialist
  10. `worker_review` — Customer Feedback & Voice-of-Customer Specialist
  11. `worker_execution` — Action Execution & Task Orchestration Specialist
  12. `worker_monitoring` — System Health & Diagnostics Specialist
  13. `worker_orders_logistics` — Order Tracking & Courier SLA Specialist
  14. `worker_accounts_tax` — Accounts, GST & Compliance Specialist
  15. `worker_performance_intelligence` — Workforce Performance & Quality Auditor
  16. `worker_security_intelligence` — Autonomous Defense & Security Governance Specialist
- **Workforce UI**: [`src/components/co-founder/workforce/WorkerGrid.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/co-founder/workforce/WorkerGrid.tsx), [`src/components/co-founder/performance/PerformanceIntelligencePanel.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/co-founder/performance/PerformanceIntelligencePanel.tsx), and [`src/components/ai/motion-engine/LiveWorkingWorkspace.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/ai/motion-engine/LiveWorkingWorkspace.tsx). Interactive 16-card grid with active status indicators, activity badges, and dedicated 1:1 chat launch buttons.

### C. Specialist AI Worker 1:1 Direct Chat Service
- **Service & Prompt Engine**: [`src/lib/ai/co-founder/workers/worker-chat-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workers/worker-chat-service.ts).
  - Injects specialized domain persona instructions into Gemini with zero bleed into general Co-Founder context.
  - Dedicated API endpoint: [`src/app/api/admin/co-founder/workers/[workerId]/chat/route.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/api/admin/co-founder/workers/[workerId]/chat/route.ts) with `requireAdmin()` RBAC security.
- **Drawer UI**: [`src/components/co-founder/WorkerChatDrawer.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/co-founder/WorkerChatDrawer.tsx). Dedicated right-side sliding drawer with avatar, domain badge, active status pill, collapsible responsibilities accordion, automated message history retrieval, and integrated `SpeechToTextButton`.

### D. Worker-to-Worker Collaboration Gateway & Loop Breaker
- **Collaboration Gateway**: [`src/lib/ai/co-founder/workers/collaboration-gateway.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workers/collaboration-gateway.ts).
  - Loop Protection: Strict recursion limit (`MAX_COLLABORATION_DEPTH = 2`), self-delegation prohibition (`fromWorker !== toWorker`), and a 15-second execution timeout guard.
  - Audit Trail: Records every cross-worker consultation in `co_founder_worker_collaborations` with status mapped cleanly to valid constraints (`'pending'`, `'completed'`, `'failed'`, `'timeout'`).
  - Sensitive Data Redaction: Automatically masks API keys, Bearer tokens, passwords, Indian PAN, Aadhaar, and credit card numbers via `redactSensitiveData()` prior to logging.
- **Tool Bridge**: Exposes `consult_specialist_worker` tool in [`src/lib/ai/co-founder/brain.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/brain.ts) and routes execution via [`src/lib/ai/co-founder/tool-bridge.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/tool-bridge.ts).

---

## 14. Voice Notes, Multilingual Speech-to-Text & Rollback Operations Manual

Authoritative architectural record of the WhatsApp-style voice note pipeline, real-time multilingual transcription engine, and operational rollback procedures:

### A. P2P Audio Voice Note Architecture
- **Isolation Principle**: Pure direct Cloudinary upload using secondary messenger credentials (`io1kkukg`). Voice notes bypass LLM APIs (zero Gemini token usage).
- **Database & Storage**: Stored in `internal_chat_messages` with `media_type: 'audio'`, metadata containing `audioUrl`, `duration`, `status: 'active'`, and `expires_at: NOW() + INTERVAL '45 days'`.
- **45-Day Retention & Auto-Purge**: Daily cron job (`/api/cron/cleanup-voice-notes`) executes at 3:00 AM IST, queries expired notes, deletes audio from Cloudinary (`resource_type: 'video'`), and flags DB records as `'expired'`.
- **UI Playback & Recording**:
  - [`src/components/chat/VoiceNotePlayer.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/chat/VoiceNotePlayer.tsx): Inline WhatsApp-style waveform, play/pause controls, speed toggle (`1x`, `1.5x`, `2x`), and graceful 45-day expiration notice.
  - [`src/components/chat/VoiceNoteRecorder.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/chat/VoiceNoteRecorder.tsx): Audio recording with live time visualizer, discard/trash option, review preview player, and send action.

### B. Multilingual Speech-to-Text (STT) Dictation Architecture
- **Isolation Principle**: Pure temporary in-memory audio buffer sent directly to `gemini-3.5-transcribe`. Audio is never written to Cloudinary or persistent disks.
- **Drafting Behavior**: Transcribes audio into Bengali, Hindi, or Indian English and populates the composer textarea as an **editable draft**. It strictly **does not auto-send**.
- **Service & API**: [`src/lib/ai/transcribe-service.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/transcribe-service.ts) and [`src/app/api/chat/transcribe/route.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/api/chat/transcribe/route.ts).
- **UI Button**: [`src/components/chat/SpeechToTextButton.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/components/chat/SpeechToTextButton.tsx).

### C. Feature Flags & Safe Production Rollback Protocol
Centralized feature flags in [`src/lib/features.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/features.ts), `.env.local`, and `.env.example`:

| Environment Variable | Default | Purpose | Rollback State & Behavior |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_VOICE_NOTES_ENABLED` | `true` | Enables voice note recording & player in internal chat | Set `false`: Hides mic recorder button. Existing text chat continues without disruption. |
| `NEXT_PUBLIC_SPEECH_TO_TEXT_ENABLED` | `true` | Enables STT dictation button in chat composers | Set `false`: Hides STT dictation trigger. Pure keyboard entry continues without disruption. |
| `NEXT_PUBLIC_COFOUNDER_MULTI_CONVERSATION_ENABLED` | `true` | Enables multi-conversation sidebar & thread switching | Set `false`: Falls back to default single continuous executive chat session. |
| `NEXT_PUBLIC_WORKER_DIRECT_CHAT_ENABLED` | `true` | Enables 1:1 specialist worker chat drawer | Set `false`: Hides 1:1 chat buttons on worker cards; workers remain visible as status displays. |

#### Rollback Execution Procedure:
1. If Cloudinary audio storage or Gemini transcription encounters upstream provider outages, update Vercel environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_VOICE_NOTES_ENABLED=false production
   vercel env add NEXT_PUBLIC_SPEECH_TO_TEXT_ENABLED=false production
   ```
2. Trigger an immediate deployment or redeploy the latest commit:
   ```bash
   vercel redeploy
   ```
3. Zero database rollback is required. All existing messages, database foreign keys, and indexes remain intact and non-breaking.



### D. Mobile Client (RuhChat App) Audio & STT Implementation
- **Audio Engine**: Powered by `expo-audio` (modern replacement for unmaintained `expo-av`, compatible with React Native 0.86+ and Expo SDK 57 New Architecture).
- **Loudspeaker Mode & Universal MP3 Streaming**: [`src/components/VoiceNotePlayer.tsx`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/ruhvi-mobile_DO_NOT_DELETE/src/components/VoiceNotePlayer.tsx) enforces `setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false, shouldRouteThroughEarpiece: false })` to force playback through device loudspeakers. Normalizes Cloudinary URLs to `/video/upload/f_mp3/...mp3` for universal CBR audio playback across Android ExoPlayer, iOS AVPlayer, and Web without codec errors. Sets `downloadFirst: Platform.OS !== 'web'`.
- **Hermes JSI Safety & Speed Control**: Employs `applyPlayerSpeedSafely()` to defensively invoke `player.setPlaybackRate?.(rate)` only after `status.isLoaded`, eliminating synchronous Hermes `TypeError` crashes on read-only getter properties.
- **Expo SDK 57 Platform Preset Conformance & MediaRecorder Flush**: [`src/lib/audioService.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/ruhvi-mobile_DO_NOT_DELETE/src/lib/audioService.ts) preserves nested platform options inside `RecordingOptions` (`android`, `ios`, and `web`), avoids duplicate options in `prepareToRecordAsync()`, and waits 120ms after recording stops so Android `MediaRecorder` finishes flushing AAC frames and the `moov` atom header to storage.
- **Server-Authenticated Uploads & Response Alignment**: Media and voice notes upload via authenticated endpoints (`/api/internal-chat/voice-notes/upload` and `/api/internal-chat/upload`), returning both top-level and nested response structures to prevent redundant multi-upload cycles.
- **Resilient Multi-Model STT Architecture**: STT pipeline prioritizes multimodal `gemini-3.5-flash-lite`, `gemini-2.5-flash`, and `gemini-3.5-flash` with audio-only support for `gemini-3.5-transcribe`. Employs automatic fallback when any model returns 0 tokens or a non-fatal 400 error, ensuring reliable Bengali, Hindi, and Indian English transcription.
- **Bounded STT & Storage Hygiene**: Dictation audio is strictly capped to 3 MB raw ceiling to prevent exceeding Vercel's 4.5 MB Function body limit. Base64 audio is never persisted in AsyncStorage or chat history.

---

## 15. Human-Governed Recursive Self-Improvement (RSI) Subsystem

Authoritative architectural record of the Human-Governed Recursive Self-Improvement (RSI) Subsystem implemented for the Ruhvi AI Co-Founder:

### A. Core Architecture & Safety Boundary
- **Human-Governed Execution Loop**: `Observe -> Detect Gap -> Research -> Evaluate -> Propose Upgrade -> Owner Manual Implementation -> Post-Deploy Verification -> Evolution History`.
- **Absolute Scope Enforcement**: RSI is strictly forbidden from modifying production repository files, committing, pushing, deploying, modifying credentials, running direct database DDL, or activating permanent workers. Any attempt to breach these boundaries immediately triggers a `RsiSecurityViolationError`.
- **Feature Flags & Kill Switch**: Configured in [`src/lib/ai/co-founder/rsi/config.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/config.ts) (`RSI_ENABLED`, `RSI_DRY_RUN`, `RSI_MEMORY_ENABLED`, `RSI_RESEARCH_ENABLED`, `RSI_EVAL_LAB_ENABLED`, etc.).

### B. Core Subsystem Modules
1. **Persistent Memory Manager** ([`src/lib/ai/co-founder/rsi/memory-manager.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/memory-manager.ts)): Manages explicit user instructions, preferences, project facts, and verified lessons. Enforces scope precedence (narrow task exception overrides broad global preference without erasing history; candidate lessons cannot overwrite user instructions).
2. **Self-Observer & Redaction** ([`src/lib/ai/co-founder/rsi/self-observer.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/self-observer.ts)): Captures compact execution telemetry into Cloudflare D1 `run_events`. Automatically scrubs email addresses, Indian phone numbers, and secret service tokens (`cfast_...`, `cfut_...`).
3. **Reflection & Learning Engine** ([`src/lib/ai/co-founder/rsi/reflection-engine.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/reflection-engine.ts)): Converts failure events into testable candidate lessons. Enforces a strict promotion gate requiring at least 2 test runs with $\ge 90\%$ pass rate before promoting to `verified_lessons`.
4. **Capability Registry** ([`src/lib/ai/co-founder/rsi/capability-registry.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/capability-registry.ts)): Dynamically reflects all 16 canonical deployed workers directly from live code `WorkerRegistry`; guarantees that database records cannot execute arbitrary code.
5. **Research & Discovery Engine** ([`src/lib/ai/co-founder/rsi/research-engine.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/research-engine.ts)): Bounded external research with SSRF blocking (localhost, private subnets, cloud metadata) and prompt-injection neutralization. Stores findings in Cloudflare D1 (`research_projects`, `research_findings`).
6. **Capability Gap Detector** ([`src/lib/ai/co-founder/rsi/gap-detector.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/gap-detector.ts)): Multi-factor priority scoring formula (`(impact * confidence * urgency * recurrence) / (effort * (1 + risk_penalty))`) and 5-tier recommendation hierarchy.
7. **Evaluation Lab** ([`src/lib/ai/co-founder/rsi/eval-lab.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/eval-lab.ts)): Golden test suites with English, Bengali, and Banglish test fixtures. Offline evaluation replay with regression detection.
8. **Upgrade Proposal Engine** ([`src/lib/ai/co-founder/rsi/proposal-engine.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/proposal-engine.ts)): Enforces mandatory 18-point schema including test and rollback plans. Manages owner decision lifecycles (`accepted_for_manual_work`, `rejected`, `deferred`).
9. **Evolution History** ([`src/lib/ai/co-founder/rsi/evolution-history.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/evolution-history.ts)): Compares post-deployment verification scores against baseline and records audit logs in D1.

### C. Security Hardening & Runbook Audit Remediations (8 Nov 2026)
- **Edge M2M Service Token Auth & Fail-Closed Behavior (RSI-GAP-001)**: Cloudflare Access Edge cryptographically validates JWT assertions; Worker directly rejects unauthorized tokens via constant-time comparison and strictly fails closed if service secrets are unconfigured.
- **Cross-Scope Memory Search Authorization (RSI-GAP-002)**: `/v1/memory/search?scope=all` is restricted to authenticated callers with explicit owner/admin authorization (`X-Caller-Role: owner`). Non-owner cross-scope requests are rejected with HTTP 403 Forbidden and recorded in `audit_events`.
- **Candidate Lesson Promotion Gate (RSI-GAP-003)**: `/v1/memory/verify` requires a completed and passed evaluation run (`eval_run_id`), verified counterexamples, evaluator/owner role authorization, and enforces owner-instruction precedence (HTTP 409 Conflict if contradictory).
- **Authoritative Outcome Verification Reconciliation (RSI-GAP-011)**: `verifyDelayedOutcome` and `verifyDueActionPlanOutcomes` in [`src/lib/ai/co-founder/outcomes.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/outcomes.ts) strictly require authoritative store metric measurements via `measureAuthoritativeMetric`. Inconclusive queries remain `unresolved`, metric shortfalls $> 25\%$ trigger `conflicted`, preventing false-positive verified states.
- **Multilingual Explicit Intent Extraction (RSI-GAP-010)**: Unicode-aware parsing in `extractMemoriesFromConversation` for English, Bengali, and Banglish explicit memory instructions, cleanly differentiating permanent instructions from casual conversational statements.

---

## 16. Supervised Autonomous Worker Workforce Subsystem

Authoritative architectural record of the Supervised Autonomous Worker Workforce Subsystem implemented around the AI Co-Founder and 16 registered specialist workers (8 November 2026):

### A. Core Architecture & Safety Boundary
- **Co-Founder Brain as Sole Supervisor**: The existing AI Co-Founder (`src/lib/ai/co-founder/brain.ts` and `orchestrator.ts`) acts as the root coordinator. Individual autonomous workers cannot self-spawn, self-modify code, deploy, mutate database DDL, or bypass policy controls.
- **Autonomy Separation**: Clear barrier between *autonomous business execution* (analyzing trends, recommending campaigns, auditing stock, drafting checklists) and *system self-modification* (code changes, deploys, schema changes). System evolution remains owner-manual via the RSI upgrade proposal loop.
- **Fail-Safe Runtime Controls**:
  - Global emergency kill switch (`setGlobalKillSwitch()`, `isGlobalKillSwitchActive()`).
  - Per-worker maintenance mode (`setWorkerMaintenance()`, `isWorkerActive()`).
  - Default dry-run mode (`dryRun: true`) preventing unintended external side effects.

### B. Autonomy Tiers & Policy Engine
1. **Tier 0 (Manual)**: Runs only on direct, explicit user invocation.
2. **Tier 1 (Observe & Recommend - Default)**: Continuous observation, KPI anomaly detection, recommendation generation; strictly read-only with zero business mutation.
3. **Tier 2 (Internal Workflow)**: Low-risk, reversible internal actions (e.g. creating task drafts, saving checkpoints, compiling reports).
4. **Tier 3 (Approval-Gated Business Execution)**: Financial or external side-effect operations (e.g. price updates, inventory adjustments, publishing campaigns). Strictly requires a valid, unexpired `ApprovalBinding` with matching cryptographic payload hash (`sha256(payload)`).

### C. Core Subsystem Modules
1. **Canonical Worker Manifests** ([`src/lib/ai/co-founder/workforce/manifests.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/manifests.ts)): 14 versioned, tamper-evident worker specifications with SHA-256 manifest hashes covering domain objectives, owned KPIs, allowed data sources, allowed tools, read scopes, internal write scopes, autonomy tiers, limits, and retry policies.
2. **Policy Engine** ([`src/lib/ai/co-founder/workforce/policy-engine.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/policy-engine.ts)): Evaluates every requested step action against worker manifests, autonomy tiers, action risk categories (`read_only`, `internal_write`, `external_side_effect`, `financial`, `destructive`), and approval bindings.
3. **Signal Normalizer** ([`src/lib/ai/co-founder/workforce/signals.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/signals.ts)): Converts incoming schedules, webhooks, and health events into typed `WorkforceSignal` envelopes with deterministic SHA-256 idempotency keys and stale event rejection (>24h).
4. **Goal Discovery Engine** ([`src/lib/ai/co-founder/workforce/goal-discovery.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/goal-discovery.ts)): Evaluates candidate goals with transparent multi-factor priority scoring `(impact * confidence * urgency * alignment) / effort - riskPenalty - duplicatePenalty` and 48-hour fingerprint deduplication cooldowns.
5. **Workforce Planner** ([`src/lib/ai/co-founder/workforce/planner.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/planner.ts)): Constructs bounded, typed task plans with DAG dependency validation, tool allowlist enforcement, and circular dependency detection via DFS.
6. **Delegation Broker** ([`src/lib/ai/co-founder/workforce/delegation-broker.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/delegation-broker.ts)): Governs parent-to-child worker delegation with hard depth bounds (max depth = 2, child cannot delegate further), concurrency limits (max 3 children per parent), allowed delegate checks, and strict permission intersection.
7. **Agent Runner** ([`src/lib/ai/co-founder/workforce/agent-runner.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/agent-runner.ts)): Executes bounded steps under checkpointing (`checkpoints`), policy gates, step limits, dry-run simulation, and fail-safe telemetry recording to Cloudflare D1 (`worker-runs` and `tool-events`).
8. **Two-Level Verifier** ([`src/lib/ai/co-founder/workforce/verifier.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/verifier.ts)):
   - **Level 1 (Task Verification)**: Verifies completion status, output summary presence, and tool allowlist compliance across execution checkpoints.
   - **Level 2 (Business Outcome Verification)**: Evaluates real-world metric outcomes via `measureAuthoritativeMetric()` in `closed-loop.ts`, compares against target/baseline with tolerance thresholds, and feeds candidate lessons into the RSI Reflection Engine (`RsiReflectionEngine.createCandidateLesson()`) when discrepancies or conflicts occur.
9. **Unified Coordinator Facade** ([`src/lib/ai/co-founder/workforce/index.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/index.ts)): High-level `AutonomousWorkforceCoordinator` providing `processIncomingSignal()` and `getHealthStatus()`.
10. **D1 Workforce Runtime Schema & Migration** ([`cloudflare/cofounder-data-api/migrations/0003_workforce_runtime.sql`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/cloudflare/cofounder-data-api/migrations/0003_workforce_runtime.sql)): Additive schema defining durable lifecycle tables for `workforce_signals`, `workforce_goals`, `workforce_plans`, `workforce_tasks`, `workforce_task_steps`, `workforce_checkpoints`, `workforce_delegations`, `workforce_agent_messages`, `workforce_outbox`, `workforce_dead_letters`, and `workforce_controls`.
11. **Cloudflare D1 Workforce Data API Endpoints** ([`cloudflare/cofounder-data-api/src/index.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/cloudflare/cofounder-data-api/src/index.ts)):
    - `/v1/workforce/signals`: Ingests and queries normalized event signals with idempotency uniqueness.
    - `/v1/workforce/goals`: Manages goal lifecycle (`CANDIDATE` -> `ACCEPTED` -> `PLANNED` -> `QUEUED` -> `ACTIVE` -> `COMPLETED`) with server-side legal transition enforcement.
    - `/v1/workforce/plans`: Persists validated DAG execution plans with risk tiers and conflict records.
    - `/v1/workforce/tasks`: Creates, lists, and claims durable tasks.
    - `/v1/workforce/tasks/:id/claim`: Atomic compare-and-set claim ensuring single active lease owner and returning `ALREADY_LEASED` non-error on race conditions.
    - `/v1/workforce/tasks/:id/heartbeat`: Renews active leases with owner verification.
    - `/v1/workforce/tasks/:id/checkpoint`: Persists step checkpoints for crash and serverless recovery.
    - `/v1/workforce/tasks/:id/state`: Server-owned transition function enforcing legal state progressions.
    - `/v1/workforce/delegations`: Enforces delegation depth <= 2, prevents self-delegation, and bounds max 3 active children per parent.
    - `/v1/workforce/controls`: Server-side kill switches and domain pause controls.
    - `/v1/workforce/status`: Measured operational status reporting real task states without synthetic telemetry.
12. **Orchestration Defect Gaps Closed (Audit Runbook 8 Nov 2026)**:
    - **Section 5.1 & WF-GAP-013**: Removed synthetic approval ID fallbacks (`app_${Date.now()}`) in `dispatcher.ts`; failures fail closed with `APPROVAL_CREATION_FAILED`.
    - **Section 5.2 & WF-GAP-008**: Implemented full DFS cycle detection and duplicate step ID detection in `intelligent-planner.ts`; `executeMultiWorkerPlan()` enforces `validateExecutionPlan()` and fails closed on conflicts or cycles.
    - **Section 5.3 & WF-GAP-019**: Bounded stage concurrency in `dispatcher.ts` using chunking (concurrency limit = 2).
    - **Section 5.4**: Added cooperative cancellation (`AbortController` / `AbortSignal`) in `collaboration-gateway.ts` to cleanly abort timed-out consultations.
    - **Section 5.5 & WF-GAP-016**: Removed `Math.random()` synthetic telemetry in `status-builder.ts`; `dispatcher.ts` reports truthful `'REGISTERED'` operational status.
    - **Section 5.6 & WF-GAP-012**: Replaced synthetic hardcoded scopes in `worker-11-execution.ts` with authenticated caller scopes.

---

## 17. AI Co-Founder Architecture & RSI Master Gap-Closure Remediations (8 Nov 2026)

Authoritative architectural record of the master gap-closure audit executed per `RUHVI_COFUNDER_ARCHITECTURE_RSI_WORKFORCE_MASTER_IMPLEMENTATION_RUNBOOK_2026-11-08.md`:

1. **TEST-03 & RSI-06 (Dynamic Canonical 16-Worker Registry Set Equality)**:
   - `WorkerRegistry` in [`src/lib/ai/co-founder/workers/registry.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workers/registry.ts) is the single executable source of truth for all 16 canonical workers.
   - Removed hardcoded snapshot count (`14`) from `rsi-subsystem.test.ts` and `capability-registry.ts`. Dynamic set equality asserts exact match against live `WorkerRegistry.getAllWorkers()`.

2. **PERF-03 (Dynamic Roster in Performance Intelligence Worker)**:
   - Updated [`src/lib/ai/co-founder/workers/worker-performance-intelligence.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workers/worker-performance-intelligence.ts) to dynamically derive the AI workers roster from `workerRegistry.getAllDefinitions()`, ensuring all 16 workers (including performance and security intelligence) are continuously audited.

3. **PERF-01 & PERF-02 (Performance Data Access Truthful Telemetry)**:
   - In [`src/lib/ai/co-founder/workers/performance/data-access.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workers/performance/data-access.ts), removed silent in-memory fallback in production. If the database returns an insert error or connectivity failure, it logs and returns `false`, preventing false-positive success reporting. In-memory fallback is restricted strictly to unit testing (`process.env.NODE_ENV === 'test'`).

4. **PERF-04 (Performance Cron & Error Visibility)**:
   - Added `/api/cron/workforce-performance-audit` to [`vercel.json`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/vercel.json) scheduled daily (`0 5 * * *`).
   - Hardened [`src/app/api/cron/workforce-performance-audit/route.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/app/api/cron/workforce-performance-audit/route.ts) to remove empty `catch {}` blocks and return HTTP 500 with descriptive error details if snapshot persistence fails.

5. **ARCH-04 (Proposal Decision Enum & Existence Validation)**:
   - Hardened `POST /v1/proposals/:id/decision` in [`cloudflare/cofounder-data-api/src/index.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/cloudflare/cofounder-data-api/src/index.ts).
   - Validates proposal existence (returns HTTP 404 `PROPOSAL_NOT_FOUND` if missing).
   - Enforces strict canonical decision enum (`accepted_for_manual_work`, `approved`, `rejected`, `deferred`, `revision_requested`). Unknown decisions return HTTP 400 `INVALID_INPUT` and never default to approved.

6. **ARCH-05 (Workforce Controls Actor Derivation)**:
   - In `POST /v1/workforce/controls`, `updated_by` is derived from verified server credentials (`CF-Access-Client-Id` or verified caller role) rather than blindly trusting the request payload body. Modifications are logged to `audit_events`.

7. **ARCH-06 (RSI Feature Flag Fail-Closed Enforcement)**:
   - In [`src/lib/ai/co-founder/rsi/governance.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/governance.ts), if `config.enabled` is `false`, all active RSI operations immediately fail closed, regardless of whether `dryRun` is enabled.
   - Updated [`src/lib/ai/co-founder/rsi/config.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/rsi/config.ts) to safely default in test environments while strictly requiring explicit `RSI_ENABLED=true` in production.

8. **WF-01 (Workforce Coordinator Enablement Enforcement)**:
   - In [`src/lib/ai/co-founder/workforce/index.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/src/lib/ai/co-founder/workforce/index.ts), `AutonomousWorkforceCoordinator.processIncomingSignal()` checks `config.enabled`. If disabled, it immediately aborts the cycle with status `'KILLED'`.

9. **ARCH-01, ARCH-02 & SEC-02 (Scoped Ingest Token & Edge Auth Hardening)**:
   - In [`cloudflare/cofounder-data-api/src/auth.ts`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/cloudflare/cofounder-data-api/src/auth.ts), `CF_SECURITY_INGEST_TOKEN` is strictly scoped to `/v1/security/scans` and `/v1/security/events`. Any attempt by scanner tokens to access general memory, proposals, or workforce endpoints is rejected.
   - Removed broad CORS wildcard `*` from sensitive server-to-server internal API endpoints.

10. **TEST-01 (Cloudflare Worker Test Runner Script)**:
    - In [`cloudflare/cofounder-data-api/package.json`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/cloudflare/cofounder-data-api/package.json), updated `"test"` script from `tsc --noEmit` to execute the full Jest worker test suite with non-zero exit code on failure. Added test step to [`.github/workflows/ci.yml`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/.github/workflows/ci.yml).

---

## 18. Deep Implementation Audit Remediation & Parity Hardening (8–9 Nov 2026)

Authoritative architectural record of the findings remediated from `RUHVI_DEEP_IMPLEMENTATION_AUDIT_2026-11-08.md`:

1. **Stop False Security & Performance Success States (Phase A / PERF-01, PERF-06, SEC-01)**:
   - **`dispatcher.ts`**: Corrected `isSuccess` mapping. Only `executed` or `approved` counts as successful completion. Tasks waiting for human approval (`pending_approval` or `requiredApproval`) are marked `status: 'blocked'`, `verificationPassed: undefined`, with `blockerReason: 'AWAITING_HUMAN_APPROVAL'`, preventing unverified actions from inflating reliability scorecards.
   - **Awaited Event Persistence**: `PerformanceDataAccess.recordEvent(perfEvent)` is awaited in both completion and failure dispatch paths with explicit error logging, resolving dropped telemetry.
   - **`worker-security-intelligence.ts`**: Incident investigations return `executionStatus: 'pending_approval'`, `requiredApproval: true`, and verification status `'recorded_only'`. Containment actions are never falsely reported as `executed` or `verified_effective` without confirmed edge perimeter enforcement.

2. **Truthful & Durable Database Architecture (Phase B / DB-02, DB-05, SEC-08, PERF-02, PERF-03, PERF-04, PERF-09)**:
   - **Access AUD Resolution (`DB-02` / `SEC-07`)**: `cloudflare/cofounder-data-api/src/auth.ts` inspects `env.CF_ACCESS_AUD || env.ACCESS_AUD`, matching Wrangler configuration.
   - **Strict CORS (`DB-05` / `SEC-10`)**: Removed wildcard `*` from `jsonResponse` and `OPTIONS` preflight across `index.ts` and `security.ts`. CORS is restricted strictly to authorized origins (`https://ruhvi.in`, `https://www.ruhvi.in`, `https://admin.ruhvi.in`, and localhost for dev) with `Vary: Origin`.
   - **Comprehensive Private IP Validation (`SEC-08`)**: Implemented `isPrivateOrReservedIp` in both Cloudflare API `security.ts` and AI Worker `worker-security-intelligence.ts`, covering full RFC 1918 range (`172.16.0.0/12`), link-local (`169.254.0.0/16`), Carrier Grade NAT (`100.64.0.0/10`), IPv6 ULA (`fc00::/7`), IPv6 link-local (`fe80::/10`), and loopback (`127.0.0.0/8`, `::1`).
   - **Zero In-Memory Fallback in Production (`PERF-02`, `PERF-03`)**: In `performance/data-access.ts`, `recordEvent`, `recordPointTransaction`, and `getEvents` return explicit failure (`false` or `[]`) if the database is unavailable outside of tests (`process.env.NODE_ENV !== 'test'`). Empty DB query results (`[]`) are respected as authoritative data without falling back to process memory.
   - **Alert Persistence Inspection (`PERF-04`)**: `saveAlerts` inspects the Supabase `{ error }` and returns a boolean status.
   - **Deterministic Idempotent Event IDs (`PERF-09`)**: `EventNormalizer` generates stable, idempotent event IDs based on worker ID, task ID, and event status (`pe_ai_${workerId}_${taskId}_${status}`), preventing duplicate entries on task retry.

3. **RSI Subsystem Governance & Truthfulness (Phase C / RSI-01, RSI-02, RSI-03, RSI-04, RSI-05, RSI-06)**:
   - **Lifecycle Integration (`RSI-01`)**: `getRsiCoordinator().observer.recordObservation(...)` is wired directly into `dispatchWorkerTask` on both completion and exception execution paths.
   - **Granular Feature Flags (`RSI-02`)**: `assertRsiOperationAllowed` maps each operation to its corresponding `RsiConfig` flag (`memoryEnabled`, `observerEnabled`, `reflectionEnabled`, `researchEnabled`, `gapDetectionEnabled`, `evalLabEnabled`, `proposalsEnabled`, `evolutionHistoryEnabled`) and enforces them independently.
   - **Budget Limit Enforcement (`RSI-03`)**: Added `checkRsiBudgets` enforcing per-run token limits, external request counts, and wall-clock timeouts.
   - **Zero-Sample Metrics Truthfulness (`RSI-04`)**: `RsiSelfObserver.aggregateMetrics([])` returns `successRate: null` and `status: 'INSUFFICIENT_DATA'` rather than claiming 100% success.
   - **Candidate Promotion Gate (`RSI-05`)**: `RsiReflectionEngine.promoteCandidateLesson` requires candidate ID and non-empty evaluation evidence references.
   - **Truthful Capability Registry (`RSI-06`)**: `RsiCapabilityRegistry` marks live worker snapshot status as `'registered'` rather than claiming untested verification.
   - **Data Client Security Methods**: Added typed methods in `CofounderDataClient` for `/v1/security/*` endpoints (`recordSecurityEvent`, `ingestSecurityScan`, `getSecurityFindings`, `getSecurityIncidents`, `createSecurityIncident`, `proposeSecurityAction`, `listSecurityProposals`, `quarantineFile`, `listBlockedEntities`).

4. **Workforce Parity & Cron Enforcement (Phase D / PERF-10, PERF-11)**:
   - **Roster Parity Migration 0129 (`PERF-10`)**: Created `supabase/migrations/0129_add_security_worker_to_roster.sql` seeding `worker_security_intelligence` into `workforce_members` to ensure 16/16 parity with `workerRegistry`.
   - **Cron Route Error Handling (`PERF-11`)**: In `/api/cron/workforce-performance-audit`, validates `result.executionStatus !== 'failed'`, requires `report?.reportId`, and inspects `{ error }` on Supabase upserts/inserts, returning HTTP 500 on failure.

---

## 19. Co-Founder Worker Security, Truthfulness & SSRF Protection Architecture (9 Nov 2026)

Authoritative architectural record of the upgrades implemented per the Co-Founder Worker Upgrade Guide:

1. **Phase 0: Fail-Closed Secrets & Credential Rotation**:
   - Eliminated hardcoded fallback credentials and demo API keys across `cloudinary-service.ts`, `file-generator.ts`, `n8n-client.ts`, and `media-jobs/callback/route.ts`.
   - In production (`process.env.NODE_ENV === 'production'`), missing environment variables fail closed immediately with typed errors (`integration_not_configured`) rather than attempting unauthenticated or mock execution.

2. **Phase 1: Truthful Outputs & Zero-Fabrication Contract**:
   - Formalized `WorkerDataSourceMode` (`'live' | 'cached' | 'simulated' | 'unavailable' | 'partial' | 'insufficient_data' | 'verified'`) in `src/lib/ai/co-founder/workers/types.ts`.
   - **Worker 6 (Sales)**: Removed `totalOrders * 35` and `1,500 visitors` benchmark multipliers; pre-checkout funnel stages without web session telemetry marked `unavailable` (`count: null`); 0 orders returns `insufficient_data`.
   - **Worker 10 (Review)**: Removed hardcoded 38 praise / 4 clasp defect fallbacks. Themes extracted dynamically from real reviews; 0 reviews returns `insufficient_data`.
   - **Worker 12 (Monitoring)**: Removed fallback returning fabricated 80.0% / 87.5% reliability rates. Unrecorded telemetry returns `insufficient_data`.
   - **Worker 8 (Content)**: Measures real word counts, actual keyword density, and internal links directly from generated markdown.
   - **Meta Ads**: Unconfigured token returns empty data in production, marking test outputs explicitly as `sourceMode: 'simulated'`.

3. **Phase 2: SSRF, Browser Sandboxing & Egress Protection**:
   - **Playwright Browser Hardening (`src/lib/ai/browser/playwright.ts`)**: Integrated `assertSafeOutboundUrl()` pre-flight verification on all incoming target URLs. Enforces isolated Chromium context per execution with zero permissions (`permissions: []`), strict TLS enforcement (`ignoreHTTPSErrors: false`), and strict CSP (`bypassCSP: false`).
   - **Route-Level Egress Interception**: Registered `page.route('**/*')` evaluating every outbound network request and post-redirect destination against `assertSafeOutboundUrl()`, automatically aborting requests to private IP subnets, loopback, or cloud metadata endpoints (`169.254.169.254`).
   - **Scrapling Safe Process Invocation (`src/lib/ai/browser/scrapling.ts`)**: Replaced string interpolation in shell execution with `child_process.spawn` (`shell: false`), passing target URLs safely via `sys.argv[1]` to eliminate OS command and Python code injection vulnerabilities.
   - **n8n Media Webhook Egress Protection (`src/lib/ai/co-founder/workers/marketing/n8n-client.ts`)**: Validates `webhookUrl` and production `callback_url` against SSRF policy before dispatching media processing jobs.

4. **Phase 3: Hosted No-VPS Research Gateway (`src/lib/ai/co-founder/rsi/`)**:
   - **Multi-Provider Search Hierarchy**: Server-only bounded router executing Crawl4AI Cloud (Primary) ➔ Tavily (Fallback 1) ➔ Exa (Fallback 2). Zero VPS, zero Docker containers, zero payment card required.
   - **Fail-Closed & Free-Tier Guard**: Missing API keys return typed `not_configured` without faking outputs. `RESEARCH_ALLOW_PAID_PROVIDERS=false` and `RESEARCH_AUTORECHARGE=false` explicitly prevent billing, subscription, or recharge endpoint calls.
   - **Circuit Breaker & Cooldowns**: Automatically tracks `quota_exhausted` (1h cooldown), `rate_limited` (60s cooldown), and `auth_error` without looping.
   - **15-Minute Query Cache & Deduplication**: Canonicalizes URLs (strips `utm_*`, tracking parameters, trailing slashes) and caches query results in serverless memory (`sourceMode: 'cached'`) to conserve free-tier provider allowances.
   - **Safe Page Readers & Specialist Sources**: Page extraction via Crawl4AI `/scrape`, Jina Reader (`r.jina.ai`), and `safeFetchDirect` all strictly gated by `assertSafeOutboundUrl()`. Public GitHub API and RSS/Atom feed ingestion adapters for code and publisher updates.

5. **Phase 4: Evidence Ledger, Citations & Source Ranking (`src/lib/ai/co-founder/rsi/evidence-ledger.ts`)**:
   - **Domain Trust Tiers**: 4-level taxonomy classifying sources into Tier 1 (Official & Standards: `.gov.in`, `bis.gov.in`, `ruhvi.in`), Tier 2 (Reputable Business Publishers: Economic Times, LiveMint, Reuters), Tier 3 (Competitors & Marketplaces: CaratLane, Giva, Bluestone), and Tier 4 (Community & Social: Reddit, Quora, unverified blogs).
   - **Corroboration & Zero-Fabrication Gate**: Factual claims strictly require either at least two independent source domains or at least one Tier 1 official source to achieve `corroborated` status. Single-domain sources are transparently marked `single_source` (confidence $\le$ 0.65); unbacked claims are marked `unverified` (confidence 0.0). Contradictory findings surface as `conflicting`.
   - **Freshness & Provenance Ledger**: Tracks SHA-256 `contentHash` per excerpt and categorizes publication freshness into `fresh`, `possibly_stale`, or `undated`.
   - **Dual-Mode Output Formatting**: Formats structured markdown citations with footnote links for text chat and concise spoken source digests for voice mode.

6. **Phase 5: Research Gateway Tool System Bridge (`src/lib/ai/co-founder/brain.ts`, `tool-bridge.ts`, `mcp-auth.ts`)**:
   - **4 Research Tools Declared**: Registered `web_search`, `read_webpage`, `research_topic`, and `get_research_provider_health` in `CO_FOUNDER_TOOL_DECLARATIONS` and normalized via `formatGeminiFunctionDeclarations` for Gemini Live / AI SDK.
   - **Permission Matrix & Fail-Closed Guard**: Added all 4 tools to `TOOL_PERMISSION_MAP` under `{ module: 'mcp_tools', action: 'read' }`. Callers lacking `mcp_tools:read` are rejected with `Forbidden`. Unknown tools fail closed.
   - **Tool Execution Router Integration**: Implemented execution branches in `executeCoFounderTool` routing `web_search` and `read_webpage` through `RsiResearchEngine` and the provider router, `research_topic` through `evidenceLedger`, and `get_research_provider_health` through the circuit breaker health monitor. Truthful fallback status (`sourceMode: 'unavailable'`) returned when providers are unreachable.
   - **Zero-Fabrication Executive Instructions**: Injected Rule 14 into `getCoFounderSystemPrompt()`, mandating live research over fabrication, source citations, trust-tier distinctions, and untrusted web content handling.
   - **Specialist Worker Cross-Integration**: Integrated research tools into the Competitor Research Worker (`worker_competitor_research`) and internal department configs for real-time market and competitor pricing intelligence.

7. **Phase 6: Controlled Agent Reach Adapter & Discussion Search (`src/lib/ai/co-founder/rsi/adapters/agent-reach.ts`)**:
   - **Isolated Child Process & Spawn Boundary**: Implemented `AgentReachAdapter` using `child_process.spawn` with `shell: false`, timeout budget (10s), output size limits, and sanitization of child process environment variables (scrubbing app service keys).
   - **Subcommand Allowlist & Mutation Prevention**: Strictly allows only `['version', 'channels', 'read', 'update']`. All modification/posting verbs (`post`, `send`, `comment`, `message`, `dm`, `follow`, `like`, `publish`, `delete`) are rejected with security exceptions.
   - **Target SSRF Protection & Output Redaction**: Mandatory `assertSafeOutboundUrl` pre-flight validation on all URL targets. Automated scrubbing of bearer tokens, session cookies, and API keys from CLI stdout.
   - **Bounded Public Channel Policy**: Public low-risk channels (`web`, `rss`, `github`, `youtube`) are supported; high-risk authenticated channels (`reddit`, `x`) default to disabled and require explicit owner account opt-in.
   - **Discussion Search Tool (`search_public_discussions`)**: Declared in `brain.ts`, mapped in `mcp-auth.ts`, and implemented in `tool-bridge.ts` with transparent Reddit topic sentiment fallback.

8. **Phase 7: Runtime Skills & Worker Capability Contracts (`src/lib/ai/skills/`)**:
   - **21 Versioned Runtime Skills**: Implemented typed runtime skills across 3 shared skills (`shared_evidence_quality`, `shared_source_trust_policy`, `shared_prompt_injection_boundary`), 3 research skills (`research_general_web_research`, `research_competitor_intelligence`, `research_social_listening`), and 15 worker skills covering all 16 workers.
   - **Worker Capability Manifests (`src/lib/ai/skills/manifest.ts`)**: Built canonical capability manifests for all 16 workers defining domains, objectives, autonomy tiers (`T0`–`T3`), risk categories (`read_only`, `internal_write`, `external_side_effect`, `financial`), explicit non-capabilities, tool allowlists, token/timeout budgets, and tamper-evident SHA-256 manifest hashes.
   - **Governed Runtime Skill Loader (`src/lib/ai/skills/loader.ts`)**: Enforces strict allowlist (`SKILL_ALLOWLIST`), rejects path traversals, validates integrity hashes, and creates immutable `SkillRunTrace` records attached to each worker execution.
   - **100% Tool Permission Parity (`src/lib/ai/mcp-auth.ts`)**: Mapped all 50 worker-declared tools and 63 workforce manifest tools into `TOOL_PERMISSION_MAP` with explicit module and read/write actions, achieving 0 unmapped tools.
   - **Specialist 1:1 Chat Integration (`worker-chat-service.ts`)**: Injects capability manifests, explicit non-capabilities, and active runtime skill instructions into worker prompts, persisting audit traces in message metadata.

9. **Phase 8: Workforce Governance, Reliability & Distributed Controls (`src/lib/ai/co-founder/workforce/`)**:
   - **Explicit Typed Action Risk Registry (`action-registry.ts`)**: Replaced substring-only risk matching with authoritative typed registry (`ACTION_RISK_REGISTRY`). Unknown actions default to `DENY`, never `read_only`.
   - **Cryptographic Approval Binding with Nonce Protection (`policy-engine.ts`, `idempotency.ts`)**: Validates exact actionType, actor user ID, worker ID, expiration timestamps, and canonical payload SHA-256 hashes. Single-use nonces prevent replay attacks (second execution returns `DENY`).
   - **Authoritative Distributed State Store (`state-store.ts`)**: Emergency global kill switch and worker maintenance state synchronized across serverless instances via Supabase `system_settings` with fast in-memory caching.
   - **Timeout Budgets & Cancellation via AbortSignal (`agent-runner.ts`)**: Enforces `timeoutBudget` with `AbortController` and cancellation propagation to worker processes; timed-out tasks record `TIMED_OUT` rather than `COMPLETED`.
   - **Distributed Idempotency at Entry Boundary (`idempotency.ts`)**: Caches execution results by idempotency key to prevent duplicate mutations on retries.
   - **Visible Dry-Run Tagging & Dead-Letter Replay (`agent-runner.ts`)**: Stamped `sourceMode: 'simulated'` and `dryRun: true` on simulation outputs; added `replayDeadLetterTask` resetting dead-letter, timed-out, or failed tasks with fresh run credentials.

10. **Phase 9: Real Data, Grounded Integrations & Domain Upgrades Across All 16 Workers (`src/lib/ai/co-founder/workers/`)**:
    - **Worker 6 (Sales Conversion)**: Completely eliminated synthetic multiplier assumptions (`measuredVisitors * 0.05` for carts and `carts * 0.5` for checkout). Pre-checkout funnel stages without web session telemetry are reported as `count: null` and marked as `'unavailable'`. Ingests real payment telemetry directly from `orders` (`payment_method`, `payment_status`), reporting COD vs Prepaid ratios and payment failure rates with explicit `sourceMode`.
    - **Worker 10 (Review Analysis)**: Replaced static fallback dictionaries with dynamic defect mining across 6 domain defect categories (stone loosening, plating fading/wear, clasp stiffness, choker sizing, delivery delays, packaging transit damage). Added sample size, verified purchaser counts, and statistical confidence levels (`high`, `medium`, `low`, `insufficient_data`).
    - **Worker 12 (Monitoring & Self-Correction)**: Replaced sample success rate fallbacks with empirical checks against `co_founder_outcomes` and `co_founder_action_plans`. Enforced minimum sample size rule: < 5 actions evaluated is marked `'inconclusive'` and `sourceMode: 'partial'` with 0 success rate fallback.
    - **Worker 8 (Content & Copywriting)**: Removed static fallback link array. Implemented strict internal link validation (`/products/`, `/collections/`, `/policies/`, `/about`, `/contact`, `/blog/`). Added structured `citations` array grounded in canonical brand knowledge (`RUHVI_BUSINESS_KNOWLEDGE`) and external research parameters. Added `qualityMetrics`.
    - **Worker 13 (Orders & Logistics)**: Added Step 4 Shiprocket tracking reconciliation against `tracking_updates` table. Reconciles carrier AWBs, delivery statuses, identifies in-transit delays, and flags delivery discrepancies.
    - **Worker 3 (SEO)**: Added Search Console integration status (`connected` or `not_configured`) and JSON-LD structured data validation (`Product`, `Organization`, `BreadcrumbList`).
    - **Worker 4 (Product)**: Added SKU variant awareness via `product_variants` table.
    - **Worker 9 (Inventory)**: Implemented reproducible lead-time replenishment model (14-day Bengal artisan casting lead time + 7-day safety buffer = 11 units reorder point) and `stock_movements` ledger tracking.
    - **Worker 7 (Customer Support)**: Grounded customer responses in canonical policy sources (shipping SLA, warranty, returns) and marked response templates as `draft_only` with approval requirement for outbound sends.
    - **Worker 14 (Accounts & Tax)**: Added mandatory "CA Review Required" status and approval gating for any statutory return submission, voucher creation, or financial ledger mutation.
    - **Marketing Integrations (Meta Ads, Cloudinary, n8n)**: Eliminated synthetic ROAS (4.8) and spend (14,200). `MetaAdsService.getAdAccounts()` differentiates between production (returns empty array fail-closed) and non-production (`sourceMode: 'simulated'`). Cloudinary and n8n clients return `isSimulated: true` when unconfigured in non-prod, failing closed in prod.







