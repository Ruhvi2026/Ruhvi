# Domain Migration Plan: `ruhvi.vercel.app` ➔ `ruhvi.in`

**Document Status:** Planned / Reference for Future Execution  
**Created Date:** 2026-10-10  
**Target Domain:** `ruhvi.in` & `www.ruhvi.in`

---

## Executive Summary
This document outlines the step-by-step roadmap, tool/service whitelisting checklist, codebase configurations, and potential risks when migrating the primary customer storefront from `ruhvi.vercel.app` to `ruhvi.in`.

---

## 1. Tool & Service Whitelisting Checklist

### A. Authentication & Identity Providers
- [ ] **Firebase Authentication:**
  - Nav: Firebase Console ➔ Authentication ➔ Settings ➔ **Authorized Domains**
  - Action: Add `ruhvi.in` and `www.ruhvi.in`.
  - Impact if missed: Google OAuth Login returns `auth/unauthorized-domain` error; Phone OTP / reCAPTCHA gets blocked.
- [ ] **Google Cloud Console (OAuth 2.0 Credentials):**
  - Nav: Google Cloud Console ➔ APIs & Services ➔ Credentials ➔ OAuth 2.0 Web Client ID
  - Action: Add `https://ruhvi.in` and `https://www.ruhvi.in` to **Authorized JavaScript origins**.
- [ ] **Meta for Developers (Facebook Login):**
  - Nav: Facebook App Dashboard ➔ App Settings ➔ Basic
  - Action: Set App Domains to `ruhvi.in`, Site URL to `https://ruhvi.in`, Privacy Policy URL to `https://ruhvi.in/privacy-policy`, and User Data Deletion URL to `https://ruhvi.in/data-deletion`.

### B. Security & Bot Protection
- [ ] **Cloudflare Turnstile (Checkout Protection):**
  - Nav: Cloudflare Dashboard ➔ Turnstile ➔ Manage Widget Settings
  - Action: Add `ruhvi.in` and `www.ruhvi.in` to **Widget Domains**.
  - Impact if missed: Turnstile fails at checkout (`src/app/checkout/page.tsx`), blocking COD and online checkout orders ("Domain Not Allowed").

### C. Payment Gateways
- [ ] **PhonePe Merchant Portal:**
  - Action: Verify and whitelist Webhook / Callback URL: `https://ruhvi.in/api/webhooks/phonepe`.
- [ ] **Paytm Merchant Portal (If active):**
  - Action: Verify Return / Callback URL: `https://ruhvi.in/api/checkout/paytm/callback`.

### D. Analytics, Tracking & SEO
- [ ] **Meta Events Manager (Pixel & CAPI):**
  - Nav: Meta Business Manager ➔ Brand Safety ➔ Domains
  - Action: Verify `ruhvi.in` domain and configure Aggregated Event Measurement (AEM) for Purchase & AddToCart events.
- [ ] **Google Analytics 4 (GA4):**
  - Action: Update GA4 Data Stream URL to `https://ruhvi.in`.
- [ ] **Google Search Console:**
  - Action: Add and verify `https://ruhvi.in` property; submit sitemap `https://ruhvi.in/sitemap.xml`.
- [ ] **PostHog Analytics:**
  - Nav: PostHog Project Settings ➔ Authorized Domains
  - Action: Add `https://ruhvi.in` for Session Replays and Heatmaps.
- [ ] **Sentry Error Tracking:**
  - Nav: Sentry ➔ Project Settings ➔ Allowed Domains
  - Action: Ensure `ruhvi.in` is listed.

---

## 2. Step-by-Step Migration Execution Plan

### Step 1: Vercel Domain Setup
1. Log into Vercel Dashboard ➔ Project Settings ➔ **Domains**.
2. Add `ruhvi.in` and `www.ruhvi.in` (configure `www.ruhvi.in` to redirect to `ruhvi.in`).

### Step 2: Cloudflare DNS Update
1. Open Cloudflare DNS dashboard for `ruhvi.in`.
2. Update apex A Record (`ruhvi.in`): Change IP from `216.198.79.1` to **`76.76.21.21`** (Vercel IP).
3. Update CNAME Record (`www.ruhvi.in`): Point to `cname.vercel-dns.com` or `ruhvi.in`.
4. Ensure Cloudflare SSL/TLS encryption mode is set to **Full (Strict)** to prevent redirect loops.

### Step 3: Vercel Environment Variables Update
Update the following environment variables in Vercel Project Settings:
- `NEXT_PUBLIC_APP_URL` = `https://ruhvi.in`
- `NEXT_PUBLIC_SITE_URL` = `https://ruhvi.in`

---

## 3. Codebase Architectural Assessment & Benefits

### A. Cross-Subdomain Session Cookie Alignment
- **Implementation in Code:** In `src/app/api/auth/session/route.ts`:
  ```ts
  ...(isProduction ? { domain: '.ruhvi.in' } : {})
  ```
- **Benefit:** Transitioning to `ruhvi.in` enables native wild-card cookie sharing across `ruhvi.in`, `admin.ruhvi.in`, `orders.ruhvi.in`, `support.ruhvi.in`, etc., resolving any previous cross-domain cookie rejection issues.

### B. Middleware Subdomain Routing
- `src/middleware.ts` is already configured for `ruhvi.in`. It correctly isolates admin/portal routes (`/admin`, `/operations`, etc.) from the customer storefront.

---

## 4. Risks & Mitigation Strategies
1. **Cloudflare SSL Redirect Loop:** Ensure Cloudflare SSL mode is **Full (Strict)**, not "Flexible".
2. **Legacy Verification Links:** Do not delete `ruhvi.vercel.app` from Vercel so older email verification links continue to resolve.
