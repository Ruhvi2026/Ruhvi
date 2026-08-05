# Project Integrations Audit

## Project Overview
**Name:** Ruhvi E-commerce
**Version:** 0.1.0
**Framework:** Next.js 15 (App Router)
**Language:** TypeScript
**Styling:** Tailwind CSS

---

## Technology Stack & Architecture Summary
The application is a modern, headless e-commerce storefront. It utilizes Next.js for server-side rendering and static generation. The architecture relies heavily on third-party integrations to handle authentication, payments, database management, images, and logistics.

**Key Architecture Points:**
- **Database:** Supabase (PostgreSQL) is the primary source of truth.
- **Authentication:** Uses Firebase Auth exclusively for all authentication (Email/Password, Phone OTP, Google, Facebook), paired with a custom JWT implementation for Supabase RLS.
- **Payments:** PhonePe integration is planned for checkout but account setup is pending.
- **Logistics:** Shiprocket is mocked/partially integrated.
- **Images/Data:** Cloudinary is used for optimized product image delivery. Supabase Storage is intended for CX data and site data.

---

## Active Integrations

| Tool / Service | Category | Purpose | Files Used | Env Variables | Status |
|----------------|----------|---------|------------|---------------|--------|
| **Next.js** | Framework | Core React framework. | `package.json`, `next.config.js` | None | Active |
| **Supabase** | Database / Storage | Primary database, data fetching. Storage for CX/site data. | `src/lib/supabase/*`, `src/types/database.ts`, `api` routes | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` | Active |
| **Firebase** | Authentication | Manages all authentication (Email/Password, OTP, OAuth). | `src/lib/firebase.ts`, `src/context/AuthContext.tsx`, auth pages | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Active |
| **Cloudinary** | Images | Hosting and optimizing product images. | `src/services/cloudinaryService.ts`, `src/lib/imageService.ts` | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Active |
| **Meta Pixel / CAPI** | Analytics/SEO | Conversion tracking for Meta ads. | `src/app/api/capi/route.ts` | `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` | Active |
| **Vercel Speed Insights** | Performance | Web Vitals performance monitoring. | `src/app/layout.tsx` | None | Active |
| **Cloudflare Turnstile** | Security | Bot protection during checkout. | `src/app/checkout/page.tsx` | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Active |
| **React Hook Form & Zod**| Forms/Validation| Validating complex forms (e.g., checkout, contact). | `src/app/checkout/page.tsx`, `src/app/contact/page.tsx` | None | Active |
| **Google Analytics** | Analytics/SEO | General traffic and user behavior tracking. | `src/app/layout.tsx` | GA Tracking ID (`G-7LY7LND9S9`) | Active |
| **React Hot Toast** | UI | Toast notifications across the app. | Multiple components | None | Active |
| **Photoswipe** | UI | Image gallery for product detail pages. | `src/app/products/[slug]/ProductDetailPageClient.tsx` (assumed) | None | Active |
| **OneSignal Web Push** | Marketing/Push | Marketing and engagement push notifications (abandoned cart, flash sales). | `src/components/OneSignalInit.tsx`, `public/OneSignalSDKWorker.js` | `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Active |
| **Firebase Cloud Messaging (FCM)** | System/Push | Transactional and system notifications (orders, shipping, OTP). | `src/lib/fcm.ts`, `src/components/FcmInit.tsx`, `public/firebase-messaging-sw.js` | `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Active |
| **Brevo** | Email | Transactional emails and automated cron email campaigns (Welcome, Abandoned Cart, Win-back, etc.). | `src/lib/brevo.ts`, `src/app/api/cron/automations/route.ts` | `BREVO_API_KEY`, `BREVO_SENDER_NAME`, `BREVO_SENDER_EMAIL` | Active |

---

## Planned but Incomplete Integrations

| Tool / Service | Category | Purpose | Status | Notes |
|----------------|----------|---------|--------|-------|
| **PhonePe** | Payment | Payment gateway for checkout. | Setup Pending | API not set yet; account setup is pending due to documentation. Code exists in `api/checkout/phonepe`. |
| **WhatsApp Business API**| SMS/Messaging | Sending order confirmations and shipping updates. | Setup Pending | WhatsApp Business setup is currently pending. Code exists in `src/lib/whatsapp.ts`. |
| **Shiprocket** | Logistics | Courier assignment, label generation, order sync. | Partially Implemented | API is mocked in `src/lib/shiprocket.ts`. A webhook route exists but relies on mocked logic. |

---

## Unused & Duplicate Integrations

| Tool / Service | Category | Reason for Flagging | Safe to Remove? |
|----------------|----------|---------------------|-----------------|
| **Razorpay** | Payment | An API route existed (`src/app/api/checkout/razorpay/route.ts`) but it was just a stub redirecting to PhonePe. | **Deleted during audit** |
| **Firebase Storage** | Storage | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is configured in environment variables, but Firebase is currently only used for OTP. | Yes (Remove from `.env`) |

---

## Environment Variable Inventory
*(Variable names only)*

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` *(Unused - Supabase does not use publishable keys; likely a Stripe leftover)*
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `VITE_CLOUDINARY_CLOUD_NAME` *(Duplicate/Unused - Next.js uses `NEXT_PUBLIC_`)*
- `VITE_CLOUDINARY_UPLOAD_PRESET` *(Duplicate/Unused)*
- `PHONEPE_MERCHANT_ID`
- `PHONEPE_SALT_KEY`
- `PHONEPE_SALT_INDEX`
- `PHONEPE_ENV`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` *(Unused - Firebase only used for OTP)*
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_META_PIXEL_ID`
- `BREVO_API_KEY`
- `BREVO_SENDER_NAME`
- `BREVO_SENDER_EMAIL`
- `SUPABASE_JWT_SECRET`

