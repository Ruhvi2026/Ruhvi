# Phase 0: Customer Notification Center - Complete Audit & Implementation Plan

## 1. Current Architecture
- **Framework:** Next.js 15 (App Router), React, Tailwind CSS.
- **Database:** Supabase (PostgreSQL).
- **Authentication:** Firebase Auth combined with a custom Supabase JWT integration (`customer_identities` table).
- **Security:** Strict Supabase Row Level Security (RLS) policies relying on `auth.uid()` matching the JWT `sub` claim.

## 2. Existing Notification Capabilities
- **Frontend UI:** The notification center currently exists at `src/app/account/notifications/page.tsx`, but it is entirely a client-side placeholder. It uses a `NotificationContext.tsx` that stores notifications in `localStorage` (`ruhvi_notifications_v1`). There is no current backend sync for the customer view.
- **Push Notifications:** Firebase Cloud Messaging (FCM) is partially set up. `src/lib/fcm.ts` handles client token generation. Tokens are persisted in the `user_push_tokens` table (Migration 0070).
- **Emails:** Handled via Resend (Transactional) and Brevo (Marketing). 

## 3. Existing Relevant Components
- `src/components/layout/Navbar.tsx` and `src/components/layout/AccountDrawer.tsx` already feature a Bell icon and display an unread count based on the local context.
- `src/context/NotificationContext.tsx` (Needs total rewrite to fetch from Supabase).
- `src/app/account/notifications/page.tsx` (Current dummy UI).

## 4. Existing Database Structures
- **`notifications`:** Exists (created in Migration 0004), but needs schema expansion. Currently contains: `id`, `user_id`, `title`, `message`, `link`, `type`, `read`, `created_at`.
- **`user_push_tokens`:** Stores FCM device tokens by `user_id` and `platform`.
- **`push_campaigns`:** Tracks admin-initiated broadcast campaigns.
- **Related Entities:** `orders`, `tracking_updates`, `returns`, `wallet_ledger`, `reward_coin_ledger`, `products`.

## 5. Existing APIs
- `src/app/api/admin/notifications/route.ts`: Exists for broadcasting admin-created push notifications to all FCM tokens.

## 6. Existing Order Status Source
- Defined in the `orders` table (`status` column). Handled by `shiprocket.ts` logic and various webhooks.

## 7. Existing Shipping Status Source
- Defined in the `tracking_updates` table (AWB codes and activity strings synced from Shiprocket).

## 8. Existing Wallet/Reward Source
- Strictly maintained via `wallet_ledger` (cash balance) and `reward_coin_ledger` (reward points).

## 9. Existing Admin Capabilities
- Push notification broadcasting UI/API exists. EspoCRM integration and Super Admin dashboards provide deep oversight.

## 10. Existing Firebase/FCM Capability
- FCM is fully registered and operational. Service worker (`firebase-messaging-sw.js`) and environment variables (`NEXT_PUBLIC_FIREBASE_VAPID_KEY`) are present. Admin FCM sender exists.

## 11. Existing Routes
- UI Route: `/account/notifications`.
- Account Dashboard sections for all relevant categories (`/account/orders`, `/account/wallet`, `/account/coins`, `/account/returns`, `/wishlist`).

## 12. Existing Customer Navigation
- Smooth drawer/sidebar navigation is in place.

## 13. Existing Security Model
- Customer Isolation: Supabase RLS guarantees Customer A cannot view Customer B's orders, wallet, or notifications.
- Admin Authorization: Validated server-side using middleware/server hooks.

## 14. Risks/Conflicts
- **Data Loss on Migration:** Migrating `NotificationContext.tsx` from `localStorage` to Supabase means any existing dummy notifications users have locally will vanish. This is acceptable for a production update, but should be noted.
- **Database Schema Mismatch:** The current `notifications` table schema lacks `category`, `reference_type`, and `reference_id` which are strictly required for the Notification Center deep-link logic you specified.

## 15. Missing Infrastructure
- A unified backend `NotificationService` that atomically inserts into the `notifications` table AND fires an FCM payload in one transaction.
- Client-side deep-link handling for background/terminated app push notification taps.
- Customer-facing APIs (`GET /api/notifications`, `PATCH /api/notifications/read`).

---

## Classification Table

| Feature | Exists in DB/App? | Relevant | Priority | Action |
|---------|-------------------|----------|----------|--------|
| **Orders (Placed, Shipped, Delivered)** | Yes (`orders`, `tracking_updates`) | Yes | High | **IN-SCOPE**. Implement push + in-app DB notifications on status changes. |
| **Returns / Refunds** | Yes (`returns`) | Yes | High | **IN-SCOPE**. Bind to return approval/pickup events. |
| **Wallet / Reward Coins** | Yes (`wallet_ledger`, `reward_coin_ledger`) | Yes | High | **IN-SCOPE**. Bind to credit/redemption events. |
| **Offers / Coupons** | Yes | Yes | Medium | **IN-SCOPE**. Primarily driven by Admin broadcast. |
| **Updates / New Products** | Yes (`products`, `blog_posts`) | Yes | Medium | **IN-SCOPE**. Primarily driven by Admin broadcast. |
| **Wishlist (Back in Stock / Price Drop)** | Yes (Wishlist exists) | Yes | Low | **FUTURE**. Requires cron jobs tracking stock/price deltas. |
| **Cart (Abandoned)** | Cart exists | Yes | Low | **FUTURE**. Brevo handles email currently; push requires dedicated scheduling infra. |
| **Personal / Behavioral** | No | No | N/A | **IRRELEVANT**. Do not implement. |

---

## Implementation Plan

### PHASE 1: Notification Foundation (Database & API)
- Create Supabase migration to ALTER the `notifications` table: Add `category`, `reference_type`, `reference_id`, `image_url`.
- Update RLS policies if necessary.
- Create backend `NotificationService` helper for creating a DB notification + pushing to FCM securely.
- Create customer API routes: `GET /api/notifications`, `PATCH /api/notifications/read`, `POST /api/notifications/mark-all-read`.

### PHASE 2: Customer Notification Center (UI)
- Rewrite `src/context/NotificationContext.tsx` to fetch data from the new APIs instead of `localStorage`.
- Implement `SWR` or React Query for real-time updates and pagination.
- Update `src/app/account/notifications/page.tsx` to include dynamic tabs based on the new `category` field (ALL, ORDERS, WALLET, OFFERS, UPDATES).

### PHASE 3 & 4: Push Notification Tap Routing
- Modify `firebase-messaging-sw.js` and foreground message handlers in `src/lib/fcm.ts`.
- Ensure payload contains `category` and `reference_id`.
- Implement router logic on push tap:
  - `ORDERS` -> `/account/orders/[id]`
  - `WALLET` -> `/account/wallet` or `/account/coins`
  - `OFFERS` / `UPDATES` -> `/account/notifications`

### PHASE 5: Business Event Integration
- Bind `NotificationService` to:
  - Order checkout success webhook.
  - Shiprocket tracking webhook (shipped, out for delivery, delivered).
  - Return/Refund status change API.
  - Wallet/Coin ledger insert operations.

### PHASE 6: Admin Management Update
- Enhance existing `api/admin/notifications/route.ts` to allow defining categories (e.g. OFFERS, UPDATES) and inserting records into the `notifications` table alongside the FCM broadcast.

### PHASE 7 & 8: Testing & Rollback
- Comprehensive tests for RLS isolation, token invalidation, and push tap deep-linking.
- **Rollback:** If required, revert the `NotificationContext.tsx` to the localStorage version and delete the DB migration.
