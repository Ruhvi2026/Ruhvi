# Project Ruhvi - Complete Tools, Services, Skills, MCP & Domain DNS Audit Documentation

**Generated Date:** 2026-10-10  
**Project:** Ruhvi E-commerce (Next.js 15 App Router, Supabase, Firebase)

---

## 1. External Services & Technical Integrations (তৃতীয় পক্ষীয় পরিষেবা ও ইন্টিগ্রেশন)

| Tool / Service | Category | Purpose / Role in Project | Status | Primary Config / Implementation Files |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js 15** | Framework | Full-stack React App Router framework handling SSR, SSG, Server Actions, and API routes. | Active | `package.json`, `next.config.js` |
| **Supabase** | Database & Storage | Primary PostgreSQL database source of truth, RLS policies, site asset storage, and Supabase Realtime subscriptions. | Active | `src/lib/supabase/*`, `supabase/migrations/*` |
| **Firebase Auth** | Authentication | Centralized authentication system (Email/Password, Phone OTP, Google OAuth, Facebook Login) coupled with custom Supabase JWT creation. | Active | `src/lib/firebase.ts`, `src/services/authService.ts` |
| **Firebase Cloud Messaging (FCM)** | Push Notifications | Dedicated push notification service used for transactional order updates and marketing broadcasts (OneSignal fully removed). | Active | `src/lib/fcm-admin.ts`, `src/app/api/admin/notifications/route.ts` |
| **Google Identity Toolkit REST API** | Auth Infrastructure | Lightweight REST API migration bypassing heavy `firebase-admin` SDK to prevent ESM bundler conflicts on Vercel Serverless. | Active | `src/lib/firebase-admin.ts` |
| **Cloudinary (Main)** | Image Optimization | Main cloud storage and optimization pipeline for product catalog images and support attachments. | Active | `src/services/cloudinaryService.ts` |
| **Cloudinary (RuhChat Dedicated)** | Media Storage | Dedicated Cloudinary account (`io1kkukg`) specifically allocated for RuhChat staff messenger attachments (images/videos/docs) to preserve main account quota. | Active | `src/app/api/internal-chat/upload/route.ts` |
| **Resend** | Transactional Email | Core delivery engine for all transactional and transactional system emails (orders, reset links, OTPs). | Active | `src/lib/resend.ts` |
| **Brevo** | Email Marketing | Email marketing platform used for automated cron campaigns, newsletters, and abandoned cart emails. | Active | `src/lib/brevo.ts`, `src/lib/brevo/mcp.ts` |
| **Zoho Mail** | Business Email | Official custom domain mailboxes (`support@ruhvi.in` for customer tickets/helpdesk and `admin@ruhvi.in` for third-party platform registrations & administrative accounts). | Active | Cloudflare MX (`mx.zoho.in`) |
| **EspoCRM** | Customer CRM | Self-hosted CRM instance (`crm.support.ruhvi.in`) running on VPS for support staff ticket lifecycle management and customer context sync. | Active | `src/lib/espo/*`, `src/app/api/integrations/espo/*` |
| **PostHog** | Product Analytics | Full product analytics, user funnel tracking, heatmaps, and session replay recording. | Active | `src/lib/posthog.ts`, `src/services/posthog-analytics.service.ts` |
| **Meta Pixel & Meta CAPI** | Ad Analytics | Browser Meta Pixel and server-side Conversion API (CAPI) for ad performance and event tracking. | Active | `src/app/api/capi/route.ts` |
| **Google Analytics 4 (GA4)** | Web Analytics | E-commerce transaction tracking and overall site traffic monitoring. | Active | `src/lib/gtag.ts`, `src/app/layout.tsx` |
| **Cloudflare Turnstile** | Anti-Bot Security | Bot prevention challenge integrated into checkout and sensitive authentication routes. | Active | `src/app/checkout/page.tsx` |
| **PhonePe** | Payment Gateway | E-commerce payment gateway supporting standard checkout and 10% Partial-COD pre-payments. | Active | `src/app/api/checkout/phonepe`, `src/lib/orders/finalize-phonepe-order.ts` |
| **Paytm Payment Gateway** | Payment Gateway | Alternative backup payment gateway configured for online transactions. | Active (Keys Pending) | `src/lib/payments/paytm.ts`, `src/app/api/checkout/paytm` |
| **Shiprocket** | Logistics & Shipping | Automated courier allocation, shipping label generation, and order tracking status sync. | Active | `src/lib/shiprocket.ts`, `src/app/api/admin/shiprocket/create-order` |
| **DeepSeek AI** | AI LLM Engine | DeepSeek LLM models (`deepseek-reasoner` [R1] for complex reasoning tasks, `deepseek-chat` [V3] for conversational) configured with working API key as the automatic tertiary failover tier in the multi-credential routing engine if all Gemini accounts encounter rate limits, 503 high demand spikes, or outages. | Active | `src/lib/ai/providers/deepseek.ts`, `src/lib/ai/index.ts` |
| **Google Gemini & Imagen 3** | AI Multimodal & Image Generation | Google Gemini configured as **Primary Priority 1** across all features: `gemini-3.5-flash` for deep reasoning (`product_description`, `co_founder`, `support_reply`) and `gemini-3.5-flash-lite` for ultra-fast customer chatbot / SEO. Powered by encrypted multi-credential rotation (Primary Account 1 -> Secondary Account 2 backup) before escalating to DeepSeek. Imagen 3 powers studio photography. | Active | `src/lib/ai/credentials.ts`, `src/lib/ai/index.ts`, `src/lib/ai/co-founder/studio-photography.ts` |
| **OpenTelemetry (OTel)** | Distributed Tracing | Server-side trace telemetry export pipeline sending node HTTP/Express spans to local Jaeger / OTLP HTTP collector (`http://localhost:4318`). | Active | `src/instrumentation-otel.ts` |
| **Vercel Hosting & Speed Insights**| Hosting & CWV | Production deployment platform and real-time Core Web Vitals performance analytics. | Active | `src/app/layout.tsx` |
| **Sentry** | Observability | Application performance monitoring, client/server error tracking, and MCP server instrumentation. | Active | `sentry.client.config.ts`, `sentry.server.config.ts` |
| **n8n Workflow Engine** | Automation Engine | Self-hosted workflow automation engine (`n8n.ruhvi.in`) driving AI blog draft generation and background tasks. | Active | `src/app/api/operations/blog/generate-draft/route.ts` |
| **Motion (Framer Motion)** | UI Animation | Hardware-accelerated 60fps animations, layout transitions, and micro-interactions for Live Worker Workspace. | Active | `src/components/co-founder/workspace/LiveWorkspace.tsx` |
| **Expo Camera** | Mobile Scanning | High-performance native barcode scanning library powering the mobile Inventory Scan & Add workflow. | Active | `ruhvi-mobile_DO_NOT_DELETE/package.json`, `ruhvi-mobile_DO_NOT_DELETE/src/screens/InventoryScanScreen.tsx` |
| **JsBarcode** | Barcode Generation | Industry-standard vector SVG barcode encoding engine powering A4 sheet and thermal roll barcode printing. | Active | `package.json`, `src/app/operations/inventory/barcode/page.tsx` |
| **QRCode** | QR Code Generation | Zero-cloud offline QR code generation engine powering Google Authenticator TOTP 2FA enrollment. | Active | `package.json`, `src/app/api/auth/mfa/setup/route.ts` |
| **otplib (RFC 6238 TOTP)** | Two-Factor Authentication (2FA) | Cryptographic TOTP token generation, HMAC-SHA1 validation, master emergency email fallback, and backup code hashing for backend staff logins. | Active | `src/lib/auth/totp.ts`, `src/app/api/auth/mfa/*` |

