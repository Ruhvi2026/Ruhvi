# RUHVI JEWELS — API Endpoint Build Specification
### Instructions for the AI coding agent (Kilo Code)

You are building/completing the external API layer for the Ruhvi Admin backend (Next.js). API keys are already issued per module with one of four permission scopes (shown in the Admin → API Keys screen). **Almost none of the actual endpoints exist yet** — this document tells you how to verify, then build, every module, one at a time.

---

## ⚠️ RULE #1 — DO NOT ASSUME, ALWAYS VERIFY FIRST

Do not assume any endpoint exists just because an API key exists for it. A key for "Wallet" was already created and tested — it returned nothing, because **no Wallet endpoint has actually been built**. The dashboard UI existing does NOT mean the backend route exists.

Before writing any new code for a module:
1. Search the codebase for any existing route matching that module (e.g. `api/external/wallet`, `api/external/blog`).
2. If a route file exists, open it and actually test it (call it with a real key) — do not assume it works just because the file exists.
3. Report what you found (working / broken / missing) before building anything new for that module.

**Blog specifically:** it may be partially built. Re-verify it exactly like every other module — do not skip it or assume it's done.

---

## ⚠️ RULE #2 — DO NOT HARDCODE, FOLLOW THE STRUCTURE

You will not be given fixed code to paste for every module. You will be given:
- The **scope definitions** (below) — what Read Only / Write Only / Read & Write / Admin must allow.
- A **generic pattern** to build once and reuse (below).

For every module, look at how authentication, response format, and error handling are already done elsewhere in this codebase (or in whichever module you build first as the reference — see Phase 1). Reuse that same pattern for every other module. Do not invent a different response shape or auth check per module.

---

## Scope Definitions (apply identically to every module)

| Scope | Allowed actions |
|---|---|
| **Read Only** | GET (list + single record) only. No create/update/delete. |
| **Write Only** | POST/PUT (create/update) only — no GET access. |
| **Read & Write** | Full GET + POST/PUT (read and update/create). No DELETE. |
| **Admin** | Everything — GET, POST, PUT, DELETE, plus module-specific admin-only actions (bulk actions, overrides, force actions). |

Every request must resolve the API key → look up its permission level for that specific module → reject with `403` if the requested action isn't allowed by that scope. **Do not duplicate this check by hand in every route file.** Build it once as a shared middleware/helper function, e.g. `checkScope(module, requiredLevel)`, and call it at the top of every route handler.

---

## Generic Route Pattern (adapt, don't copy blindly)

This is illustrative only — match it to whatever conventions already exist in the actual codebase (folder structure, ORM, DB client, response shape):

```
// Shared, built ONCE, reused everywhere:
verifyApiKey(request) -> returns { key, scopesByModule } or rejects 401

checkScope(scopesByModule, moduleName, action) -> allow or reject 403
  action is one of: "read", "write", "delete"

// Per module route, e.g. /api/external/{module}
GET    -> checkScope(module, "read")   -> return list/single record
POST   -> checkScope(module, "write")  -> create record
PUT    -> checkScope(module, "write")  -> update record
DELETE -> checkScope(module, "delete") -> requires Admin scope
```

Response shape, error format, and auth header parsing (`Authorization: Bearer <key>`) should match whatever is already used for the External Endpoint pattern shown in the admin dashboard.

---

## Phase 1 — Build ONE Reference Module First

Do not build all 20 modules in parallel. Build **Wallet** first end-to-end (it's already confirmed missing, and it's the one already being tested). Once Wallet is built and manually tested against all 4 scope levels, it becomes the template — reuse its middleware, auth check, and response pattern for every other module rather than rewriting the pattern each time.

---

## Phase 2 — Recommended Build Order

Build and fully test one module before moving to the next. Suggested order (highest priority / highest risk first):

1. **Wallet** — reference module, build first (see Phase 1)
2. **Payment** — high risk, see security note below
3. **Rewards Coin** — same balance-style logic as Wallet
4. **Products**
5. **Category**
6. **Inventory**
7. **Orders**
8. **Customer**
9. **Coupons**
10. **Offers**
11. **Support Ticket** — check against existing EspoCRM sync before changing ticket schema
12. **Role Management** — controls permissions for everything else, build carefully
13. **User Management**
14. **Team Management**
15. **Website Management**
16. **Marketing Campaign**
17. **Report & Analytics**
18. **Push Notifications**
19. **Blog** — re-verify existing implementation before rebuilding
20. **WhatsApp** — see note below, likely blocked

