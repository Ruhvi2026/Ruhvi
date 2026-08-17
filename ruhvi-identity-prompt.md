# Antigravity Implementation Prompt — Ruhvi Unified Customer Identity & Account Linking (v2)

## ROLE

Act as a senior Firebase Authentication + Supabase architect and production e-commerce security engineer.

You are working on the Ruhvi e-commerce website. This is a **pre-launch build** — the identity/auth system described here has not been implemented yet. There are 2–3 existing test accounts (friends of the founder) used only for signup/login testing; they have no orders, no addresses, and no wallet balance. There is no legacy production data to migrate.

The current architecture is:

- Firebase Authentication → authentication and identity providers
- Supabase PostgreSQL → customer profiles, orders, addresses, wishlist, cart, wallet, and other application/business data
- Frontend has basic signup/login scaffolding already
- Supabase is currently accessed directly from the browser

Your task: inspect the existing codebase first, then implement a production-ready Unified Customer Identity, Account Linking, Verification, and Checkout Verification system, designed correctly from the start rather than retrofitted.

---

## 0. PRE-WORK: RECONCILE THE 2–3 TEST ACCOUNTS (MANUAL, NOT CODE)

Before writing any identity-resolution code, do a one-time manual check:

1. Look at the current Supabase customer/user rows for the 2–3 test accounts.
2. Confirm whether any single person has more than one row (e.g., a friend tested both Google and phone OTP).
3. Since none of these accounts have orders, addresses, or wallet balance, if a duplicate exists, simply delete the redundant row and have that person re-signup once the new system is live.

**Do not build automated merge tooling for this.** Three rows can be checked by eye. Automated merge/reconciliation systems are explicitly out of scope for this build (see Section 15).

---

## 1. EXISTING AUTHENTICATION METHODS

Ruhvi provides four signup/login methods:

1. Email + Password
2. Mobile Number + OTP
3. Google
4. Facebook

**Desired behavior:** a single real-world customer must have ONE Ruhvi customer account, regardless of which method they use to authenticate.

```
Google
Facebook              ONE RUHVI CUSTOMER ACCOUNT
Email + Password  →        │
Phone + OTP                ├── Orders
                            ├── Addresses
                            ├── Wishlist
                            ├── Cart
                            ├── Coupons
                            └── Wallet ledger
```

Do NOT create separate Ruhvi customer records simply because the authentication provider differs.

---

## 2. CRITICAL ARCHITECTURE RULE

Separate two concepts:

**Firebase Identity** — answers *"How did this person authenticate?"* (Google / Facebook / Password / Phone)

**Ruhvi Customer Account** — answers *"Which Ruhvi customer is this?"* (Supabase)

```
Firebase Authentication → Firebase UID → Supabase customers.id
```

The Supabase customer record is the central owner of all business/customer history. Firebase never stores business data; Supabase never stores authentication secrets.

---

## 3. INSPECT BEFORE BUILDING

Before writing code, inspect and report on:

1. Existing Firebase configuration and provider setup
2. Existing login/signup components (Google, Facebook, phone OTP, email/password)
3. Firebase auth state listener/provider/context
4. Supabase client configuration and current customer/user table(s)
5. Existing orders, addresses, wishlist, cart, wallet tables (if any)
6. Existing RLS policies
7. Existing checkout logic
8. Existing profile/account pages

Reuse what already exists. Do not rebuild functionality that already works.

---

## 4. TARGET CUSTOMER DATA MODEL

Use the existing customer table if one already exists; do not blindly create a duplicate.

```sql
customers
---------
id                UUID / primary key
email             TEXT
email_verified    BOOLEAN   -- server-written only, see Section 9
phone             TEXT
phone_verified    BOOLEAN   -- server-written only, see Section 9
status            TEXT      -- 'active' | 'disabled'  (no 'merged' status needed — see Section 15)
created_at
updated_at
```

**Do not add a `merged_into_customer_id` column or `merged` status.** That's for reconciling pre-existing duplicate accounts at scale, which does not apply here (see Section 15).

---

## 5. CUSTOMER IDENTITIES TABLE

Create a separate identity-mapping table:

```sql
customer_identities
-------------------
id
customer_id           -- FK to customers.id
firebase_uid          -- UNIQUE — a Firebase UID must never belong to two customers
provider              -- 'password' | 'phone' | 'google.com' | 'facebook.com'
provider_identifier   -- provider-specific identifier where applicable
created_at
updated_at

UNIQUE(firebase_uid)
UNIQUE(provider, provider_identifier)  -- where applicable
```

