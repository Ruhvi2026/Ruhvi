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
| **DeepSeek AI** | AI LLM Engine | DeepSeek LLM models (`deepseek-chat`, `deepseek-reasoner`) powering Gia (Support Bot) and automated product SEO copy generation. | Active | `src/lib/ai/providers/deepseek.ts`, `src/lib/ai/index.ts` |
| **OpenTelemetry (OTel)** | Distributed Tracing | Server-side trace telemetry export pipeline sending node HTTP/Express spans to local Jaeger / OTLP HTTP collector (`http://localhost:4318`). | Active | `src/instrumentation-otel.ts` |
| **Vercel Hosting & Speed Insights**| Hosting & CWV | Production deployment platform and real-time Core Web Vitals performance analytics. | Active | `src/app/layout.tsx` |
| **Sentry** | Observability | Application performance monitoring, client/server error tracking, and MCP server instrumentation. | Active | `sentry.client.config.ts`, `sentry.server.config.ts` |
| **n8n Workflow Engine** | Automation Engine | Self-hosted workflow automation engine (`n8n.ruhvi.in`) driving AI blog draft generation and background tasks. | Active | `src/app/api/operations/blog/generate-draft/route.ts` |
| **Motion (Framer Motion)** | UI Animation | Hardware-accelerated 60fps animations, layout transitions, and micro-interactions for Live Worker Workspace. | Active | `src/components/co-founder/workspace/LiveWorkspace.tsx` |

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

---

## 4. Registered Skills (এআই এজেন্ট দক্ষতা)

### A. Local Workspace Skills (`.agents/skills/`)
1. **ai-ui-ux-motion-engine**: Minimalist 3D particle simulations, Grok-inspired dynamic dot matrix avatar bodies, and reactive spatial animations.
2. **api-and-interface-design**: Standards for stable REST/GraphQL endpoint creation, type contracts, and module boundaries.
3. **code-review-and-quality**: Multi-axis code reviews evaluating architectural alignment, type safety, and edge-case handling.
4. **code-simplification**: Code refactoring for readability, maintainability, and complexity reduction without altering behavior.
5. **debugging-and-error-recovery**: Systematic root-cause debugging workflows for broken builds, runtime errors, and test failures.
6. **frontend-ui-engineering**: Production-grade, accessible (WCAG compliant), responsive UI building and design system implementation.
7. **performance-optimization**: Cross-stack performance optimization (Core Web Vitals, N+1 DB queries, JS payload reductions).
8. **planning-and-task-breakdown**: Structured task breakdown, scope estimation, and ordering for complex feature implementations.
9. **playwright**: End-to-End (E2E) test suite authoring, execution, and browser automation debugging for Project Ruhvi.
10. **security-and-hardening**: Code hardening against OWASP vulnerabilities, safe input handling, auth security, and dependency auditing.
11. **understand (Knowledge Graph Suite)**: Codebase comprehension and knowledge graph suite consisting of 9 dedicated sub-skills:
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
