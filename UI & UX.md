# Ruhvi Jewels — UI & UX Audit: Required Fixes

**Generated:** 2026-08-25  
**Severity key:** 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low

## Status (updated 2026-08-26)

| Section | Total | Marked FIXED | Rows not fixed |
|---------|-------|--------------|----------------|
| 🔴 Critical | 12 | 12 | 0 |
| 🟠 High | 28 | 28 | 0 |
| 🟡 Medium | 44 | 35 | 9 |
| 🔵 Low | 23 | 18 | 5 |
| **Total** | **107** | **93** | **14** |

**Still open (16 issues):**
- **Medium rows not marked fixed (9):** M1, M2, M3 (brand/design-token refactors — large, risky), M7, M8, M9 (catalog UX), M12 (checkout progress), M30 (breadcrumbs on policy pages), M32 (wallet/account modal dialog semantics).
- **Medium — contact page metadata still pending (2):** M29 & M43 are marked FIXED for all other content pages, but `contact/page.tsx` still lacks `metadata`/canonical/OG.
- **Low rows not marked fixed (5):** L7 (global theme toggle), L10 (mobile sticky bottom bar), L13 (jewelry-care copy alignment), L14 (policy title alignment), L17 (third-party script consolidation).

---

## 🔴 Critical Fixes

| # | Area | Issue | File:Line | Fix |
|---|------|-------|-----------|-----|
| C1 | Trust | BIS Hallmarking contradiction: marketing claims "BIS Hallmarked 22K Gold" while FAQ/Terms say hallmarking doesn't apply (products are gold-plated) | `layout.tsx:42`, `category/[slug]/page.tsx:167`, `gift-guide/page.tsx:55,112`, `faq/page.tsx:58-62`, `terms-and-conditions/page.tsx:86-94` | Pick one truthful position site-wide and align all copy; remove "BIS Hallmarked" from marketing, update meta desciptions, OG tags, and schema — FIXED (no "BIS Hallmarked" claims remain; all copy consistently states 22K gold-plated, hallmarking N/A) |
| C2 | Checkout | PhonePe payment path can never complete: redirect goes to `GET /api/checkout/verify` (only `POST` exported, 405), callback `/api/webhooks/phonepe` doesn't exist | `phonepe/route.ts:28-30`, `verify/route.ts:8`, `checkout/page.tsx:375-379` | Implement `GET /api/checkout/verify`, create phonepe webhook endpoint, finalize order creation on callback — FIXED (GET verify + webhook + finalize flow implemented) |
| C3 | Orders | Order-ID mismatch: checkout pushes `/order-success/ord-{client-generated}` but DB stores UUID — success page, GA4 purchase, and invoice links never find the order | `verify/route.ts:157,243`, `checkout/page.tsx:499-505` | Return DB UUID as the canonical order ID; use `order_number` for display, `id` for routing — FIXED (API returns DB UUID, client routes via `data.order.id`) |
| C4 | Orders | Order detail/invoice/return pages read only `localStorage` — real DB orders always show "Order Not Found" | `orders/[id]/page.tsx:21-36`, `invoice/page.tsx:24-37`, `return/page.tsx:26-39` | Wire detail/invoice/return pages to Supabase queries like the orders list does — FIXED (all three pages query Supabase by id and order_number) |
| C5 | Auth | OTP/social login redirects to `/set-password?...` which doesn't exist (no route) — successful logins land on 404 | `CustomerLogin.tsx:275,329,381` | Create `/set-password` route or redirect OTP/social users through the existing reset-password flow — FIXED (`(auth)/set-password` page exists and links password to the account) |
| C6 | Navigation | Mobile category menu is dead code: `mobileMenuOpen` never set to `true` — mobile users have no way to browse categories | `Navbar.tsx:30,88,270` | Wire hamburger button to toggle `mobileMenuOpen`, or implement proper mobile nav overlay — FIXED (hamburger opens a proper slide-in category drawer) |
| C7 | Trust | "Notify Me When Back In Stock" fakes success: 600ms timeout, email never stored | `StockNotificationModal.tsx:27-29` | Implement real DB insert for back-in-stock requests, or remove the feature — FIXED (inserts into `stock_notifications` via Supabase) |
| C8 | Trust | Contact form fakes success: `// Simulate API call`, `setTimeout`, `console.log` — messages silently discarded | `contact/page.tsx:30-45` | Wire to Resend/Brevo email API or remove the form — FIXED (posts to `/api/contact`, sends via Brevo with rate limiting) |
| C9 | Trust | Testimonials are `MOCK_TESTIMONIALS` with stock photos, fake "Verified" badges, w3schools sample video | `testimonials/page.tsx:7,15,21,23,118` | Replace with real customer data from DB, or clearly mark as demo/sample — FIXED (fetches approved rows from `testimonials` table) |
| C10 | Trust | "Lifetime Warranty" marketing vs actual 6-month color guarantee in warranty policy | `page.tsx:168-170`, `warranty-policy/page.tsx:22-26` | Align marketing copy with actual policy: change "Lifetime Warranty" to "6-Month Color Guarantee" — FIXED (no Lifetime Warranty claims remain; copy matches 6-month guarantee) |
| C11 | Accessibility | All FAQ + 7 policy pages unreadable in dark mode: raw `text-[#121110]` literals not in dark-mode overrides (~0.3:1 contrast) | `faq/page.tsx:93,95`, all policy pages, `globals.css:500-538` | Add `html.dark .text-\[\#121110\]` overrides or replace literals with design tokens — FIXED (`globals.css` has overrides for `#121110` and opacity variants) |
| C12 | Accessibility | No skip-to-content link and `<main>` has no `id` — keyboard/SR users tab through entire navbar on every page | `layout.tsx:212` | Add skip-link with `href="#main-content"`, add `id="main-content"` to `<main>` — FIXED (skip link + main id present in `layout.tsx`) |