---

## Phase 3 — Per-Module Functional Notes

Use these to know *what* Read / Read&Write / Admin should mean for each module. Adapt field/table names to what actually exists in the codebase.

**Wallet** 🔒 — Read: balance + transaction history. Write: should create a transaction request, not directly set a balance number. Admin: manual credit/debit adjustment, must require a reason and write an audit log entry.

**Rewards Coin** — same pattern as Wallet. Must respect the 100-day coin expiry rule already in place.

**Payment** 🔒 — Read: transaction status/detail per order. Avoid allowing direct balance/amount edits at any scope below Admin — payment state should change via gateway callback or an internal ledger entry, never a raw field edit. Admin: manual refund trigger / void transaction only.

**Products** — Read: list/detail/price/variants/images. Write: update price/stock/description/images. Admin: create new product, delete, bulk import.

**Category** — Read: list/detail. Write: update name/description/image. Admin: create/delete/reorder.

**Inventory** — Read: stock levels per SKU. Write: update quantity/low-stock threshold. Admin: bulk import/override, delete stock record.

**Orders** — Read: list/detail/status. Write: update status, tracking info, notes. Admin: cancel, delete, force refund/status override, bulk export. Log every write here (see Phase 4).

**Customer** — Read: profile + order history. Write: update profile fields. Admin: deactivate/delete account, merge accounts.

**Coupons / Offers** — Read: list/detail/usage count. Write: update dates/limits/active status. Admin: create/delete.

**Support Ticket** — Read: list/detail/status/history. Write: update status, add reply, reassign. Admin: delete, force-close, bulk reassign. Cross-check with the existing EspoCRM sync job before changing this table's structure.

**Role Management** 🔒 — Read: list roles + their permissions. Write: update a role's permission set. Admin: create/delete custom roles. This module controls the permission system itself — mistakes here affect every other module's security.

**User Management / Team Management** 🔒 — Read: list admin/team users. Write: update user details/assigned role. Admin: create/delete users. Require Admin scope for any write here, regardless of what the dashboard shows as the minimum.

**Website Management** — Read: current site settings/content blocks. Write: update banners/homepage content. Admin: publish or roll back a config change.

**Marketing Campaign** — Read: list campaigns + stats. Write: create/update campaign. Admin: delete/pause campaigns.

**Report & Analytics** — This is inherently read-heavy. Read: reports/stats/traffic data. There may not be a meaningful Write tier — if a report-generation trigger is needed, put it under Admin and flag this back for confirmation rather than guessing.

**Push Notifications** — Read: sent notification logs. Write: create/schedule notification. Admin: cancel scheduled notification, manage audience segments.

**Blog** — Re-verify first (Rule #1). If confirmed broken/partial: Read: list/get posts. Write: create/update post + publish status. Admin: delete post, manage categories/tags.

**WhatsApp** ⚠️ — WhatsApp Business API integration is not live yet (pending business verification). Do not build this against a live API that doesn't exist. Stub the routes and flag this module as blocked until the integration is confirmed ready.

---

## Phase 4 — Testing Checklist (repeat for every module before moving on)

For each module, before marking it done:
- [ ] Existing code verified first (Rule #1) — found working / broken / missing, documented
- [ ] Read Only key → GET succeeds, POST/PUT/DELETE all rejected with 403
- [ ] Write Only key → POST/PUT succeeds, GET rejected with 403
- [ ] Read & Write key → GET + POST/PUT succeed, DELETE rejected with 403
- [ ] Admin key → everything succeeds, including DELETE and any module-specific admin actions
- [ ] Sensitive modules (Payment, Wallet, Rewards Coin, Role Management, User Management) — writes are logged/audited, no raw balance/permission edits without going through the proper action path

---

## Phase 5 — Report Back Format

After each module, report back in this shape before moving to the next:

```
Module: <name>
Existing state found: <working / broken / not built>
Built: <what was added>
Tested: <pass/fail per scope level>
Notes/blockers: <anything unresolved>
```

Do not move to the next module in the build order until the current one passes all four scope tests above.
