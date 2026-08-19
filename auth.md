# Ruhvi Authentication Architecture Audit & Recovery Plan

## Purpose

This document is the single source of truth for repairing Ruhvi's authentication system after recent AI-generated changes caused the existing admin account to behave like a guest user and caused login/session checks to report that the user was not authenticated.

The intended architecture is:

```text
User
  │
  ▼
Frontend
  │
  │ Firebase Authentication
  ▼
Firebase Auth
  │
  │ Firebase ID Token (JWT)
  ▼
Authentication Middleware / Gateway
  │
  │ Verify Firebase JWT
  │ Extract Firebase UID
  ▼
Supabase
  │
  │ Find user profile by Firebase UID
  │ Read role / account data
  ▼
Frontend / Protected API
  │
  ├── admin → Admin access
  └── guest/customer → Normal customer access
```

### Non-negotiable architecture rules

1. Firebase Authentication is the source of truth for authentication.
2. Supabase is the application database and stores user/profile/business data.
3. The authentication middleware/gateway connects Firebase and Supabase.
4. The Firebase UID is the canonical identity key.
5. The Firebase ID token/JWT must be verified server-side before trusting identity.
6. Supabase user records must be linked to the Firebase UID.
7. The user's role must come from the trusted application-side user record, not from an untrusted frontend value.
8. An authenticated Firebase user must never silently become a guest because a profile lookup fails.
9. A missing Supabase profile and an unauthenticated Firebase session are two different states and must never be treated as the same state.
10. Do not replace Firebase authentication with Supabase Auth.
11. Do not create a second independent authentication system.
12. Do not rewrite the entire authentication architecture to solve one bug.

---

# PHASE 0 — SAFETY AND CHANGE CONTROL

Before changing anything:

- [ ] Do not edit code yet.
- [ ] Create a Git checkpoint/branch.
- [ ] Record the current commit hash.
- [ ] Record all uncommitted changes.
- [ ] Identify the last known working commit, if available.
- [ ] Identify files modified by Antigravity during the authentication/password-reset work.
- [ ] Do not delete or recreate the existing admin Firebase account.
- [ ] Do not delete Supabase user records.
- [ ] Do not change production database data while diagnosing.
- [ ] Do not disable security rules/RLS as a shortcut.
- [ ] Do not store or print Firebase private keys, service-account credentials, Supabase service-role keys, or user passwords in logs.

### Required diagnostic behavior

For diagnosis, log only safe identifiers such as:

- Firebase UID
- Supabase profile ID
- authenticated/not-authenticated state
- role
- token verification success/failure
- profile lookup success/failure

Never log:

- passwords
- raw Firebase ID tokens
- refresh tokens
- cookies
- service-role keys
- private keys
- full authorization headers

---

# PHASE 1 — MAP THE CURRENT AUTHENTICATION SYSTEM

Do not change anything.

Antigravity must first discover the real implementation currently present in the repository.

## 1.1 Find Firebase authentication code

Search for:

- `firebase`
- `initializeApp`
- `getAuth`
- `onAuthStateChanged`
- `signInWithEmailAndPassword`
- `sendPasswordResetEmail`
- `confirmPasswordReset`
- `signOut`
- `currentUser`
- `getIdToken`
- `getIdTokenResult`

Identify:

- Firebase initialization file
- Auth provider/context
- login page
- logout implementation
- password reset request page
- password reset confirmation page
- protected route logic
- admin route logic

## 1.2 Find JWT/middleware/gateway code

Search for:

- `JWT`
- `jwt`
- `verifyIdToken`
- Firebase Admin SDK
- `Authorization`
- `Bearer`
- `idToken`
- `middleware`
- `gateway`
- `auth middleware`
- API request interceptors
- server authentication helpers

Identify exactly:

1. Where the Firebase ID token is obtained.
2. How the token is sent to the backend.
3. Where it is verified.
4. How the Firebase UID is extracted.
5. How the UID is passed to Supabase.
6. How the Supabase profile is found.
7. How the role is determined.
8. How the result is returned to the frontend.

## 1.3 Find Supabase user/profile tables

Search the codebase for:

- `supabase`
- `.from(`
- `.select(`
- `.eq(`
- `users`
- `profiles`
- `user_profiles`
- `role`
- `firebase_uid`
- `firebaseUid`
- `uid`

Determine:

- exact table name
- exact Firebase UID column name
- exact role column name
- primary key
- foreign keys
- RLS policies
- admin/customer/guest role values
- whether the application has more than one user/profile table

Do not assume the table is named `users`.

