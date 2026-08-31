# Ruhvi Jewels — Master Architecture, Operations, and Implementation Encyclopedia

This document is the exhaustive "A to Z" reference for the Ruhvi Fine Jewellery E-commerce platform. It details every system, subdomain, database schema, third-party tool, AI infrastructure, and operational workflow that powers the business.

---

## 1. Executive Summary & Core Technologies

Ruhvi is a headless, modern e-commerce storefront utilizing a micro-frontend-like architecture driven by Next.js Middleware. A single codebase powers 7 distinct portals to manage every aspect of the business.

### Primary Technology Stack
- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL, Storage, Row-Level Security)
- **Hosting**: Vercel (Frontend & Serverless APIs), Hostinger (Domain), Cloudflare (DNS)

### Integrations Matrix (Tools & Platforms)
| Tool / Platform | Category | Purpose | Data Source / How it Works |
|-----------------|----------|---------|----------------------------|
| **Supabase** | Database | Single Source of Truth. | Stores all master data. Uses custom JWTs for secure RLS. |
| **Firebase** | Authentication | Client-side login. | Handles Email, Google OAuth, Phone OTP. Bridged to Supabase via backend session minting. |
| **PhonePe** | Payments | Gateway for checkout. | Processes payments. Includes a custom state machine for Partial COD (10% upfront). |
| **Shiprocket** | Logistics | Fulfillment & Tracking. | Generates AWBs, routes orders, and syncs tracking statuses back to the database. |
| **PostHog** | Analytics | Product analytics & CX. | Tracks pageviews, e-commerce funnels, and session replays (masking sensitive PII via `ph-no-capture`). |
| **Meta CAPI / Pixel** | Marketing | Ad conversion tracking. | Server-side conversion API scoped strictly to checkout and product pages for ROAS tracking. |
| **Google Analytics 4**| Analytics | SEO & Traffic. | Proxied through PostHog via `gtag.ts` helpers. |
| **EspoCRM** | Support CRM | Agent Helpdesk. | Self-hosted on a VPS. Agents manage tickets here, syncing bidirectionally with Supabase via webhooks. |
| **Cloudinary** | Media | Image Optimization. | Hosts and delivers highly optimized product images and galleries. |
| **Brevo** | Marketing | Campaigns & Automation. | Integrated via MCP for AI-driven email campaigns and abandoned cart flows. |
| **Resend** | Emails | Transactional alerts. | Delivers Welcome, Order Confirmation, and Password Reset emails securely. |
| **FCM & WhatsApp** | Push / SMS | System notifications. | FCM for push notifications; WhatsApp Business API for order alerts. |
| **Cloudflare Turnstile**| Security | Bot Protection. | Secures the checkout flow from automated scraping and card-testing. |
| **Sentry** | Observability | Error Tracking. | Application performance monitoring. |
| **DeepSeek** | AI Provider | Generation & Concierge. | Powers the Gia support bot and SEO copy generation. Integrated with a multi-credential failover engine. |

---

## 2. Subdomains & Portals Architecture (The "Where")

The platform operates from a single Next.js codebase. `src/middleware.ts` routes traffic based on the `Host` header to isolate environments and apply strict Role-Based Access Control (RBAC). *(Note: `auth.ruhvi.in` has been deleted and is no longer in use).*

### 2.1. `ruhvi.in` (Main Storefront)
- **Purpose**: The public-facing catalog, shopping cart, checkout, and customer account dashboard.
- **Data Flow**: Heavily statically generated (ISR). Fetches product data from Supabase, cached in Redis. 

### 2.2. `admin.ruhvi.in` (Master Admin Dashboard)
- **Purpose**: High-level platform administration and global settings.
- **Features**: Central audit logs, AI control center (fallback configurations), Master Data Export (streaming CSV/JSON), and dynamic UI interface panels for configuring the AI models.

### 2.3. `operations.ruhvi.in` (Operations & Inventory)
- **Purpose**: Supply chain, procurement, and QA analytics.
- **Features**: Product CRUD, inventory tracking, dynamic profit calculators, Quality Control (QC) logs, and analytics on production speed and material cost.