Do not store passwords in Supabase. Firebase remains solely responsible for password authentication.

---

## 6. FIREBASE REMAINS THE IDENTITY PROVIDER

Do NOT create custom password authentication or store passwords in Supabase. Firebase handles email/password, phone OTP, Google, and Facebook natively.

There are **two distinct linking scenarios** — implement them as two separate code paths, not one:

### Path A — Same-session linking (Firebase native)

The user is *already signed in* and wants to add another method to the same Firebase account (e.g., a signed-in Google user adds a password).

```
Signed-in Firebase user
        ↓
Call Firebase's native linkWithCredential()
        ↓
Same Firebase UID, new provider added
```

Use Firebase's built-in linking API for this. It is reliable and secure for this case only.

### Path B — Cross-identity resolution at signup (Supabase-layer, not Firebase-layer)

A user signs up or logs in with a method that creates a **new, different** Firebase UID, and that new identity's *verified* email or phone matches an existing customer.

```
New Firebase UID authenticates
        ↓
Does Firebase-verified email/phone match an existing customer_identities row?
        ↓
YES → attach this new Firebase UID to the EXISTING customer_id
       (do not attempt Firebase-level linking — Firebase cannot merge
        two already-created UIDs; this is resolved entirely in Supabase)
        ↓
NO → create new customer + new identity row
```

**Do not implement Path B by calling Firebase's `linkWithCredential`.** Firebase will throw `auth/credential-already-in-use` because it cannot merge two separately-created UIDs — this is expected and by design. Path B is resolved by writing to `customer_identities`, not by any Firebase API call. Conflating Path A and Path B into one function is the most common implementation bug for this kind of system — keep them explicitly separate.

---

## 7. WHEN DOES PATH B TRIGGER? (Ownership must be proven, not typed)

Path B only resolves silently — without asking the user anything — when the **new authentication method itself proves ownership**:

- Phone OTP was completed → phone ownership is proven by the OTP → resolve silently
- Firebase reports the email as verified for this provider (e.g., Google's `email_verified: true` claim) → resolve silently

Path B does **not** trigger, and no automatic resolution happens, when ownership is only asserted by typed text:

- A raw email string typed into a signup form (not yet verified by Firebase)
- A phone number typed but not OTP-confirmed
- Matching name, address, device, browser, or IP

These NEVER trigger automatic linking:
```
same email typed into form        →  NOT sufficient
same phone typed into form        →  NOT sufficient
same name / address / device / IP →  NOT sufficient
```

If a signup attempt collides with an existing customer but ownership *isn't* independently proven by the new method (e.g., someone types an email already in use for a password-based account), see Section 12 for the UX — this is the one case that needs a user-facing prompt, and even then it routes through Firebase's own reauthentication, not a homemade merge screen.

---

## 8. NO MERGE ENGINE FOR PRE-EXISTING DUPLICATES

Because this is a fresh build with no legacy data, and Section 6–7 prevent new duplicates from being created going forward, **do not build:**

- A duplicate-account merge process for pre-existing customer rows
- Wallet-ledger reconciliation between two accounts
- Coupon-ownership conflict resolution between two accounts
- An "account merge confirmation" UI flow
- A `merged_into_customer_id` audit trail

If, months from now, real duplicate accounts are discovered (e.g., a customer somehow ends up with two rows despite Path A/B), that is a separate, later project scoped against real data — not something to speculatively build now against zero known cases.

---

## 9. VERIFICATION STATE — SERVER-WRITTEN ONLY

This is one of the most important sections. **Verification flags (`email_verified`, `phone_verified`) must never be written by the client — not even through an RLS policy that restricts the write to "your own row."**

Why: RLS controls *who* can write a row, not *whether what they're writing is true*. A client-side write of `email_verified = true`, even gated by "users can only update their own customer row," can be triggered by anyone opening dev tools and calling the Supabase client SDK directly — there is nothing in an ordinary RLS policy that checks whether Firebase actually verified that email.

**Required implementation:**

```
Client authenticates with Firebase
        ↓
Client sends Firebase ID token to a server-side function
   (Supabase Edge Function, or backend API — NOT client SDK)
        ↓
Server verifies the token using Firebase Admin SDK
        ↓
Server reads the verification claims directly from the
decoded, verified token (not from anything the client sent)
        ↓
Server writes email_verified / phone_verified to Supabase
   using the service role — this is the ONLY writer of these columns
```

RLS should additionally deny client UPDATE on `email_verified` and `phone_verified` columns entirely (column-level or trigger-level protection), so even a compromised service-role leak on the client can't be used to forge these flags.

---

## 10. GOOGLE SIGNUP

```
Google authentication → Firebase user → Firebase UID
        ↓
Check Firebase-verified email claim
        ↓
Path B resolution (Section 6–7): existing customer? link : create
        ↓
Server-side verification sync (Section 9)
        ↓
Require mobile verification before checkout (not before browsing)
```

Only a Firebase-verified email claim may set `email_verified = true`. Never trust an arbitrary email string submitted by the frontend.

---

## 11. FACEBOOK SIGNUP

```
Facebook authentication → Firebase user → Firebase UID
        ↓
Path B resolution if verified email is present
        ↓
If no verified email available: allow account creation,
require email verification before checkout only if email is required
```

Facebook may not always provide a usable/verified email. Do not force an unavailable Facebook email.

---

## 12. EMAIL COLLISION AT SIGNUP (THE ONE CASE THAT NEEDS A USER PROMPT)

If someone tries to create a password account with an email that Firebase reports is already in use by a *different* Firebase UID (Firebase will return `auth/email-already-in-use` or `auth/account-exists-with-different-credential`):

**Keep this simple and non-alarming.** Do not show a security-flavored "This account already exists, prove ownership" interstitial — that reads as a warning for something the user didn't do wrong. Instead:

```
"Looks like you already have an account with this email.
 Sign in instead, or use a different email."

[ Sign In ]   [ Use a different email ]
```

If they choose "Sign In" and successfully authenticate via the method already on file (or complete Firebase's standard reauthentication for account linking), Path A linking (Section 6) then attaches their new intended method to the same, already-authenticated Firebase account. No custom merge screen — this is Firebase's own linking flow, just introduced with friendlier copy than a raw error message.

---

## 13. PHONE + OTP SIGNUP

Phone authentication already proves ownership via Firebase OTP — no separate verification step needed after this.

```
Firebase Phone Auth → OTP confirmed
        ↓
Path B resolution (Section 6–7): existing customer by verified phone? link : create
        ↓
Server sets phone_verified = true (Section 9) based on the
authenticated Firebase phone identity — never a frontend boolean
```

If this phone number matches an existing customer, log the user straight into their existing account. No confirmation prompt — the OTP itself already proved ownership.

---

## 14. EMAIL + PASSWORD SIGNUP

```
Create Firebase account → send Firebase email verification
        ↓
Path B resolution if applicable
        ↓
email_verified = false until Firebase confirms (Section 9)
        ↓
Require phone OTP verification before checkout
```

---

## 15. SUMMARY: WHAT THIS BUILD DOES NOT INCLUDE

Explicitly out of scope for this implementation (revisit only if real duplicate accounts are found later, against real data):

- Automated duplicate-detection/reporting across the customer base
- Any merge engine (Sections 16–18 of earlier drafts)
- Merge confirmation UX
- `merged_into_customer_id` / `status: merged` schema
- Existing-user migration audit tooling
- Wallet-merge / coupon-merge conflict resolution

---

## 16. EMAIL / PHONE NORMALIZATION

Normalize before any comparison:

- Phone: E.164 format (`+919876543210`), using Firebase's normalized phone identity, not raw string comparison
- Email: trim whitespace, lowercase. Do NOT apply Gmail-specific dot/plus-address folding unless there's an explicit business reason — `abc@gmail.com` and `a.bc@gmail.com` are not assumed interchangeable.

---

## 17. CHECKOUT VERIFICATION

Centralized function, enforced server-side, never bypassable from the frontend:

```ts
checkCheckoutVerification(customerId) → {
  mobileVerified: boolean,
  emailVerified: boolean,
  requiresMobileVerification: boolean,
  requiresEmailVerification: boolean
}
```

### Checkout UX flow (verify at address step, not at login)

Don't gate login or browsing behind verification — only checkout, and only once the user reaches the address step. This keeps early funnel friction-free:

```
Checkout → Address details entered → Check verification status
        ↓
   Mobile unverified? → inline "Verify your mobile" (OTP) → continue
        ↓
   Email unverified?  → inline "Verify your email" (send link) → continue
        ↓
   Payment → Order
```

Keep both verification steps **inline on the checkout page**, not as separate redirects or modals that break flow. Example UI:

```
Verify your mobile number
+91 XXXXX XXXXX
[ Send OTP ]  →  [ _ _ _ _ _ _ ]  [ Verify ]  →  ✓ Mobile number verified

Verify your email address
abc@example.com
[ Send verification email ]  →  ✓ Email verified (auto-updates once Firebase confirms)
```

### Server-side enforcement (mandatory, independent of frontend state)

```
Order creation request
        ↓
Verify Firebase token server-side
        ↓
Resolve customer_id from Firebase UID
        ↓
Re-check email_verified / phone_verified from Supabase
   (the server-written values from Section 9 — never trust
    anything the request body claims about verification state)
        ↓
Only then create order
```

A user must not be able to bypass verification by calling the order-creation API directly, regardless of what the frontend displayed.

---

## 18. RLS REQUIREMENTS

- `customers`, `customer_identities`, `addresses`, `orders`, `wishlist`, `cart`, `wallet`, `reviews`: a customer may only access their own rows.
- Deny client writes to `firebase_uid`, `email_verified`, `phone_verified` entirely (these are server-written only — Section 9).
- Never expose service-role credentials to the frontend.

---

## 19. FIREBASE SERVICE ACCOUNT / ADMIN SDK

- Keep service account credentials server-side only (environment variables / secrets manager).
- Never expose Admin SDK credentials or service-role keys in frontend code or the client bundle.
- Never commit secrets to Git.

---

## 20. AUTH STATE SYNCHRONIZATION

On `onAuthStateChanged()`:

```
Firebase user → get UID → resolve customer_id → load customer profile → load verification state
```

Maintain explicit `authLoading` / `customerLoading` states to avoid a race where Firebase reports logged-in before the Supabase customer record has loaded.

---

## 21. PROVIDER LINKING UI (Account Page)

Inside My Account → Security / Login Methods, show current state and allow adding methods via Path A (Section 6):

```
Login Methods

Google              ✓ Connected
Facebook            ○ Connect
Email & Password    ✓ Connected
Mobile              ✓ +91 XXXXX XXXXX

[ Connect Google ]  [ Connect Facebook ]  [ Add Email + Password ]  [ Change Mobile ]
```

Use Firebase's native linking flow (Path A) for all of these — the user is already signed in, so this is the straightforward case.

---

## 22. REAUTHENTICATION

For sensitive operations (changing email, changing phone, adding/removing a login provider, changing password), require Firebase reauthentication per Firebase's "recent login" requirements.

---

## 23. ERROR HANDLING

Handle Firebase errors gracefully and translate to plain, non-technical UI messages. Never expose raw Firebase error strings to the user.

```
auth/account-exists-with-different-credential  → see Section 12 copy
auth/credential-already-in-use                 → see Section 12 copy
auth/provider-already-linked                   → "This is already connected to your account"
auth/requires-recent-login                     → prompt reauthentication
auth/email-already-in-use                      → see Section 12 copy
auth/invalid-verification-code                 → "That code didn't match — try again"
auth/too-many-requests                         → "Too many attempts — try again in a few minutes"
```

---

## 24. AUDIT LOG

Track (no passwords or secrets, ever):

```
provider_linked
provider_unlinked
phone_verified
email_verified
```

```sql
customer_id, event_type, timestamp, provider, source
```

(No `account_merge_*` events — not applicable per Section 15.)

---

## 25. DEVELOPMENT RULES — DO NOT

- Replace Firebase Authentication or migrate auth to Supabase Auth
- Store passwords in Supabase
- Expose Firebase Admin credentials or service-role keys client-side
- Trust frontend-sent verification flags for anything
- Write `email_verified` / `phone_verified` from the client, even via RLS
- Merge accounts based on typed (unverified) email or phone text alone
- Build merge/reconciliation tooling for this launch (Section 15)
- Conflate Path A (same-session linking) and Path B (cross-identity resolution) into one function
- Disable RLS as a shortcut
- Show alarming "security" language for the ordinary email-already-exists case (Section 12)

---

## 26. TESTING REQUIREMENTS

**Test 1 — New Google user:** signup → mobile verification at checkout → order succeeds.

**Test 2 — New Facebook user:** signup → mobile + email verification (if applicable) at checkout → order succeeds.

**Test 3 — New phone user:** OTP signup → add email later → email verified → checkout succeeds.

**Test 4 — New email user:** email/password → email verification sent → mobile OTP at checkout → order succeeds.

**Test 5 — Path A, Google → add password:** signed-in Google user adds password → same Firebase UID → same customer → same orders visible.

**Test 6 — Path B, phone OTP matches existing Google account:** phone OTP completed → phone matches existing customer's verified phone → logs into existing account silently, no duplicate created, no confirmation prompt (Section 13).

**Test 7 — Email collision at signup:** new password signup with an email Firebase reports as already in use → friendly "Sign In instead" prompt (Section 12), not an alarming security screen.

**Test 8 — Unverified mobile at checkout:** address entered → mobile verification required inline → order blocked until verified.

**Test 9 — Unverified email at checkout:** same, for email.

**Test 10 — API bypass attempt:** unverified customer calls order-creation endpoint directly → MUST fail server-side regardless of frontend state.

**Test 11 — Verification flag forgery attempt:** attempt to set `email_verified`/`phone_verified` via direct Supabase client call → MUST be rejected by RLS/column protection (Section 9, 18).

**Test 12 — Firebase UID tampering:** attempt to change `customer_identities.firebase_uid` via client → MUST fail.

---

## 27. IMPLEMENTATION SEQUENCE

**Phase 0** — Manual reconciliation of the 2–3 existing test accounts (Section 0). Not code.

**Phase 1** — Audit existing codebase (Section 3). Report only — no changes yet.

**Phase 2** — Schema: `customers`, `customer_identities`, constraints, indexes (Sections 4–5).

**Phase 3** — Firebase identity resolution: implement Path A and Path B as explicitly separate functions (Sections 6–8).

**Phase 4** — Server-side verification sync: Edge Function / backend endpoint that verifies Firebase tokens and writes verification flags (Section 9).

**Phase 5** — Per-provider signup flows (Sections 10, 11, 13, 14).

**Phase 6** — Checkout verification: `checkCheckoutVerification()`, inline UI at address step, server-side enforcement before order creation (Section 17).

**Phase 7** — Provider-linking account page UI (Section 21).

**Phase 8** — RLS pass, including column-level protection on verification/identity fields (Section 18).

**Phase 9** — Error-message translation layer (Section 23).

**Phase 10** — Full test matrix (Section 26).

**Phase 11** — `lint`, `typecheck`, tests, production build. Fix all errors.

---

## 28. FINAL REPORT (after implementation)

Provide a concise report covering:

- How Firebase identities map to Ruhvi customers (Path A vs Path B, explicitly)
- Every table/column/constraint/index added
- The server-side verification-sync mechanism and where it lives
- Exactly how unverified users are blocked at checkout, and how that's enforced server-side
- Confirmation that the 2–3 test accounts were manually reconciled (Phase 0) and how
- Files changed/created
- New environment variables required (names only, no values)
- Which tests from Section 26 passed

---

## 29. ACCEPTANCE CRITERIA

- ✓ Google / Facebook / Email+Password / Phone OTP signup all work
- ✓ Mobile verification works for all four signup paths
- ✓ Email verification works where required
- ✓ One customer can have multiple login methods (Path A)
- ✓ A new signup with a Firebase-verified email/phone matching an existing customer resolves to that existing customer silently (Path B) — no duplicate created
- ✓ An unverified/typed email or phone match never auto-links or auto-merges
- ✓ Firebase remains authoritative for authentication; Supabase remains authoritative for business data
- ✓ Mobile verification is mandatory before order placement; enforced server-side
- ✓ Email verification is required when not already verified; enforced server-side
- ✓ Verification flags cannot be set by the client under any circumstance, including direct Supabase calls
- ✓ Firebase UID cannot be changed by the client
- ✓ RLS prevents cross-customer data access
- ✓ No service-role or Admin SDK credentials exposed client-side
- ✓ Checkout verification UI is inline at the address step, not a separate blocking gate at login
- ✓ Email-already-exists case shows friendly "Sign In instead" copy, not alarming security language
- ✓ The 2–3 existing test accounts were manually reconciled before launch
- ✓ Production build succeeds, no TypeScript errors, no lint errors

**Most importantly: ONE PERSON = ONE RUHVI CUSTOMER ACCOUNT**, regardless of whether they authenticate using Google, Facebook, Email+Password, or Phone+OTP — achieved by preventing duplicates at signup (Path A/B), not by merging them after the fact.

---

**BEFORE YOU CODE:** First inspect the existing Ruhvi implementation (Section 3) and give an implementation audit. Do not rewrite authentication immediately. Identify what already exists, what can be reused, and confirm the Phase 0 manual reconciliation (Section 0) is complete before Phase 2 begins.