---

# PHASE 2 — DOCUMENT THE EXPECTED IDENTITY MODEL

The canonical identity must be Firebase UID.

Example:

```text
Firebase
uid = abc123
email = admin@example.com
```

Supabase should contain a corresponding application profile:

```text
firebase_uid = abc123
role = admin
```

The relationship must be:

```text
Firebase UID
     │
     └──────────────► Supabase firebase_uid
```

Do NOT use email as the primary identity mapping if Firebase UID is available.

Email can change.

Firebase UID is intended to remain stable for the Firebase user account.

## Required identity rules

### Rule A — Authentication

Firebase answers:

> "Is this person authenticated?"

### Rule B — Identity

Firebase UID answers:

> "Which Firebase user is this?"

### Rule C — Application profile

Supabase answers:

> "What application data belongs to this Firebase user?"

### Rule D — Authorization

Supabase role/application permissions answer:

> "What is this authenticated user allowed to do?"

Therefore:

```text
Authentication ≠ Authorization
```

And:

```text
Firebase authentication
        +
Firebase UID
        +
verified JWT
        +
Supabase profile
        +
trusted role
```

must be used together.

---

# PHASE 3 — INVESTIGATE THE CURRENT ADMIN ACCOUNT

Before fixing code, inspect the existing admin account.

## 3.1 Firebase

Verify:

- [ ] Admin Firebase user exists.
- [ ] Firebase UID is recorded.
- [ ] Email is correct.
- [ ] User is not disabled.
- [ ] Email/password provider is configured correctly.
- [ ] Password reset can target the correct Firebase account.

Do not create a replacement admin user unless the investigation proves the original account is unrecoverable.

## 3.2 Supabase

Find the application profile using the Firebase UID.

Verify:

- [ ] Exactly one profile exists for that Firebase UID.
- [ ] The Firebase UID matches exactly.
- [ ] The role is actually `admin` or the project's intended admin role.
- [ ] The profile is not duplicated.
- [ ] The profile is not marked inactive/suspended unexpectedly.
- [ ] No newer guest profile was created for the same person.
- [ ] The profile's primary key is valid.

## 3.3 Critical comparison

Create a diagnostic result like:

```text
Firebase UID:
Supabase profile ID:
Supabase firebase_uid:
Firebase email:
Supabase email:
Supabase role:
Profile count for Firebase UID:
```

Expected:

```text
Firebase UID == Supabase firebase_uid
profile count == 1
role == admin
```

If these do not match, identify the data problem before changing authentication code.

---

# PHASE 4 — TRACE ONE LOGIN REQUEST END TO END

Use the existing admin account.

Trace the request in this exact order:

```text
1. Login form
2. Firebase signInWithEmailAndPassword()
3. Firebase auth.currentUser
4. Firebase ID token
5. API/gateway request
6. JWT verification
7. Firebase UID extraction
8. Supabase profile lookup
9. Role lookup
10. Response to frontend
11. Auth context/state update
12. Route guard
13. Admin dashboard
```

At every stage answer:

```text
What identity does the application think this user has?
```

## Expected result

### Step 1

Firebase login succeeds.

### Step 2

`currentUser` exists.

### Step 3

`currentUser.uid` exists.

### Step 4

A Firebase ID token is obtained.

### Step 5

The token is sent to the backend/gateway.

### Step 6

The backend verifies the Firebase ID token.

### Step 7

The backend extracts the verified Firebase UID.

### Step 8

Supabase finds exactly one profile using that Firebase UID.

### Step 9

The profile returns `admin`.

### Step 10

Frontend receives authenticated identity and application role.

### Step 11

Auth context becomes authenticated.

### Step 12

Admin route guard permits access.

### Step 13

Admin dashboard loads.

---

# PHASE 5 — IDENTIFY THE EXACT FAILURE CLASS

Classify the bug into one or more of these categories.

## A. Firebase authentication failure

Symptoms:

- `signInWithEmailAndPassword()` fails.
- Firebase says user not found.
- Firebase says wrong password.
- `currentUser` is null.

Possible causes:

- wrong Firebase project/config
- wrong auth provider
- wrong email
- password reset affecting a different account
- Firebase configuration changed
- login code changed

## B. Firebase succeeds but frontend loses the session

Symptoms:

- Firebase login succeeds
- `currentUser` exists briefly
- application says "not logged in"

Possible causes:

- `onAuthStateChanged` was removed/broken
- auth context initializes incorrectly
- state is reset after login
- race condition while Firebase restores session
- route guard runs before auth initialization completes

