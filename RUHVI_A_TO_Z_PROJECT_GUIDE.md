# Ruhvi E-Commerce - A to Z Master Knowledge Base

**Purpose:** This document is the ultimate, highly-detailed master reference and knowledge base for the entire Ruhvi ecosystem. It covers all frontend features, backend architecture, subdomain routing, platform tools & services, admin/staff portals, integrations, AI co-founder & Gia operations, analytics, email routing, and complex business logic (wallets, reward coins, COD rules, fraud prevention). **Whenever new features, platforms, or tools are added, they MUST be appended to this document.**

---

## 1. System Architecture & Subdomains (The "Where")

The platform runs as a Next.js 15 (App Router) monolith that dynamically isolates and routes traffic based on the incoming `Host` header via `src/middleware.ts`, connected to specialized backends and secure Cloudflare Argo Tunnels.

### Active Subdomains & Roles:

1. **`ruhvi.in` / `www.ruhvi.in` (Main Storefront Frontend):**
   - Public-facing shopping cart, product catalog, search engine, checkout, gift guides, and customer profile dashboard.
   - Built with Next.js 15 App Router and cached via Supabase Postgres + Redis.

2. **`admin.ruhvi.in` (Master Admin Panel):**
   - High-level executive control center: RBAC staff management, live system audit logs, AI Control Center & Key Rotation engine, and master financial/sales data exports.

3. **`operation.ruhvi.in` / `operations.ruhvi.in` (Inventory & QA):**
   - Factory, supply chain, and warehouse operations hub.
   - Features: SKU generator, AI product listing copywriter, dynamic profit & margin calculator, low/dead stock alarms, and QC defect tracking.

4. **`orders.ruhvi.in` (Logistics & Fulfillment):**
   - Warehouse dispatch and fulfillment portal.
   - Features: Shiprocket integration, bulk AWB generation, shipping label printing, manifest creation, and live RTO (Return to Origin) tracking.

5. **`support.ruhvi.in` (Customer Helpdesk & AI Chat):**
   - Public-facing customer service portal where users view ticket statuses, submit support requests, and converse with the autonomous AI Concierge (Gia).

6. **`crm.support.ruhvi.in` (EspoCRM Agent Console):**
   - Dedicated self-hosted EspoCRM (PHP/MySQL) instance on a VPS.
   - Human support agents manage cases, view live customer context panels, and reply to customer tickets with bidirectional webhook sync back to Supabase.

7. **`marketing.ruhvi.in` (Marketing & Growth Hub):**
   - Central command for tracking ROAS, CAC/CPA, campaign metrics, Meta CAPI conversion funnels, Google Analytics 4, and Brevo marketing automations.

8. **`tech.ruhvi.in` (Engineering & Infrastructure Portal):**
   - Engineering maintenance hub with 13 modules:
     - **IAM:** Identity & access control for internal technical roles.
     - **API Keys:** Key generation and permission scope management (Read/Write/MCP).
     - **Feature Flags:** Dynamic toggles for experimental features.
     - **AI Settings:** Configuration of AI prompts, model overrides, and temperature.
     - **Sentry:** Real-time error diagnostics and stack-trace inspector.
     - **SEO Tools & Design System:** Meta tags manager and UI token inspector.
     - **Task Manager & Audit Logs:** Internal sprint boards and low-level system logs.

9. **`co-founder.ruhvi.in` / `cofounder.ruhvi.in` (AI Co-Founder Suite):**
   - Executive AI partner interface featuring real-time multimodal voice chat (LiveKit WebRTC + Gemini 2.0 Flash), proactive business health audits, competitor scraping via Playwright, and cryptographic safe-mutator approvals.

10. **`ai.ruhvi.in` (AI Service Gateway):**
    - Backend gateway for heavy AI inference, model proxies, and microservices (secured via Cloudflare Argo Tunnel).

