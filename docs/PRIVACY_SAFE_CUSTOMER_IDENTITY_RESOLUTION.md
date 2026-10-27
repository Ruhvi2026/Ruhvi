# Project Ruhvi — Privacy-Safe Customer Identity Resolution Specification

**Document Version:** 1.0  
**Generated Date:** 26 October 2026  
**Status:** Authoritative Architecture & Security Specification  
**Applicability:** Master Phased Implementation Plan — Phase 31 Deliverable (Track F: Customer 360)  

---

## 1. Executive Summary & Objective

In modern luxury e-commerce, customers interact across diverse touchpoints: guest checkouts, SMS OTPs, Google/Firebase authentications, email newsletters, WhatsApp support chats, and marketing ad links.

Incorrect identity resolution creates catastrophic business and security risks:
1. **Unauthorized Account Takeover / Data Leaks:** Automatically merging two customers who share a delivery phone number (e.g., family members, reception desks, office security) or an unverified email address leaks private purchase history, jewelry sizing, and wallet credits.
2. **Fragmented Customer History:** Failing to link authenticated interactions leads to disjointed support, repeated questions, and broken personalization.

This specification establishes **deterministic precedence rules, conflict-handling protocols, guest-to-logged-in transition mechanics, statutory data retention, and role-based access boundaries** to ensure that customer profiles are unified **only when identity is mathematically or cryptographically verified**, with **zero automatic merging on ambiguous signals**.

---

## 2. Identity Precedence & Matching Hierarchy

Identity signals are ranked across 5 distinct confidence levels. Matching strictly follows top-down precedence:

| Level | Signal Type | Verification Requirement | Confidence | Resolution Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Level 1** | **Canonical Internal ID** (`users.id`) | Direct database primary key match (UUID v4) | **1.0 (Exact)** | Immediate match to authoritative profile. |
| **Level 2** | **Verified Firebase UID** (`customer_identities.firebase_uid`) | Cryptographically verified JWT token signed by Firebase Auth | **1.0 (Exact)** | Matches primary identity associated with the UID. |
| **Level 3a** | **Verified Email Address** | RFC 5322 format, canonical lowercase, verified via OTP/magic link (`email_verified = true`) | **0.95 (High)** | Links identity if no conflicting verified UID exists. |
| **Level 3b** | **Verified Phone Number** | E.164 format (`+91XXXXXXXXXX`), verified via SMS OTP (`phone_verified = true`) | **0.95 (High)** | Links identity if no conflicting verified profile exists. |
| **Level 4** | **Verified Transaction Claim** | Exact `order_number` or `order_id` + matching payment reference + authenticated checkout session | **0.90 (Conditional)** | Links guest order to the authenticated customer profile. |
| **Level 5** | **Ambiguous / Unverified Signals** | Unverified emails, unverified phone numbers, shipping recipient names, delivery address, IP addresses, browser cookies (`distinct_id`, `client_id`) | **< 0.50 (Unreliable)** | **STRICTLY NEVER AUTO-MERGE.** Record is quarantined or isolated as a distinct guest session. |

---

## 3. Disambiguation & Anti-Auto-Merge Rules

To guarantee customer privacy and prevent cross-customer data leakage, the resolution engine enforces four non-negotiable negative constraints:

### Rule 1: No Auto-Merge on Unverified Contact Claims
- If an unauthenticated user enters an email or phone number where `email_verified == false` or `phone_verified == false`, the engine **MUST NOT** merge this session with an existing account holding that same email or phone.
- *Rationale:* An adversary or mistake could enter another user's email at checkout. Merging would expose the victim's previous orders and reward coins to the unverified party.

### Rule 2: Shipping Recipient & Delivery Phone Separation
- In jewelry gifting, the buyer's billing contact and the recipient's delivery contact frequently differ.
- The delivery recipient's name and phone number on shipping labels **MUST NEVER** be treated as account identifiers for the purchaser.

### Rule 3: Anonymous Analytics Cookies Cannot Mutate Transactional Profiles
- PostHog `distinct_id`, Google Analytics `client_id`, and Meta `fbclid` cookies are ephemeral device tokens.
- They may be stitched to an authenticated profile **ONLY** for behavioral analytics attribution when the customer explicitly signs in with consent.
- They **CANNOT** be used as a primary lookup key or cause a merge between two disparate transactional user accounts.