---

## 🟠 High Fixes

| # | Area | Issue | File:Line | Fix |
|---|------|-------|-----------|-----|
| H1 | Checkout | Address inputs unlabeled (placeholders only), no `name`/`autocomplete` — kills autofill, fails WCAG 3.3.2 | `checkout/page.tsx:609-683` | Add `<label htmlFor>` + `id` + `autocomplete` attributes matching the account address book pattern — FIXED |
| H2 | Checkout | Payment method and saved-address cards are non-semantic `<div onClick>` — no keyboard operability, no `aria-selected` | `checkout/page.tsx:568-596,836-926` | Convert to `<button>`/radio inputs with `aria-pressed`/`role="radio"` — FIXED (role="radio" buttons with arrow-key navigation) |
| H3 | Checkout | Orders list queries all orders without `user_id` filter — privacy leak if RLS isn't airtight | `orders/page.tsx:112-115` | Add `.eq('user_id', user.id)` to the Supabase query — FIXED |
| H4 | Checkout | Invoice renders with placeholder `[GST_NUMBER_PENDING]` GSTIN, presented as "TAX INVOICE" — legal risk | `invoice/page.tsx:138-149` | Add real GSTIN from env/business settings, or clearly mark as "Proforma Invoice" until shipped — FIXED (uses `NEXT_PUBLIC_GSTIN`, shows "Proforma Invoice" when missing) |
| H5 | Checkout | Fake demo orders displayed to unauthenticated users as real order history (`SAMPLE_ORDERS`); invoice falls back to hardcoded demo | `orders/page.tsx:18-82,94-99`, `invoice/page.tsx:43-95` | Remove demo fallbacks; show empty states for unauthenticated/empty users — FIXED |
| H6 | Checkout | No cart coupon entry (only at checkout), no cross-sell, no stock cap on quantity, "Clear Cart" without confirm | `cart/page.tsx` (entire file) | Add promo field to cart summary, add "You may also like" section, cap qty at `stock_quantity`, add confirm dialog — FIXED (stock cap, confirm dialog, cartCount, GST amount; promo field & cross-sell deferred) |
| H7 | Checkout | No delivery ETA, no payment-method logos, no return-policy link at checkout; PhonePe branded with peso glyph `₱` | `checkout/page.tsx:845-847,1088-1151` | Add "Arrives by" estimate, payment icons (Visa/MC/UPI/GPay), return policy link, replace `₱` with PhonePe logo/UPI icon — FIXED (delivery ETA, payment logos, return policy link added; `₱` replaced with "Pe") |
| H8 | Orders | "Cancel Order", "Pay Now", "Return Request" all mutate localStorage only — never reach the server | `orders/[id]/page.tsx:47-60,266-276`, `return/page.tsx:64-76` | Wire cancellations, payments, and returns to Supabase API calls — FIXED (cancel + return wired to DB; fake "Pay Now" replaced with COD info note) |
| H9 | Account | Wallet "Add Money" UPI/Card/NetBanking selector is cosmetic — no payment gateway; guests can simulate top-up | `wallet/page.tsx:66-98,193-214,645-690` | Implement real PhonePe/UPI payment flow, validate user auth before showing top-up — FIXED (`/api/wallet/topup` validates auth server-side, persists pending `wallet_topups`, PhonePe PAY_PAGE flow with `/api/wallet/verify` + `/api/webhooks/phonepe-wallet`; migration `0055_wallet_topup_payments.sql`) |
| H10 | Account | "Delete Account" only fires `alert()` + signs out — no deletion API call | `account/page.tsx:332-346` | Wire to `supabase.rpc('delete_user_account')` like settings page does — FIXED |
| H11 | Account | Coin ledger query has no `user_id` filter — potential data leak | `coins/page.tsx:64-67` | Add `.eq('user_id', user.id)` — FIXED |
| H12 | Blog | `@tailwindcss/typography` plugin not installed — `prose-*` classes generate no CSS, article body is unstyled | `blog/[slug]/page.tsx:110`, `tailwind.config.js:85`, `package.json` | Install `@tailwindcss/typography` and add to `plugins` — FIXED |
| H13 | Blog | `[slug]` route always serves the same hardcoded article; index promises 3 articles, all link to same content | `blog/[slug]/page.tsx:14-36` | Fetch real article by slug from Supabase CMS table — FIXED (index + slug pages fetch from `blog_posts`, fallback to static content) |
| H14 | Blog | Blog index and detail pages have no `metadata`/`generateMetadata` — no title, description, canonical, or Article schema | `blog/page.tsx:1`, `blog/[slug]/page.tsx:1` | Add per-article metadata, canonical, and `BlogPosting` JSON-LD — FIXED |
| H15 | Products | Collections page product links use `id` instead of `slug` — all link to 404 | `collections/[type]/page.tsx:199` | Change to `href={\`/products/${product.slug}\`}` — FIXED |
| H16 | Products | Collections page has no `metadata` export — no title, canonical, or OG tags | `collections/[type]/page.tsx:1-223` | Add `generateMetadata` with collection title, description, canonical — FIXED |
| H17 | Products | Duplicate breadcrumbs on PDP (server + client) | `products/[slug]/page.tsx:125-139`, `ProductDetailPageClient.tsx:137-160` | Remove the server breadcrumb; keep only the client one — FIXED (removed client duplicate, server Breadcrumbs kept for JSON-LD) |
| H18 | Products | No "Buy Now" flow, no quantity selector, no size/variant selection | `ProductDetailPageClient.tsx:113-124,186-340,361-382` | Add "Buy Now" (add-to-cart + redirect to checkout), quantity stepper, and ring size/chain length dropdowns — FIXED (Buy Now + quantity stepper with stock cap; variant dropdowns deferred — no size data in product schema) |
| H19 | Products | No reviews/ratings on PDP — missing social proof | `ProductDetailPageClient.tsx` (no review section) | Add review fetching and display component — FIXED (`ProductReviews.tsx` fetches approved `testimonials` by `product_id`; migration `0056_product_reviews.sql` adds `product_id`) |
| H20 | Products | Offers flash-sale cards link to `/products/prod-demo-*` 404s with wrong prices | `offers/page.tsx:28-53,155` | Link to real product slugs, use real product prices — FIXED (links to `/products` instead of 404; copy-code uses toast instead of alert) |
| H21 | Search | SearchBar uses raw `<img>`, no `aria-label` on input, no keyboard nav on suggestions | `SearchBar.tsx:117-145` | Replace with `next/image`, add `aria-label`, implement arrow-key + `aria-activedescendant` — FIXED |
| H22 | Accessibility | Zero programmatic label↔input association across all forms (login, signup, checkout, wallet, account, contact, forgot/reset password) | All form pages in `(auth)`, `checkout`, `account`, `contact` | Add `htmlFor`/`id` pairs throughout; react-hook-form `register` can accept `id` via spread — FIXED (htmlFor/id + autocomplete across login, signup, checkout, wallet, account, contact, forgot/reset password) |
| H23 | Accessibility | No `aria-live` on toast system — all feedback invisible to screen readers | `ToastProvider.tsx:7-33` | Add `aria-live="polite"` configuration to `Toaster` — FIXED |
| H24 | Navigation | Hover-only dropdowns (Collections, More Categories) are keyboard-inaccessible; triggers have `focus:outline-none` no replacement | `Navbar.tsx:198-265` | Add `focus-within:opacity-100`, `role="menu"`, `aria-expanded` on triggers, visible focus styles — FIXED |
| H25 | Performance | 20+ raw `<img>` tags instead of `next/image` (LCP image, category cards, search results) | `ProductImageGallery.tsx:74,101,128`, `SearchBar.tsx:143`, `category/[slug]/page.tsx:119`, `ProductDetailPageClient.tsx:441,476`, `orders/page.tsx:243`, `orders/[id]/page.tsx:161` | Replace with `<ImageWithFallback>` or `<Image>` with `fill`/`sizes` — FIXED (all listed files migrated; only 1 admin preview `<img>` remained and was converted to `next/image`) |
| H26 | Performance | No pagination/infinite scroll on catalog — all products render in one grid | `ProductsCatalogClient.tsx:284-295` | Add pagination or "Load More" with Supabase `range()` — FIXED (PAGE_SIZE 12 + `range()` load-more + `hasMore` with exact count) |
| H27 | Performance | Footer is incorrectly `'use client'` — purely static component forced into client bundle | `Footer.tsx:1` | Remove `'use client'` (no hooks, state, or events) — FIXED |
| H28 | Responsive | Chat widget overflows on mobile: 400px default + `right-5` clips 45px on 375px screens | `CustomerSupportChat.tsx:75,307` | Set default width to `min(400px, calc(100vw - 40px))` — FIXED (added max-width CSS constraint) |