---

## Recommendations & Observations

1. **Dead Code (Razorpay):**
   The `/api/checkout/razorpay` route was a stub that redirected to PhonePe. **Recommendation:** This route was successfully deleted during this audit to avoid confusion.
2. **Authentication Architecture:** 
   The application uses Firebase Auth for all user authentication methods (Email, Phone, Google, Facebook) to simplify user management and leverage free SMS OTPs. Supabase Auth is disabled, and a Custom JWT implementation is used for Supabase RLS compatibility.
3. **Storage Strategy Clarified:**
   Cloudinary is actively used for hosting and serving optimized product images. Supabase Storage is intended exclusively for Customer Experience (CX) data, site data, tables, etc. Firebase Storage is not currently used.
4. **Environment Variables:**
   Remove `VITE_*` variables as they are not read by Next.js. Remove `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as it serves no purpose. Add `META_CAPI_ACCESS_TOKEN` to your `.env.local` to ensure the CAPI integration functions in production. Remove the unused `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

---

## Cleanup Checklist
- [x] Remove `src/app/api/checkout/razorpay` directory. *(Completed during audit)*
- [ ] Remove `VITE_CLOUDINARY_CLOUD_NAME` from `.env.local` / deployment environment.
- [ ] Remove `VITE_CLOUDINARY_UPLOAD_PRESET` from `.env.local` / deployment environment.
- [ ] Remove `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` from `.env.local` / deployment environment.
- [ ] Remove `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local` / deployment environment.

---

## Integration Register
*(Maintain this section moving forward whenever adding/removing services)*

| Service | Purpose | Added On | Status | Files | Notes |
|---------|---------|----------|--------|-------|-------|
| Supabase | Primary DB, CX/Site Storage | 2024 | Active | `src/lib/supabase/*` | Custom JWTs used instead of Supabase Auth |
| Firebase | Authentication | 2024 | Active | `src/lib/firebase.ts` | Sole auth provider |
| Cloudinary | Image Optimization | 2024 | Active | `src/services/cloudinaryService.ts` | |
| PhonePe | Payment Gateway | 2024 | Setup Pending | `api/checkout/phonepe` | Account setup pending documentation |
| Shiprocket | Logistics / Shipping | 2024 | Partially Implemented | `src/lib/shiprocket.ts` | Mocked logic |
| Meta API | WhatsApp Notifications | 2024 | Setup Pending | `src/lib/whatsapp.ts` | Business setup pending |
| Meta CAPI | Server-side Ads Tracking | 2024 | Active | `api/capi/route.ts` | |
| Turnstile | Bot Protection | 2024 | Active | `src/app/checkout/page.tsx` | |
| Vercel Insights | Performance Analytics | 2024 | Active | `src/app/layout.tsx` | |
| Google Analytics 4 | General Analytics/SEO | 2026 | Active | `src/app/layout.tsx`, `src/lib/gtag.ts` | E-commerce tracking fully instrumented |
| Brevo | Transactional Emails | 2026 | Active | `src/lib/brevo.ts` | Welcome, Abandoned Cart, Shipping, etc. |
