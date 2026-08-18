# Ruhvi Jewels — Pre-Launch Checklist

**Instructions for Antigravity:** Work through each item below in order. Implement the change on the live Next.js codebase (ruhvi.vercel.app). After each item is completed and verified, change `- [ ]` to `- [x]` for that line. Do not skip items — if something is blocked (e.g. waiting on GST number), leave it unchecked and add a short note below the item explaining the blocker.

---

## 1. Branding & Legal Entity

- [x] Change business name to **RUHVI JEWELS** everywhere: site header/logo, footer, page `<title>` tags, meta description, and any hardcoded "Ruhvi Jewellery" or "RuhviJewellery" strings
- [x] Update footer copyright line to reflect **Sole Proprietorship** — remove "Pvt Ltd", replace with correct entity wording (e.g. "© 2026 Ruhvi Jewels. All rights reserved.")
- [x] Add placeholder/config field for GST number so it can be added to invoices once registration is complete (leave blank/hidden until confirmed by business owner)
- [x] Add a **Grievance Officer** clause to both Privacy Policy and Terms & Conditions pages (name to be supplied by business owner — leave a `[GRIEVANCE_OFFICER_NAME]` placeholder if not yet provided)

## 2. Site Content & Catalog

- [ ] Remove all test/placeholder products from the live catalog: "finale test", "Testing", "Rose ring", and any other non-real SKUs
  *(BLOCKED: Need real data and confirmation on how to proceed without deleting useful demos)*
- [ ] Populate the following currently-empty category pages with real products: Bangles, Pendants, Anklets, Mangalsutra, Bridal Jewellery, Men's Jewellery, Kids' Jewellery
  *(BLOCKED: Need real product catalog data)*
- [ ] Add a **product weight (grams)** field to the product schema and display it on each product page
  *(BLOCKED: Need real product data to seed)*
- [ ] Fix duplicate product images — currently "Royal Sapphire Drop Earrings" and "Love chain" share the same stock photo; replace with distinct images per product
  *(BLOCKED: Need new image assets)*
- [ ] Apply a consistent discount percentage range across products (business owner to confirm final %, but avoid wildly inconsistent discounts like 10% vs 29% side-by-side)
  *(BLOCKED: Waiting for business owner to confirm final %)*
- [ ] Add base metal + plating micron specs to product descriptions once supplied by business owner (currently pending — brass base confirmed, exact micron TBD)
  *(BLOCKED: Waiting for exact micron details)*

## 3. Homepage Claims (Remove Inaccurate/Unsupported Claims)

- [x] Remove the **"BIS Hallmarked"** badge from the homepage hero — not applicable, since all current products are gold-plated, not solid gold
- [x] Remove **"VVS Solitaires"** mention from homepage copy — business is not currently selling solitaires
- [x] Remove the **"4.9 Rated"** placeholder trust badge until real reviews exist
- [x] Replace the current non-functional "Join the Inner Circle / 10% off first purchase" newsletter signup with the new Referral Program (see Section 4)

## 4. Referral & Rewards Program (New Feature)

- [x] Build referral feature with the following logic:
  - Referrer receives **500 Reward Coins** (≈ ₹50 at 10 coins = ₹1)
  - Referrer's coins are credited **only after** the referee's order is delivered **and** the 7-day return window has expired without a return/cancellation (this is the core anti-fraud mechanism — do not credit coins earlier)
  - Referee receives **₹100 total wallet balance**: ₹50 standard new-customer signup bonus (given to all new customers regardless of referral) + ₹50 additional referral bonus
- [x] Confirm wallet vs. coins behavior in the backend:
  - **Wallet balance**: never expires, no minimum order value to use, non-withdrawable to bank account
  - **Reward Coins**: expire 100 days from issue date, require a ₹250 minimum order value to redeem, 10 coins = ₹1
- [x] Add a dedicated "Refer a Friend" section/page with this copy (or business-approved variant):

  > **Refer a Friend**
  > Invite your friends to Ruhvi and get rewarded:
  > - You get 500 Reward Coins (₹50 value) once your friend's order is delivered and passes the 7-day return window.
  > - Your friend gets ₹100 in Wallet balance — a ₹50 signup bonus (given to every new customer) plus an extra ₹50 for using your referral.
  >
  > Reward Coins expire 100 days from issue. Wallet balance never expires and has no minimum order value. Wallet balance is non-withdrawable and can only be used for purchases on Ruhvi.