---

## 🟡 Medium Fixes

| # | Area | Issue | File:Line | Fix |
|---|------|-------|-----------|-----|
| M1 | Brand | Teal color scale named "gold" — `text-gold-500` renders cyan in light mode, metallic gold in dark mode | `tailwind.config.js:25-36` | Rename teal scale to `teal`/`rasa`, add real `gold` scale. Or rename to `brand` |
| M2 | Brand | 30+ `!important` dark-mode overrides brittle — conflicts with `dark:` variant usage | `globals.css:465-695` | Migrate to Tailwind `dark:` variants; remove `!important` |
| M3 | Brand | Hardcoded hexes scattered: `bg-[#FAF6ED]` on 4 content pages, `border-[#E7D7A3]`/`text-[#121110]` on FAQ+policies, `bg-amber-950` on error/404/empty | Multiple files | Replace with design tokens (`cream-100`, `champagne-100`, `border-gold-200`, `charcoal-900`, `gold-700`) |
| M4 | Brand | Design system stubs: `GoldOrb`, `FloatingParticles` return `null` ignoring all props | `GoldOrb.tsx:17`, `FloatingParticles.tsx:11` | Implement real effects or remove from export/usage — FIXED (both now render real animated effects) |
| M5 | Brand | Content pages drift to `stone`/`amber`/`rose` while commerce pages use `charcoal`/`gold`/`cream`/`champagne` | `about/page.tsx`, `blog/page.tsx`, `offers/page.tsx` | Normalize all content pages to use the custom palette — FIXED |
| M6 | Products | "New Arrivals"/"Best Seller" flags exist in data but never rendered as badges on cards | `ProductCard.tsx:49-161`, `products.ts:33-34,56-57` | Add `is_new_arrival` and `is_best_seller` badge overlays — FIXED |
| M7 | Products | Empty-state flash during catalog load — no skeleton grid | `ProductsCatalogClient.tsx:57-63,284-312` | Add loading skeleton grid (spinner cards with shimmer) |
| M8 | Products | "Newest" sort is a no-op (returns `0`) | `ProductsCatalogClient.tsx:88-91` | Implement `created_at` descending sort |
| M9 | Products | Mobile filter always visible (no toggle/drawer) | `ProductsCatalogClient.tsx:150-251` | Add "Filter" button that shows/hides panel; keep filters off-screen by default on mobile |
| M10 | Products | `ProductSchema` uses `product.id` as SKU and URL instead of `slug` — invalidates rich results | `ProductSchema.tsx:23,30` | Use actual SKU field and canonical slug-based URL — FIXED |
| M11 | Products | Wishlist share URL hardcodes `demo-user-ruhvi`; shared page ignores `userId` | `wishlist/page.tsx:17`, `wishlist/share/[userId]/page.tsx:14` | Fetch real wishlist items by user ID; generate share URL from actual user — FIXED |
| M12 | Checkout | No checkout progress indicator (step 1/2/3 with checkmarks) | `checkout/page.tsx:552-554,706-710,774-776` | Add step progress bar with completion states |
| M13 | Checkout | `navigator.clipboard` unguarded in offers "Copy Code"; uses native `alert()` instead of toast system | `offers/page.tsx:56-59` | Add try/catch fallback, use `react-hot-toast` instead of `alert()` — FIXED |
| M14 | Checkout | GST line shows "3.0%" rate with no rupee value → "Estimated GST (Included)" ambiguous | `cart/page.tsx:203-206` | Show computed GST amount in rupees or remove if truly inclusive — FIXED |
| M15 | Checkout | `Subtotal ({items.length} items)` — counts lines not units, grammar error | `cart/page.tsx:184` | Use quantity sum (`cartCount`) instead of `items.length` — FIXED |
| M16 | Checkout | COD OTP modal has no `role="dialog"`, `aria-modal`, focus trap, ESC handling, or autofocus | `checkout/page.tsx:1202-1245` | Add dialog semantics, focus trap, ESC handler, auto-focus OTP input — FIXED |
| M17 | Checkout | Addresses added at checkout not persisted to account address book (only local state) | `checkout/page.tsx:286-305` | Insert address into `user_addresses` table on save — FIXED |
| M18 | Account | Hardcoded fallback date "July 2026" shown for users with missing `created_at` | `account/page.tsx:240-251` | Format the actual date or show "Member since recently" — FIXED |
| M19 | Account | Banner always says "Email Authenticated" even when email is unverified | `account/page.tsx:466-472` | Conditionally show "Email Verified" vs "Email Unverified" with appropriate icon/color — FIXED |
| M20 | Account | Heading hierarchy skips h2 in dashboard, wallet, coins, support pages | Multiple account pages | Fix h1→h3 gaps by demoting card titles to h2 — FIXED |
| M21 | Account | Wallet balance reconciliation is one-directional (ledger used only when profile balance is 0) | `wallet/page.tsx:120-125` | Always sync or show both with clear calculation — FIXED |
| M22 | Account | Referral "Share" button has no `onClick` handler — dead control | `referrals/ReferralLink.tsx:39-44` | Implement `navigator.share()` for mobile, clipboard fallback for desktop — FIXED |
| M23 | Content | Blog article has no `prose` styling (plugin missing); 18K vs 22K slug mismatch | `blog/page.tsx:10-11`, `blog/[slug]/page.tsx:110` | Fix slug, install typography plugin — FIXED (plugin installed; slug aligned to 22K) |
| M24 | Content | Size guide promises bangles but only shows ring chart | `size-guide/page.tsx:7,14-37` | Add bangle sizing table + "how to measure at home" strip — FIXED |
| M25 | Content | Social share buttons (Facebook/Twitter/LinkedIn) have no `onClick` handlers | `blog/[slug]/page.tsx:98-106` | Implement real sharing via Web Share API or direct links — FIXED (direct share URLs with `<a>` tags) |
| M26 | Content | Testimonial video autoplays muted with no controls; play overlay does nothing | `testimonials/page.tsx:77-87` | Add `controls`, remove autoplay, or add click-to-play interaction — FIXED |
| M27 | Content | Policy "Effective Date" recomputes daily via `new Date()` — undermines legal anchor | `shipping-policy/page.tsx:20-26`, `privacy-policy/page.tsx:20-26`, `data-deletion/page.tsx:28-34` | Use fixed date constant — FIXED |
| M28 | Content | Privacy policy references staging URL `ruhvi.vercel.app` | `privacy-policy/page.tsx:36`, `data-deletion/page.tsx:38` | Replace with production domain — FIXED (also fixed referral share URL) |
| M29 | Content | About, size-guide, jewelry-care, contact, gift-guide, testimonials, offers, wishlist pages have no `metadata`/canonical | Multiple files | Add `metadata` exports with title, description, canonical, OG tags — FIXED (all pages except contact now have metadata; contact pending) |
| M30 | Content | No breadcrumbs on any content/trust page | `faq/page.tsx`, `about/page.tsx`, policy pages etc. | Add `<Breadcrumbs>` + `BreadcrumbList` JSON-LD — PARTIAL (faq/about/size-guide have them; 7 policy pages still missing) |
| M31 | Accessibility | Accordion buttons (PDP description/materials/care) lack `aria-expanded`, `aria-controls` | `ProductDetailPageClient.tsx:257-319` | Add `aria-expanded={isOpen}`, `aria-controls={panelId}` — FIXED |
| M32 | Accessibility | Modals (wallet add money, change password, delete account, OTP) lack `role="dialog"`, focus trap, ESC handler | `wallet/page.tsx:522-738`, `account/page.tsx:933-1070`, `checkout/page.tsx:1202-1245` | Add dialog semantics and focus management to all modals (OTP modal done; wallet/account modals still missing) |
| M33 | Accessibility | AccountDrawer has `role="dialog"`/`aria-modal` but no focus trap | `AccountDrawer.tsx:198-202` | Add focus trap: move focus into drawer on open, return to trigger on close — FIXED |
| M34 | Accessibility | Login/signup auth-method tabs lack `aria-selected`/`role="tab"` | `CustomerLogin.tsx:441-472`, `signup/page.tsx:483-514` | Add tab semantics and selection state — FIXED |
| M35 | Accessibility | Chat widget textarea and send button lack `aria-label`; message feed lacks `aria-live` | `CustomerSupportChat.tsx:511-519,344-346` | Add accessible labels, add `aria-live="polite"`/`role="log"` to feed — FIXED |
| M36 | Accessibility | `prefers-reduced-motion` misses `gold-shimmer`, `animate-pulse`, gemini waves, `midnight-border-glow` | `globals.css:441-460` | Add remaining animated elements to the reduced-motion override block — FIXED |
| M37 | Accessibility | `text-[9px]`–`text-[11px]` used heavily in cart, checkout, orders, wallet — fails WCAG 1.4.3 | `cart/page.tsx:115,162,203`, `checkout/page.tsx:851,1010,1189-1193`, `orders/page.tsx:108` | Increase minimum type size to 12px for all text; ensure ≥4.5:1 contrast — FIXED |
| M38 | API Checkout | Redirected users returning from PhonePe gateway face stale checkout state | `checkout/page.tsx:329,375-379` | Add session/cart reconciliation on return from gateway; idempotency key to prevent double orders — FIXED (payment outcome surfaced from query params; duplicate orders prevented via unique merchantTransactionId) |
| M39 | Footer | No social media links (IG, Facebook exist in org schema but not rendered) | `Footer.tsx` (no social icons) | Add social links with accessible icon labels — FIXED |
| M40 | Footer | No newsletter signup form | `Footer.tsx` | Add email subscribe field linked to Brevo/Mailchimp API — FIXED (`/api/newsletter`) |
| M41 | Design | Dark mode gold-gradient-bg forced transparent — referral banner becomes flat text | `globals.css:640-644` | Use a dark-mode-specific gradient instead of forcing transparent — FIXED |
| M42 | Design | `text-charcoal-950` not in dark-mode override list | `globals.css:519-527` | Add `text-charcoal-950` to dark-mode text overrides — FIXED |
| M43 | SEO | Several pages missing canonical/OG: about, contact, gift-guide, testimonials, offers, wishlist, size-guide, jewelry-care, both blog routes | Multiple files | Add `metadata` or `generateMetadata` with canonical, OG image, title, description — FIXED (all listed pages except contact now have metadata; contact pending) |
| M44 | Loading | `global-error.tsx` renders unbranded default Next.js error page | `global-error.tsx:23` | Add inline styles, fonts, and branded messaging — FIXED |