### Rule 4: Canonical Normalization Before Comparison
- Emails must be trimmed and lowercased (`user@example.com` vs `User@Example.com`).
- Indian phone numbers must be parsed and normalized to E.164 (`+919830123482`). Local formats like `09830123482` or `98301 23482` must be canonically sanitized before matching.

---

## 4. Conflict Handling & Quarantine Protocol

When incoming signals map to conflicting existing profiles, the engine executes the **Identity Quarantine Protocol**:

```
[Incoming Signal]
      │
      ├─► Firebase UID points to Profile A
      │
      └─► Verified Email points to Profile B
                 │
                 ▼
        [Collision Detected]
                 │
                 ├─► NEVER overwrite Profile A with Profile B
                 ├─► NEVER merge Profile A and Profile B
                 ├─► Emit status: 'IDENTITY_CONFLICT'
                 ├─► Log immutable audit alert: 'customer_identity_conflict'
                 └─► Halt automated linking; route to Admin User Management for manual triage
```

---

## 5. Guest-to-Logged-In Transition Protocol

1. **Guest Checkout Execution:**
   - Guest places an order providing email `buyer@domain.com` and phone `+919800000000`.
   - The order is created in `public.orders` with `customer_email = 'buyer@domain.com'`, `customer_phone = '+919800000000'`.
   - If an account does not exist, a shadow guest record is provisioned with `role = 'customer'`, `account_status = 'guest_unclaimed'`, `email_verified = false`.

2. **Subsequent Registration & Email/OTP Verification:**
   - The user later registers or logs in with Google/Firebase using `buyer@domain.com`.
   - Firebase verifies email possession (`email_verified = true`).
   - Canonical RPC `resolve_customer_identity` links the Firebase UID to the customer record.
   - All historical guest orders where `customer_email = 'buyer@domain.com'` are reconciled to the user's canonical `id`.

---

## 6. Data Retention, Anonymization & Erasure (DPDP Act & GDPR)

Under the Indian Digital Personal Data Protection (DPDP) Act 2023 and global privacy standards:

1. **Right to Erasure ("Right to Be Forgotten"):**
   - When a verified erasure request is approved:
     - `public.customer_identities` mapping records for that customer are deleted.
     - Direct PII in `public.users` (`full_name`, `first_name`, `last_name`, `email`, `phone`, `avatar_url`) is scrubbed and replaced with `[REDACTED_DELETED_USER]` and a synthetic tombstone UUID.
     - Secondary marketing tags, segments, and personalization profiles are permanently purged.

2. **Statutory Tax & Accounting Retention Exception:**
   - Under the Indian Income Tax Act and GST regulations, transaction records (`public.orders`, invoices, and `public.wallet_ledger`) must be retained for **7 financial years**.
   - Transactional records are retained in a **pseudonymized** form: financial totals, GST breakdown, item SKUs, and payment gateway references are preserved, but linked PII is detached and redacted.

---

## 7. Role-Based Access Control (RBAC) Matrix for Customer Lookups

| Role | Permitted Lookup Keys | PII Exposure | Justification / Boundary |
| :--- | :--- | :--- | :--- |
| **Customer** | Self `users.id` only | Full Self Profile | Restricted strictly via Supabase RLS (`auth.uid() = customer_identities.firebase_uid`). |
| **Staff** | Customer ID, Order Number, Phone, Email | **Masked PII Only** (`+91 98301 ••••82`, `s***@gmail.com`) | Customer service triage and order status resolution. Cannot view raw tokens or passwords. |
| **Manager** | Customer ID, Order Number, Phone, Email | Masked PII (Unmask with audit reason) | Escalation management, fraud investigation, return approvals. |
| **Admin / Super Admin** | All Keys + Firebase UID + Provider Identifiers | Full Unmasked (Audited) | Identity reconciliation, dispute resolution, DPDP erasure execution. |
| **Anonymous / Public** | None | Blocked (401/403) | Zero external access to customer directory or identities. |