Required state model:

```text
loading
authenticated
unauthenticated
```

Do not represent "still checking Firebase" as "guest".

## C. Firebase UID → Supabase mapping failure

Symptoms:

- Firebase says authenticated
- Supabase profile is missing
- application creates/uses guest identity

Possible causes:

- lookup changed from `firebase_uid` to email
- wrong UID field
- wrong table
- UID not passed through gateway
- a new guest profile is automatically created
- database record was changed

## D. Role resolution failure

Symptoms:

- correct Firebase user
- correct Supabase profile
- role incorrectly becomes guest

Possible causes:

- default role changed to `guest`
- role lookup failed and code falls back to guest
- frontend overwrites role
- role field name changed
- role value changed
- admin profile is not being returned
- cached user state contains stale role

### Important rule

Never do this:

```text
profile lookup failed → treat user as guest
```

Instead:

```text
profile lookup failed → authenticated user with unresolved profile
```

The application should fail safely and clearly rather than silently downgrade the identity.

## E. JWT/middleware failure

Symptoms:

- Firebase login works
- backend says unauthenticated
- frontend receives 401

Possible causes:

- ID token not sent
- wrong Authorization header
- malformed Bearer token
- Firebase Admin SDK not verifying correctly
- wrong Firebase project
- expired token
- server environment/configuration problem
- gateway changed how identity is propagated

## F. Route guard failure

Symptoms:

- authentication is correct
- role is correct
- admin dashboard still redirects to login

Possible causes:

- route guard checks the wrong state
- route guard reads stale context
- role comparison is incorrect
- `admin` vs `ADMIN`
- route guard expects Supabase Auth instead of Firebase Auth

---

# PHASE 6 — AUDIT THE PASSWORD RESET FLOW

Password reset must remain Firebase-based.

Expected flow:

```text
Forgot Password
      │
      ▼
Firebase sendPasswordResetEmail()
      │
      ▼
User receives reset email
      │
      ▼
Reset link
      │
      ▼
Firebase reset handler
      │
      ▼
New password
      │
      ▼
Firebase password updated
```

The password reset flow must NOT:

- create a new Supabase user
- create a new Firebase user
- change the Firebase UID
- change the Supabase Firebase UID
- change the user's role
- convert admin to guest
- authenticate using an unverified email value
- bypass Firebase authentication

## Reset-link investigation

Verify:

- Firebase authorized domains
- Firebase password reset configuration
- action URL/continue URL
- reset page routing
- Firebase SDK configuration
- project ID
- email/provider configuration

If the reset link opens correctly but login afterward fails, treat password reset and login as separate diagnostic stages.

---

# PHASE 7 — AUDIT ANTIGRAVITY'S RECENT CHANGES

Find all files changed during the password-reset/login work.

For every changed authentication-related file, compare:

```text
Last known working version
vs
Current version
```

Prioritize:

1. Firebase config
2. Auth context/provider
3. login page
4. forgot-password page
5. reset-password page
6. auth utilities
7. middleware/gateway
8. API client
9. Supabase user/profile service
10. route guards
11. admin guard
12. user creation/sync logic

Look specifically for:

- renamed fields
- changed table names
- changed role defaults
- changed UID lookup
- changed token handling
- changed API response shape
- new guest fallback
- new automatic user creation
- removed auth listener
- new localStorage/sessionStorage logic
- duplicate auth contexts
- Supabase Auth being introduced
- Firebase Auth being bypassed
- frontend-generated role values

---

# PHASE 8 — FIX THE IDENTITY PIPELINE

Once the root cause is confirmed, repair the smallest possible set of files.

The final backend/gateway flow should conceptually be:

```text
Request
  │
  ▼
Read Authorization: Bearer <Firebase ID Token>
  │
  ▼
Verify Firebase ID Token
  │
  ├── invalid → 401
  │
  ▼
Extract decoded Firebase UID
  │
  ▼
Find Supabase profile by firebase_uid
  │
  ├── no profile → authenticated-but-unprovisioned response
  │
  ▼
Read role
  │
  ▼
Return trusted identity context
```

Conceptual identity object:

```text
{
  authenticated: true,
  firebaseUid: "<verified Firebase UID>",
  profileId: "<Supabase profile ID>",
  role: "admin"
}
```

The exact property names must match the existing project conventions.

---

# PHASE 9 — FIX THE FRONTEND AUTH STATE

The frontend should distinguish these states:

```text
AUTH_LOADING
AUTHENTICATED
AUTH_UNAUTHENTICATED
AUTH_PROFILE_ERROR
```