- [x] Add referral program terms to the "Wallet & Reward Coins" section of Terms & Conditions

## 5. Store Policy Pages

- [x] **Warranty & Repair Policy** — replace current 2-line version with:

  > Every Ruhvi piece comes with the following coverage:
  >
  > **6-Month Color Guarantee** — Covers fading or discoloration of the gold plating under normal use, for 6 months from the delivery date.
  >
  > **7-Day Manufacturing Defect Warranty** — If your piece has a manufacturing defect (faulty clasp, incorrect stone setting, structural flaw) within 7 days of delivery, we will replace or return it at no cost to you. We arrange pickup and return shipping — no additional charges apply.
  >
  > **Not Covered:** Physical damage, chemical damage (from perfume, lotion, chlorine, etc.), loosened or damaged stones, and natural dullness from wear are not covered under this warranty.
  >
  > To claim, contact support@ruhvi.in with your order number and photos of the issue within the applicable window.

- [x] **Terms & Conditions** — fix duplicate "5." numbering (currently two sections both numbered 5: "Coupons & Discounts" and "Intellectual Property"). Renumber so sequence runs correctly through to "Governing Law"
- [x] **Terms & Conditions** — replace the line "All prices are inclusive of GST" with: "All prices are displayed in Indian Rupees (INR) and are final at the time of checkout." (Revert to a GST-inclusive statement only once GST registration is confirmed active — do not make this change without business owner sign-off)
- [x] **Privacy Policy** — update domain reference from `ruhvi.in` to `ruhvi.vercel.app` to match the live domain (update again when domain migration to ruhvi.in happens)
- [x] **Privacy Policy** — add Grievance Officer clause:

  > **Grievance Officer**
  > In accordance with the Information Technology Act, 2000 and rules made thereunder, the name and contact details of the Grievance Officer are provided below:
  >
  > Name: SHREYA MAITY
  > Designation: Grievance Officer
  > Email: support@ruhvi.in
  > Time to respond: We will acknowledge your complaint within 48 hours and resolve it within 30 days.

- [x] **Privacy Policy** — add cross-border data transfer clause after the Data Security section:

  > **International Data Transfers**
  > Some of our service providers (including Supabase, Firebase, Vercel, and Meta) may process or store your data on servers located outside India. Where this occurs, we ensure appropriate safeguards are in place to protect your personal data in accordance with applicable data protection laws, including India's Digital Personal Data Protection Act, 2023.

- [x] Verify all policy pages (Privacy Policy, T&C, Shipping, Return, Cancellation, Warranty) are server-rendered or statically generated in Next.js (not purely client-rendered) — check "View Page Source" in browser to confirm policy text appears in raw HTML, for SEO/crawler visibility

## 6. Contact & Support

- [x] Standardize all customer-facing contact emails to **support@ruhvi.in** — replace every instance of `care@ruhvi.in` and `privacy@ruhvi.in` across the site (homepage footer, Privacy Policy contact section, Shipping Policy contact section, etc.)
- [ ] Add a support phone number if the business owner wants one displayed alongside email
  *(BLOCKED: Waiting for business owner to provide phone number)*

## 7. Payments & Compliance

- [ ] Confirm PhonePe merchant verification status — ensure all policy pages are live, accurate, and accessible, since PhonePe checks these during merchant review
  *(BLOCKED: Pending business owner confirmation of verification status)*
- [ ] Implement a COD order value cap (business owner to confirm exact threshold — common practice for jewellery is to cap COD above a certain order value due to fraud/damage risk)
  *(BLOCKED: Need exact COD threshold from business owner)*
- [ ] Integrate WhatsApp Business API once verification is approved (business owner is currently in the verification process)
  *(BLOCKED: Pending verification)*

## 8. Tracking & Consent

- [x] Confirm Privacy Policy fully discloses Meta Pixel tracking (already present in current draft — just needs the domain fix from Section 5)

---

**Progress tracking:** Update this file directly as items are completed. When all boxes are checked, the site is ready for the founder's final review before going live.