11. **`n8n.ruhvi.in` (Workflow Automation Engine):**
    - Self-hosted n8n instance for asynchronous automation, AI webhooks, multi-step marketing sequences, and custom integration flows (secured via Cloudflare Argo Tunnel).

12. **`send.ruhvi.in` (Email Delivery Subdomain):**
    - Dedicated Amazon SES subdomain for high-deliverability transactional notifications.

---

## 2. Infrastructure & Platform Roles

### Hosting & Routing
- **Cloudflare:** Primary DNS management, SSL/TLS encryption, Turnstile bot protection at checkout, and Argo Tunnels for zero-trust exposure of internal backend services (`ai.ruhvi.in`, `n8n.ruhvi.in`).
- **Vercel:** Hosts the Next.js storefront, Edge middleware, serverless API routes, and background cron triggers.
- **Hostinger:** Domain registrar for `ruhvi.in`.
- **GCP / VPS:** Hosts the self-hosted EspoCRM backend instance.

### Multi-Provider Email Architecture & Operational Inboxes

The ecosystem uses a dedicated multi-provider email strategy to isolate reputations and prevent deliverability issues:

1. **`support@ruhvi.in` (Zoho Mail):**
   - **Role:** Direct customer support inbox, customer queries, and support ticket communications.
2. **`admin@ruhvi.in` (Zoho Mail):**
   - **Role:** Third-party merchant and platform registrations (Shiprocket, PhonePe, Paytm, Cloudflare, Hostinger, GCP, etc.).
3. **`notifications@ruhvi.in` (Resend - `RESEND_SENDER_EMAIL`):**
   - **Role:** System-wide transactional emails sent via Next.js backend API:
     - Order confirmations, shipping/AWB tracking updates, delivery notifications, cancellations, and refunds.
     - Support ticket creation, staff reply notifications, and resolution updates.
     - User email verification and password reset links.
     - Welcome onboarding emails.
4. **`marketing@ruhvi.in` / `noreply@ruhvi.in` (Brevo - `BREVO_SENDER_EMAIL`):**
   - **Role:** Automated growth & marketing sequences:
     - Abandoned cart recovery campaigns, win-back retention offers, and birthday/anniversary discounts.
     - Contact list management and subscriber attribute sync.
     - AI tool integrations via Brevo MCP SDK.
5. **Firebase Auth Native Mail:**
   - **Role:** Direct Firebase OTP verifications and passwordless authentication fallback links.
6. **Amazon SES (`send.ruhvi.in`):**
   - **Role:** Dedicated infrastructure subdomain configured for high-volume system transactional and feedback loops.

---

## 3. Frontend Features & Business Logic (`ruhvi.in`)

### Tech Stack:
- **Framework:** Next.js 15 App Router (React 19), TypeScript.
- **Styling:** Vanilla CSS & Tailwind CSS utility system.
- **Forms & Validation:** React Hook Form with Zod schemas.
- **Media & UX:** Photoswipe for high-res jewelry zoom, React Hot Toast for micro-feedback, Cloudinary responsive loaders.

### Hybrid Identity Authentication:
1. User logs in on the frontend using Firebase Auth (Phone OTP or Google Sign-In).
2. The Firebase ID token is dispatched to `/api/auth/session`.
3. The server verifies the token with Firebase Admin, looks up or creates the user in Supabase (`customer_identities`), and sets an HTTP-only `__session` cookie containing a signed Supabase JWT.
4. This allows the frontend to query Supabase directly with native Row-Level Security (RLS) enforcement.

### Wallet & Reward Coin Economy:
- **Signup Bonus:** New users who verify their phone/email automatically receive ₹50 in their Ruhvi Wallet.
- **Referral Engine (Anti-Fraud Guarded):**
  - Invitee gets ₹100 Wallet Balance (₹50 signup + ₹50 referral credit).
  - Referrer gets 500 Reward Coins (worth ₹50) **only after** the invitee's order is delivered AND the 7-day return window expires. If the order is returned, no reward is granted.