### 2.4. `orders.ruhvi.in` (Logistics & Fulfillment)
- **Purpose**: Processing customer orders.
- **Features**: Dashboard to view orders, generate Shiprocket AWBs, print labels, and track RTOs (Return to Origin).

### 2.5. `support.ruhvi.in` (Customer Helpdesk)
- **Purpose**: The customer-facing ticket creation portal and AI chatbot (Gia) interface.

### 2.6. `crm.support.ruhvi.in` (Internal EspoCRM Agent Console)
- **Purpose**: A totally separate PHP/MySQL app on a VPS where human support agents log in to reply to tickets.

### 2.7. `marketing.ruhvi.in` (Ads & Campaign Hub)
- **Purpose**: Real-time ROAS, CPA, and campaign optimization metrics. Manages Meta Pixel, Google Ads, and Brevo automation parameters.

---

## 3. Database Architecture (Supabase / Postgres)

Supabase is the heart of the system. It handles all master data.

### 3.1. Identity & Profiles
- **`users`**: The core profile (email, phone, `wallet_balance`, `reward_coins`). Uses UUIDs as the primary key.
- **`customer_identities`**: A junction table that maps multiple Firebase UIDs (e.g., if a user logs in via Google and Phone) to a single Supabase `users.id` UUID.

### 3.2. E-Commerce Engine
- **`categories` & `products`**: The catalog. Products contain base metal, plating microns, weight, and a `search_vector` (`tsvector`) for full-text search.
- **`product_variants`**: SKU-level variants, maintaining independent `stock_quantity` and `reorder_point`s.

### 3.3. Financial Ledgers
- **`wallet_ledger`**: Immutable ledger of wallet credits/debits.
- **`reward_coin_ledger`**: Ledger for reward coins.

### 3.4. Operations & Supply Chain
- **`inventory_movements`**: Immutable log of every stock change.
- **`suppliers` & `product_supplier_costs`**: Tracks lead times, quality ratings, and cost variances.
- **`quality_control_logs`**: Logs defects (e.g., uneven plating).
- **`production_batches`**: Tracks manufacturing batches.
- **`rto_records`**: Logs return-to-origin data manually or synced via Shiprocket.

### 3.5. System & Telemetry
- **`audit_logs`**: Tracks all staff/admin actions.
- **`ai_logs` & `ai_failure_diagnostics`**: Tracks AI token usage, latency, and failovers.

---

## 4. Authentication, Security & Identity Systems

Ruhvi uses a sophisticated **Hybrid Identity Architecture** to bypass Firebase's limitations while maintaining its frontend ease-of-use. 

1. **Client Login**: Customer logs in via Firebase Auth (Google/OTP/Email).
2. **Session Minting**: The Firebase ID token is sent to `POST /api/auth/session`. The server verifies it via Google JWKS.
3. **Identity Resolution**: The server calls the `resolve_customer_identity` Supabase RPC. This checks the `customer_identities` table, creates a user if new, or maps it to an existing Supabase UUID.
4. **Custom JWT**: The server mints an `httpOnly` cookie (`__session`) containing the Supabase UUID as the `sub` claim.
5. **Data Access (RLS)**: Row Level Security policies exclusively read this custom JWT.
6. **Hybrid Login Bridge**: If a legacy user logs in directly via Supabase Auth, the system seamlessly verifies their credentials, dynamically provisions a Firebase Auth account via Google Identity Toolkit, and syncs the tokens.

---

## 5. Wallet & Rewards System

The digital wallet and reward points system drives customer retention and loyalty.

- **Authentication Bonus**: When a new user completely authenticates and verifies their email and mobile number for the first time, they are instantly credited with **₹50 Wallet Balance**.
- **Referral Rewards**: 
  - **Referrer**: Receives 500 Reward Coins (worth ₹50) only *after* the referee's order is delivered and the 7-day return window expires (Anti-Fraud). Coins expire in 100 days and require a ₹250 minimum order to redeem.
  - **Referee**: Receives ₹100 Wallet Balance (₹50 signup + ₹50 referral).