Do not use:

```text
Firebase currentUser === null
```

as the only condition during initial application startup.

Firebase may still be restoring the session.

Expected behavior:

```text
App starts
  ↓
Firebase auth initializes
  ↓
loading = true
  ↓
onAuthStateChanged()
  ↓
User exists?
  ├── yes → authenticated
  └── no  → unauthenticated
```

After authentication:

```text
Firebase user
     ↓
verified identity/gateway
     ↓
Supabase profile
     ↓
role
     ↓
frontend auth context
```

---

# PHASE 10 — FIX ROLE HANDLING

The role must be trusted from the application/database layer after the user's Firebase identity has been verified.

Do not allow:

```text
localStorage.role = "admin"
```

or any equivalent client-controlled role to grant admin access.

Do not use:

```text
missing profile → guest
```

as a security fallback.

Correct approach:

```text
Authenticated + admin profile → admin
Authenticated + customer profile → customer
Authenticated + no profile → provisioning/profile error
Unauthenticated → login
```

---

# PHASE 11 — SUPABASE SECURITY AUDIT

Inspect RLS policies and backend access.

Verify that:

- [ ] Frontend does not receive a Supabase service-role key.
- [ ] Server-only secrets remain server-side.
- [ ] User profile access follows the intended identity model.
- [ ] RLS policies do not accidentally expose another user's profile.
- [ ] Admin authorization is not based solely on a frontend field.
- [ ] The gateway/middleware does not trust an arbitrary UID supplied by the browser.

Important:

```text
Never trust:
X-User-ID: <browser supplied UID>
```

Instead:

```text
Authorization: Bearer <Firebase ID Token>
       ↓
server verifies token
       ↓
server extracts UID
```

---

# PHASE 12 — REMOVE DANGEROUS AUTOMATIC GUEST FALLBACKS

Search for:

- `guest`
- `defaultRole`
- `role ||`
- `role ??`
- `fallback`
- `createUser`
- `createProfile`
- `upsert`
- automatic profile creation

Determine whether an authentication error is being converted into a guest account.

This is likely one of the highest-priority areas because the observed behavior is:

```text
Admin Firebase account
       ↓
Application
       ↓
Guest
```

That should never happen silently.

A missing or broken profile mapping must produce a diagnosable error.

---

# PHASE 13 — PASSWORD RESET VERIFICATION

Test this separately from normal login.

## Test A

Existing admin email:

```text
admin@example.com
```

Request password reset.

Expected:

```text
Firebase sends reset email
```

## Test B

Open the reset link.

Expected:

```text
Reset page loads
```

## Test C

Set a new password.

Expected:

```text
Firebase password changes
```

## Test D

Login with the new password.

Expected:

```text
Firebase authentication succeeds
```

## Test E

Verify identity mapping.

Expected:

```text
Firebase UID == existing Supabase firebase_uid
```

## Test F

Verify role.

Expected:

```text
role == admin
```

Password reset must not create a new profile.

---

# PHASE 14 — COMPLETE TEST MATRIX

After the fix, test all of the following.

## Authentication

- [ ] Admin login with correct password
- [ ] Admin login with incorrect password
- [ ] Nonexistent email
- [ ] Customer login
- [ ] Logout
- [ ] Browser refresh after login
- [ ] New browser/session
- [ ] Firebase session restoration
- [ ] Token refresh

## Password reset

- [ ] Forgot password email
- [ ] Reset link
- [ ] New password
- [ ] Login with new password
- [ ] Existing Firebase UID remains unchanged
- [ ] Existing Supabase profile remains unchanged
- [ ] Admin role remains admin

## Authorization

- [ ] Admin can access admin dashboard
- [ ] Customer cannot access admin dashboard
- [ ] Guest cannot access admin dashboard
- [ ] Unauthenticated user is redirected to login
- [ ] Direct admin URL access is protected
- [ ] Refresh on admin route works

## Identity integrity

- [ ] Firebase UID is stable
- [ ] Supabase Firebase UID matches
- [ ] Exactly one profile exists
- [ ] Correct role returned
- [ ] No duplicate guest profile created
- [ ] No email-only identity collision
- [ ] No browser-supplied UID is trusted

---

# PHASE 15 — FINAL ACCEPTANCE CRITERIA

The repair is complete only when all of these are true:

```text
Firebase
  ↓
Authenticated Firebase user
  ↓
Firebase ID Token
  ↓
Server/Gateway verifies token
  ↓
Verified Firebase UID
  ↓
Supabase profile lookup by Firebase UID
  ↓
Correct application role
  ↓
Frontend auth state
  ↓
Correct protected route
```