- **Cashback Mechanism:** Configurable % cashback awarded to customer wallets upon completed orders.
- **Restrictions:** Wallet balances cannot be withdrawn to bank accounts; they are strictly redeemable for store purchases.

### Smart Partial COD & Fraud Prevention:
- **Threshold Rule:** For orders exceeding ₹2000, customers must pay a 10% advance deposit online (via PhonePe). The remaining 90% is collected via Cash on Delivery.
- **Automated COD Blocking:** The backend tracks RTO (Return to Origin) history and canceled COD orders. If a user exceeds safe thresholds, COD is completely disabled for their account, forcing 100% prepaid checkout.

---

## 4. Customer Support Ecosystem (`support.ruhvi.in` & `crm.support.ruhvi.in`)

### Architecture:
- **Customer Facing:** `support.ruhvi.in` (Next.js) allows users to create tickets, upload attachments, and view resolution progress.
- **Staff Facing:** `crm.support.ruhvi.in` (Self-hosted EspoCRM on VPS).

### Bidirectional Real-Time Sync:
1. When a user submits a ticket, Next.js calls EspoCRM's REST API to create a Case.
2. EspoCRM categorizes and assigns the case to the appropriate agent pool.
3. When an agent replies in EspoCRM, a custom PHP `AfterSave` hook triggers a signed webhook back to `/api/webhooks/espocrm`, updating Supabase and alerting the customer via email/SMS.
4. **Live Context Sidebar:** When agents open a ticket in EspoCRM, an embedded panel fetches live order history, wallet balance, and shipping status from the Next.js API.

---

## 5. AI Concierge "Gia" (`support.ruhvi.in`)

Gia is the autonomous frontline customer support assistant:
- **Resolve-First Mandate:** Gia is strictly instructed to resolve customer queries immediately using injected real-time database context (live order tracking, return eligibility, wallet balance).
- **Context Injection:** When an authenticated customer opens chat, the server securely extracts their UUID and injects their recent orders, tracking status, and wallet ledgers into Gia's context window.
- **Autonomous Escalation:** If an issue strictly requires human intervention (e.g., damaged item requiring refund approval), Gia outputs a structured JSON payload that automatically opens an escalated ticket in Supabase and EspoCRM without making the user re-type their problem.

---

## 6. Master Admin & Operations (`admin.ruhvi.in` & `operation.ruhvi.in`)

### Master Admin (`admin.ruhvi.in`):
- **RBAC & IAM:** Granular access controls (Super Admin, Manager, Support Agent, Marketing Lead, Warehouse Staff).
- **Immutable Audit Logging:** Every create/update/delete action across products, inventory, and refunds is logged in `audit_logs`.
- **AI Control Center & Fallback Engine:**
  - Multi-key pool for DeepSeek and Gemini.
  - Automatic failover: If a key encounters rate limits or errors, an atomic lock marks the key in backoff and routes immediately to the next credential.
  - Latency diagnostics (P95) and token burn monitoring.
- **Data Export:** Streaming CSV/JSON generation for bookkeeping.

### Operations Hub (`operation.ruhvi.in`):
- **SKU Generation:** Standardized naming (`[Prefix]-[Size]-[Metal]-[Plating]`).
- **AI Listing Writer:** Generates SEO-ready titles, descriptions, and meta tags directly into the product catalog form.
- **Dynamic Margin Calculator:** Evaluates Base Metal Cost + Making Charges + Packaging + Courier Fees + GST to compute real-time gross/net margins and break-even points.
- **Inventory Alarms & QC:** Alerts for low stock and dead stock (>60 days no movement), plus quality assurance defect logs.

---

## 7. AI Co-Founder System (`co-founder.ruhvi.in`)