- **Booking Cashback**: Customers earn cashback (in Reward Coins or Wallet Balance, configurable in Admin) on successful purchases. 
- **Restrictions**: Wallet balances are strictly non-withdrawable to bank accounts; they can only be used for purchases on the Ruhvi platform.

---

## 6. Main Website (ruhvi.in) - E-Commerce Engine

### 6.1. Performance & Rendering
- **ISR & Suspense**: The homepage and catalogs are statically rendered (`unstable_cache`) with a 1-hour revalidation. Dynamic data streams to the client using React `<Suspense>`.
- **Redis Caching**: Supabase queries for categories and settings are wrapped in an Upstash Redis cache with a 300s TTL. Admin updates instantly invalidate this cache.
- **Search Engine**: Utilizes PostgreSQL's native `tsvector` with a GIN index (`websearch_to_tsquery`), allowing typos and prefix matching instantly on the backend.

### 6.2. Cart & Checkout Flow
- **Slim Cart**: The shopping cart is stored in `localStorage` containing only `{ product_id, quantity, price_at_add }`. It hydrates full product details in-memory by batch-fetching `/api/products/batch`.
- **Partial COD Strategy**: To reduce RTO (Return to Origin) losses, orders exceeding ₹2000 require a 10% upfront payment via PhonePe. The remaining balance is marked for Cash on Delivery.
- **COD Blocking System**: The system monitors customer RTO history and cancellation rates. If a user has too many failed COD deliveries (high RTO rate) or excessive cancelled COD requests, the system automatically **blocks the COD option** for that user at checkout, forcing them to use prepaid methods.
- **Checkout Security**: Protected by Cloudflare Turnstile to prevent card-testing bots.

---

## 7. Operations & Inventory Dashboard (operations.ruhvi.in)

This portal manages the physical product lifecycle, offering deep analytics for supply chain efficiency.

### 7.1. Product Management
- **SKU Generation**: SKUs are auto-generated based on variant specs (`Prefix-Size-Metal`).
- **AI Content Generator**: By inputting base metal, plating microns, and weight, staff can hit "Generate". DeepSeek AI writes SEO-optimized titles, 150-word descriptions, and meta tags directly into the form.

### 7.2. Analytics & Profit Calculator
- **Dynamic Profit Calculator**: Automatically calculates Gross/Net Profit, Margin %, and Break-even points by factoring Base Price, Packaging Cost, Shipping, and Taxes. It outputs actionable signals (e.g., `Margin ≥ 25% -> ✅ Go Ahead`, `Margin < 12% -> 🔴 Don't Sell`).
- **Operations Analytics**: Dashboard views tracking production speed, supplier quality ratings, and material cost variance over time.
- **Stock Alerts**: Real-time alerts for Low Stock (quantity ≤ reorder point) and Dead Stock (no stock_out movement in >60 days).

---

## 8. Orders & Logistics Hub (orders.ruhvi.in)

The operational backend for fulfillment and routing.
- **Order Pipeline**: Orders are routed here immediately after checkout. They flow strictly through: `confirmed` -> `processing` -> `shipped` -> `delivered` (or `rto`).
- **Shiprocket Integration**: Generates AWBs (Airway Bills), prints shipping labels, and assigns couriers based on weight and pincode serviceability.
- **Tracking Sync**: A cron job/webhook architecture pulls tracking updates from Shiprocket and stores them in `tracking_updates`. This data is exposed to the customer dashboard and the Gia AI chatbot.

---

## 9. Customer Support & Ticketing System

The support system uses a **Bidirectional Hybrid Architecture** connecting the Next.js storefront to a self-hosted EspoCRM instance (`crm.support.ruhvi.in`).

### 9.1. Ticket Generation & Processing
- **Logged-in Users**: When an authenticated user creates a ticket on `support.ruhvi.in`, the system pulls their UUID from the `__session` cookie. The ticket is hard-linked to their customer profile and order history. 
- **Guest Users**: Guest users must provide an email and order number to create a ticket. The system attempts to resolve the email to an existing order, but the ticket is created as a "Guest Ticket" with restricted visibility until verified.
- **AI Ticket Creation**: If the Gia chatbot cannot resolve an issue via the Resolve-First Protocol, it can autonomously generate a support ticket on behalf of the user, summarizing the chat context for the agent.