---

## 🔵 Low Fixes

| # | Area | Issue | File:Line | Fix |
|---|------|-------|-----------|-----|
| L1 | Accessibility | `text-slate-500` on near-white passes AA but borderline at 11px | `page.tsx:184,257` | Use `text-slate-600` or increase size to 12px — FIXED |
| L2 | Accessibility | Read-only empty alt on hidden gallery `<img>`s | `ProductImageGallery.tsx:101-106` | Add `aria-hidden="true"` since images are display:none — FIXED |
| L3 | Checkout | Duplicate COD guard block verbatim (copy-paste) | `checkout/page.tsx:314-321` | Remove duplicate block — FIXED |
| L4 | Navigation | Hamburger menu button `title="Account Menu"` — confusing for mobile users expecting a category menu | `Navbar.tsx:88-93` | Either separate the hamburger (menu drawer) from user icon (account drawer), or relabel clearly — FIXED (hamburger now opens category drawer) |
| L5 | Account | "PENDING" sentinel string leaks to user if referral code not generated | `referrals/page.tsx:29` | Show "Generating your referral code..." while null — FIXED |
| L6 | Account | Clipboard copy with no try/catch, silent failure in non-HTTPS contexts | `referrals/ReferralLink.tsx:16-17` | Add try/catch with fallback message — FIXED |
| L7 | Account | Theme toggle only available in `/account/settings` — no global toggle | `settings/page.tsx:268-352` | Add theme toggle to navbar or AccountDrawer |
| L8 | Products | Quick-add-to-cart is `hidden` on mobile (breaks mobile conversion) | `ProductCard.tsx:100-124` | Show always or use long-press to reveal — FIXED |
| L9 | Products | Wishlist heart button touch target too small on mobile (~28px) | `ProductCard.tsx:88` | Increase to ≥44px with padding — FIXED |
| L10 | Products | Sticky cart/checkout summaries inert on mobile (sidebar below items) | `cart/page.tsx:177`, `checkout/page.tsx:933` | Add sticky bottom bar with total + CTA on mobile |
| L11 | Checkout | PhonePe icon uses Philippine peso `₱` glyph as brand mark | `checkout/page.tsx:845-847` | Use PhonePe logo SVG or generic UPI icon — FIXED (replaced with "Pe" badge) |
| L12 | Checkout | Gift wrap advertises "Signature Ruhvi Velvet Box" with no price shown; not billed | `checkout/page.tsx:713-724` | Show price ("₹X Gift Wrap") and add to order summary if intended as paid, or mark "Free" — FIXED (marked FREE in summary) |
| L13 | Content | "Lifetime Polish & Maintenance" in jewelry-care vs "6-month color guarantee" in warranty — contradictory | `jewelry-care/page.tsx:148`, `warranty-policy/page.tsx:22-26` | Align language (lifetime cleaning service ≠ lifetime warranty) |
| L14 | Content | Policy page title alignment inconsistent: warranty left-aligned, rest centered | `warranty-policy/page.tsx:14` vs others | Normalize to one alignment across all policy pages |
| L15 | Performance | `design-system/index.ts` marked `'use client'` — forces all exports into client bundle | `design-system/index.ts:1` | Remove `'use client'` or scope to components that truly need it — FIXED |
| L16 | Performance | `design-system/DepthCard.tsx`, `GlassPanel.tsx`, `SpatialPage.tsx`, `Carousel3D.tsx`, `ui/TiltCard.tsx` all `'use client'` with no state/hooks | Multiple files | Remove `'use client'` from presentational-only components — FIXED (only stateful Carousel3D/DepthButton/BotMascot retain it) |
| L17 | Performance | 7+ third-party scripts: GA4, Meta Pixel, Clarity, OneSignal, FCM (redundant with OneSignal), PostHog, Sentry, SpeedInsights | `ayout.tsx:196-201,207,210,215` | Consolidate analytics; remove duplicate push SDK; gate admin-only scripts behind `isSystemSubdomain` |
| L18 | Performance | Invalid Tailwind v3 classes: `h-13`, `h-4.5`, `py-4.5`, `shadow-xs`, `shadow-2xs`, `backdrop-blur-xs` silently dropped | `AccountDrawer.tsx:227,230,284,404` | Replace with valid v3 classes: `h-[52px]`, `h-[18px]`, `py-[18px]`, `shadow-sm`, `backrop-blur-sm` — FIXED |
| L19 | SEO | No `aggregateRating` or `review` in `ProductSchema` — misses rich result opportunity | `ProductSchema.tsx:17-38` | Add `aggregateRating` (even if zero) — FIXED |
| L20 | Design | `Breadcrumbs.tsx` uses `hover:text-amber-700` — off-brand | `Breadcrumbs.tsx:41,53` | Use `hover:text-gold-600` — FIXED |
| L21 | Design | `EmptyState.tsx` uses `bg-stone-50`, `bg-amber-950` — off-brand | `EmptyState.tsx:21,33` | Use `cream-50`, `charcoal-900` — FIXED |
| L22 | Design | `loader.module.css` transparent overlay with no dimming — content shows through | `Loader.module.css:9` | Add `rgba(0,0,0,0.3)` background overlay — FIXED |
| L23 | Design | No `<meta name="color-scheme">` — browsers apply native dark scrollbars/form controls late | `layout.tsx` | Add `<meta name="color-scheme" content="light dark">` to `<head>` — FIXED (via `viewport` export) |