An autonomous executive AI suite designed for strategic decision-making:
- **Multimodal Voice Engine:** Real-time WebRTC voice interaction with natural interruption handling via LiveKit Cloud and Gemini 2.0 Flash Multimodal Live.
- **Proactive Anomaly Detection:** Automated cron jobs audit revenue velocity, inventory turnover, and conversion rates, proactively alerting founders to issues.
- **Safe Mutator Protocol (Human-in-the-Loop):** When the AI proposes database modifications (e.g., flash sales, price updates, bulk coupons), it generates a cryptographically signed action request that requires manual approval by an authorized administrator before execution.
- **Playwright Competitor Automation:** Headless browser integration allowing the AI to scrape competitor pricing, monitor catalog trends, and capture UI snapshots.

---

## 8. Third-Party Integrations & Tool Registry

| Service | Category | Subdomain / Layer | Purpose |
| :--- | :--- | :--- | :--- |
| **Supabase** | Database & Auth | Core Data Layer | Primary PostgreSQL, RLS policies, JSON API, storage buckets |
| **Vercel** | Hosting & Compute | Frontend / Edge | Next.js Serverless hosting, Edge Middleware, Cron triggers |
| **Cloudflare** | Edge Security & DNS | Global Edge / Tunnels | DNS authority, Turnstile bot protection, Argo Tunnels for AI/n8n |
| **VPS / Compute** | Dedicated Hosting | `crm.support.ruhvi.in` | Dedicated VPS running EspoCRM (PHP/MySQL) |
| **Hostinger** | Domain Registrar | `ruhvi.in` | Domain registration and DNS management |
| **Cloudinary** | Digital Asset Management | Storefront Media | High-resolution image hosting, automatic WebP/AVIF transformation |
| **PostHog** | Product Analytics | `marketing.ruhvi.in` | Conversion funnels, session replays, custom event pipelines |
| **Google Analytics 4** | Web Analytics | `marketing.ruhvi.in` | Traffic analytics and organic search tracking |
| **Meta CAPI & Pixel** | Ad Conversion Tracking | `marketing.ruhvi.in` | Server-side conversion tracking for ad optimization |
| **PhonePe** | Payment Gateway | Checkout (`ruhvi.in`) | Digital payments (UPI, Cards, Netbanking) and partial COD deposits |
| **Shiprocket** | Logistics & Shipping | `orders.ruhvi.in` | Courier integration, automated AWB generation, real-time tracking |
| **Zoho Mail** | Corporate Email | Corporate Mailbox | Business email hosting (`@ruhvi.in`) |
| **Brevo** | Marketing Automation | `marketing.ruhvi.in` | Email campaigns, abandoned cart journeys, customer engagement |
| **Amazon SES** | Transactional Mail | `send.ruhvi.in` | High-volume transactional emails and feedback loops |
| **Resend** | Transactional Mail | Next.js API | Core transactional notifications (order confirmations, welcome emails) |
| **Firebase Auth & FCM** | Auth & Mobile Push | Auth & Notifications | Phone OTP authentication, Push notifications |
| **LiveKit** | Real-Time Voice | `co-founder.ruhvi.in` | WebRTC audio streaming for AI Co-Founder voice chat |
| **n8n** | Automation Engine | `n8n.ruhvi.in` | Self-hosted visual workflow automations and background webhooks |
| **Sentry** | Error Monitoring | `tech.ruhvi.in` | Runtime exception tracking, performance tracing, error telemetry |

---

## 9. MCP (Model Context Protocol) & Agent Skills

- **Ruhvi Custom MCP (`/api/mcp`):** Exposes 16 granular tools (11 Read, 5 Write) allowing authorized AI agents to query orders, verify inventory, check customer balances, and create support cases with strict API key permission scopes.
- **Brevo MCP:** Enables AI models to inspect campaign open rates and draft marketing broadcasts.
- **Agent Skill Guidelines:** IDE agents operate under standardized skill sets (Playwright E2E, Chrome DevTools debugging, Modern Web standards, and Security auditing) to ensure clean, maintainable, and regression-free development.

---
*Note: Whenever any new integration, subdomain, email provider, security policy, or business logic is implemented, this master document MUST be updated immediately.*