For the existing admin account:

```text
Firebase authentication = SUCCESS
Firebase UID = CORRECT
JWT verification = SUCCESS
Supabase profile = FOUND
Firebase UID mapping = MATCH
Role = ADMIN
Admin route = ACCESSIBLE
```

And:

```text
No silent admin → guest conversion
No duplicate account
No duplicate profile
No second authentication system
No client-controlled admin role
No broken password reset
```

---

# PHASE 16 — ANTIGRAVITY EXECUTION RULES

Antigravity must follow these rules while working on this task.

## Rule 1 — Audit first

Do not edit code during the initial investigation.

## Rule 2 — Report before fixing

Before making changes, produce:

```text
AUTH AUDIT REPORT

1. Current architecture
2. Firebase authentication flow
3. JWT/middleware flow
4. Supabase mapping flow
5. Role resolution flow
6. Current admin Firebase UID
7. Current Supabase mapping
8. Exact failure point
9. Root cause
10. Files that need changes
11. Why each file needs changes
12. Risk level
13. Proposed fix
```

## Rule 3 — Minimal changes

Only change files required to fix the confirmed root cause.

Do not refactor unrelated code.

## Rule 4 — Preserve architecture

Do not replace Firebase Auth with Supabase Auth.

Do not remove the JWT middleware/gateway.

Do not move authentication into Supabase.

Do not redesign the entire auth system.

## Rule 5 — Preserve the admin account

Do not delete/recreate the existing admin account.

## Rule 6 — Preserve the UID mapping

The existing Firebase UID must remain the canonical identity.

## Rule 7 — No silent fallback

Never convert authentication/profile errors into guest access.

## Rule 8 — No secrets in logs

Never expose tokens or credentials.

## Rule 9 — Validate after each change

After each modification:

1. Run type checking.
2. Run linting if configured.
3. Run relevant tests.
4. Build the application.
5. Test the authentication flow.

## Rule 10 — Stop if architecture must change

If the proposed fix requires changing the authentication architecture, stop and explain why before doing it.

---

# PHASE 17 — REQUIRED FINAL REPORT FROM ANTIGRAVITY

After completing the repair, provide:

```text
AUTH REPAIR COMPLETE

Root cause:
<exact cause>

Files changed:
- file
- file
- file

Files not changed:
<important untouched auth files>

Firebase:
PASS/FAIL

JWT verification:
PASS/FAIL

Firebase UID mapping:
PASS/FAIL

Supabase profile:
PASS/FAIL

Role resolution:
PASS/FAIL

Admin login:
PASS/FAIL

Customer login:
PASS/FAIL

Guest behavior:
PASS/FAIL

Password reset:
PASS/FAIL

Refresh/session persistence:
PASS/FAIL

Admin route protection:
PASS/FAIL

Build:
PASS/FAIL

Tests:
PASS/FAIL

Remaining risks:
<list>
```

---

# MOST IMPORTANT REQUIREMENT

The final system must understand one real user consistently across all layers.

The identity chain must be:

```text
Firebase Account
      │
      │ Firebase UID
      ▼
Verified Firebase JWT
      │
      │ verified UID
      ▼
Authentication Middleware / Gateway
      │
      │ Firebase UID
      ▼
Supabase User/Profile
      │
      │ role
      ▼
Application Authorization
      │
      ├── admin
      ├── customer
      └── guest
```

The system must never interpret:

```text
Firebase authenticated
+
Supabase lookup failed
=
guest
```

Instead:

```text
Firebase authenticated
+
Supabase lookup failed
=
authenticated identity with profile/mapping error
```

This distinction is critical for both correctness and security.

---

# START COMMAND

When this document is given to Antigravity, start with:

> **AUDIT ONLY. DO NOT MODIFY ANY FILES.**
>
> Read this entire `auth.md` file.
>
> Inspect the existing Ruhvi authentication implementation and produce the required AUTH AUDIT REPORT.
>
> Do not fix anything until the exact root cause is identified and the affected files are listed.
>
> Preserve the architecture:
>
> **Firebase Auth → Firebase ID Token/JWT → Authentication Middleware/Gateway → Firebase UID → Supabase Profile → Role → Protected Application**
>
> The existing admin Firebase account must remain intact.
>
> Do not silently downgrade authenticated users to guest.
>
> Do not introduce Supabase Auth.
>
> Do not rewrite unrelated code.