---

## 2. DNS Infrastructure & Domain Architecture (ডোমেন ও সাব-ডোমেন ম্যাপিং)

**Authoritative Name Servers:** `mariah.ns.cloudflare.com`, `newt.ns.cloudflare.com` (Managed via Cloudflare DNS)

### A. Web Portals & Web App Subdomains

| Domain / Subdomain | Target / IP / Proxy | Purpose / Application Function |
| :--- | :--- | :--- |
| **`ruhvi.in`** | `216.198.79.1` (Direct A Record) | **Main Customer Storefront**: Primary e-commerce website for customers to browse catalog, cart, and checkout. |
| **`www.ruhvi.in`** | `ruhvi.in` (CNAME) | **Storefront Redirect Alias**: Standard `www` alias pointing to the root storefront. |
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

---

## 4. Registered Skills (এআই এজেন্ট দক্ষতা)

### A. Local Workspace Skills (`.agents/skills/`)
1. **ai-ui-ux-motion-engine**: Minimalist 3D particle simulations, Grok-inspired dynamic dot matrix avatar bodies, and reactive spatial animations.
2. **api-and-interface-design**: Standards for stable REST/GraphQL endpoint creation, type contracts, and module boundaries.
3. **code-review-and-quality**: Multi-axis code reviews evaluating architectural alignment, type safety, and edge-case handling.
4. **code-simplification**: Code refactoring for readability, maintainability, and complexity reduction without altering behavior.
5. **debugging-and-error-recovery**: Systematic root-cause debugging workflows for broken builds, runtime errors, and test failures.
6. **frontend-ui-engineering**: Production-grade, accessible (WCAG compliant), responsive UI building and design system implementation.
7. **gia-human-conversation**: Humanized customer support and jewellery shopping conversations for GIA (Golden Concierge) across English, Bengali, Banglish, and Hindi without robotic framing.
8. **hallmark**: Anti-slop frontend and visual design principles to produce bespoke, high-craft web UI aesthetics.
9. **humanizer**: Editorial engine and AI text sanitizer that detects and removes synthetic filler, robotic cadence, and superficial fluff.
10. **performance-optimization**: Cross-stack performance optimization (Core Web Vitals, N+1 DB queries, JS payload reductions).
11. **planning-and-task-breakdown**: Structured task breakdown, scope estimation, and ordering for complex feature implementations.
12. **playwright**: End-to-End (E2E) test suite authoring, execution, and browser automation debugging for Project Ruhvi.
13. **ruhvi-product-photography**: Luxury jewelry commercial product photography generation protocol strictly preserving exact product design, stone settings, and metal geometry.
14. **scrapling-official**: Adaptive web crawling and intelligence scraping with HTTP, stealth browser rendering, and dynamic page parsing for Worker 5 (Competitor AI).
15. **security-and-hardening**: Code hardening against OWASP vulnerabilities, safe input handling, auth security, and dependency auditing.
16. **understand (Knowledge Graph Suite)**: Codebase comprehension and knowledge graph suite consisting of 9 dedicated sub-skills:
    - `understand-chat`: Direct Q&A on codebase structure using graph metadata.
    - `understand-dashboard`: Interactive web visualizer for system architecture.
    - `understand-diff`: Git diff and pull request dependency analysis.
    - `understand-domain`: Business domain flow extraction and mapping.
    - `understand-explain`: Deep-dive explanation of specific modules/functions.
    - `understand-figma`: Figma design file parsing into design tokens/components.
    - `understand-knowledge`: LLM wiki & topic cluster graph generation.
    - `understand-onboard`: Interactive developer onboarding document creation.

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
- **Telemetry**: Sentry/OTel client traces sample rate capped at 10% in production.
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