### 9.2. Synchronization (Webhooks) & Auto-Assignment
- **Push (Next.js -> EspoCRM)**: The Next.js API pushes a REST payload to EspoCRM, creating a Case. 
- **Auto-Assignment**: Within EspoCRM, routing rules automatically assign the incoming ticket to specific agent groups (e.g., Returns, Payment Issues, General) based on the ticket category selected on the website.
- **Pull (EspoCRM -> Next.js)**: When an agent replies or changes a status (e.g., to "Closed"), a custom PHP `AfterSave` hook fires an HMAC-SHA256 signed POST request to the Next.js webhook, updating the Supabase ticket instantly.
- **Live Context Panel**: Agents in EspoCRM have a custom sidebar panel that securely queries Next.js `/api/integrations/espo/context` to display the customer's live wallet balances and order tracking without duplicating the data in MySQL.

---

## 10. AI Infrastructure & Concierge "Gia"

Ruhvi integrates AI deeply into operations and customer service.

### 10.1. AI Support Chatbot (Gia)
- **Resolve-First Protocol**: Gia is instructed to resolve queries independently using customer context (Wallet ledger, Reward Coins, Order tracking, Return requests). It is explicitly forbidden from opening a support ticket unless it absolutely cannot resolve the issue.
- **Context Enrichment**: When a logged-in user chats, the server securely extracts their UUID from the `__session` JWT to fetch their private data via the service-role client, injecting it into Gia's prompt.
- **Ticket Escalation**: When Gia escalates, it uses a predefined schema to output JSON instructing the backend to create a ticket in Supabase (which then syncs to EspoCRM).

### 10.2. Admin Dashboard Options & AI Control Center
- **Interface & Configuration**: The Admin Dashboard (`admin.ruhvi.in`) provides a dedicated UI to configure AI models, system prompts, and toggle features on/off.
- **Multi-Credential Fallback Engine**: The system stores multiple API keys per AI provider (DeepSeek/Gemini). Admin can configure the fallback sets. If a primary key fails, it falls back to the next available key.
- **Rate Limits & Cooldowns**: If an API key hits a rate limit (`RATE_LIMIT_EXCEEDED`), the system applies an atomic DB-level optimistic lock, places the key on exponential backoff, and instantly fails over without dropping the user's request. Admin can configure `maxTotalAttempts` and cooldown periods.
- **Diagnostics**: All AI calls log their P95 latency and metadata. Failures are stored in `ai_failure_diagnostics` with a 24-hour automatic TTL expiration.

---

## 11. Marketing, Analytics & Telemetry (marketing.ruhvi.in)

Data-driven marketing, ad tracking, and user retention.

### 11.1. Ad Tracking & Analytics
- **Meta Ads (CAPI & Pixel)**: Server-side conversion tracking. Meta Pixel is strictly scoped to checkout and product pages to reduce global payload weight, firing `PageView` and `ViewContent` for ad attribution.
- **Google Ads & GA4**: Proxied through PostHog via `gtag.ts` helpers to prevent loading multiple redundant tracking scripts.
- **PostHog**: The primary analytics engine tracking e-commerce funnels. PostHog's `ph-no-capture` CSS class is rigorously applied to hide sensitive PII from Session Replays.

### 11.2. Communications & Push Notifications
- **Brevo**: Handles automated marketing campaigns (abandoned cart sequences). Integrated via the Model Context Protocol (MCP) to allow AI tools to read campaign stats and generate email templates.
- **Resend**: Handles purely transactional emails requiring high deliverability (Welcome, Password Reset, Order Confirmation).
- **Push Notifications (FCM)**: Firebase Cloud Messaging delivers browser/device push notifications for marketing blasts, cart reminders, and shipping updates, completely replacing older tools like OneSignal.

---
*This master document is maintained as the architectural source of truth for Ruhvi Jewels. Any addition of subdomains, tables, integrations, or operational workflows must be documented here.*
