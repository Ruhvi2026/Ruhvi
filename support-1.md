# Ruhvi Support System — Build Specification

**Target site:** `support.ruhvi.in`
**Stack:** Next.js + Supabase (Postgres, Auth, Storage where applicable), integrated with EspoCRM (already deployed at `crm.support.ruhvi.in`) and Cloudinary (already configured, credentials available in this environment).

**Read this whole document before writing any code.** It defines two connected surfaces that live on the same Next.js app under different routes, plus the data contracts that keep them and the rest of the Ruhvi ecosystem (main site, EspoCRM, other subdomains) consistent.

---

## 1. What already exists — do not rebuild these

- **EspoCRM** at `crm.support.ruhvi.in` is the system of record for ticket status, agent assignment, and internal case notes. It already has:
  - A `Support` Team (id `6a929c74b2f843cbf`) whose members are the pool of assignable agents.
  - A Case entity with custom fields: `ruhviTicketId_c`, `ruhviStatus_c`, `ruhviCustomerEmail_c`, `ruhviCustomerName_c`, `ruhviCustomerPhone_c`.
  - Case `status` is a fixed enum: `New`, `Assigned`, `Pending`, `Closed`, `Rejected`, `Duplicate`. No other values exist — do not introduce new statuses in EspoCRM without editing its Entity Manager first.
  - A REST API reachable at `https://crm.support.ruhvi.in/api/v1/`, authenticated via `X-Api-Key` header.
- **A cron sync script** (`sync.mjs`, running on a separate GCP VM every 10 minutes) already:
  - Creates a Contact in EspoCRM when a new customer signs up in Supabase.
  - Creates a Case in EspoCRM when a new row appears in Supabase's `support_tickets` table.
  - Assigns every new Case to the least-busy member of the Support Team automatically (fewest open Cases, tie-broken by longest-idle agent, tie-broken by Team list order). **This assignment logic is the default/automatic path and already works end-to-end — do not duplicate it in the Next.js app.**
- **Supabase** is already the source of truth for customer accounts, order history, and transaction history (existing tables, do not rename or restructure them as part of this project).
- **Cloudinary** is already configured for image handling elsewhere in the Ruhvi stack. Reuse the same account/credentials — do not provision a new one.

This spec only covers what needs to be **added**: the `support_tickets` table and everything built on top of it (customer-facing ticket UI + internal support panel), plus the staff-identity sync described in Section 5.

---

## 2. The two surfaces

Both surfaces are part of the **same Next.js codebase and deploy as one app**, split by route and by auth/role gate — not two separate projects.

| Surface | Route prefix | Who uses it | Purpose |
|---|---|---|---|
| Customer Ticket UI | Embedded inside the main customer-facing site (`ruhvi.vercel.app` / the "Support" tab customers already use) | Logged-in customers | Raise tickets, see status, reply, upload proof |
| Internal Support Panel | `support.ruhvi.in` (dedicated subdomain, staff-only) | Support agents, managers, admins | Work every ticket: read, reply, reassign, tag other teams, attach internal notes, close |

The customer-facing pieces (ticket list, ticket detail, "raise a ticket" form) are **components inside the existing main website's codebase**, not a separate deployment — they already exist per the current architecture (customer raises ticket → sees it immediately with the "assigned within 30 min" message). This spec's job is to make sure those existing components read/write the same `support_tickets` schema that the new internal panel is built against, so the two stay in sync without any extra bridging code.

`support.ruhvi.in` itself is 100% internal/staff-only. No customer ever logs into it or is given its URL.

---

## 3. Customer-facing behavior (what already exists — spec only, do not rebuild the UI, but the agent building the internal panel needs to know this contract)

**Current domain note:** the main site is currently running at `ruhvi.vercel.app` during development; it moves to `ruhvi.in` after launch. Everything below applies to whichever domain is live at the time — don't hardcode either domain into logic that should just follow "the main site."

- Customer submits a ticket → row inserted into `support_tickets` → customer immediately sees it in their dashboard with the message: **"Your ticket will be assigned to our dedicated representative within 30 minutes. You can track the status after that."**
- **Access point:** "My Tickets" (or equivalent) must be reachable from the site's drawer/hamburger menu on both `ruhvi.in` and `ruhvi.vercel.app`, so a logged-in customer can always get to their ticket list from anywhere on the site, not just from wherever they originally raised the ticket.
- Customer can see: ticket status, their own messages, agent's customer-facing replies, and any images/PDFs attached to the conversation.
- Customer **cannot** see: which agent is assigned, internal notes, cross-team tags/mentions, or any internal-only attachment marked private.
- Customer can reply to an open ticket and attach an image or PDF (see Section 8 for upload rules).
- A closed ticket becomes read-only for the customer after closure (no new replies through the normal reply box), but remains visible in their history, and can still be **reopened** within 30 days of closing (see Section 3.2).

### 3.1 Guest / not-logged-in ticket lookup

A visitor who isn't logged in must still be able to check a ticket's status, via a simple lookup form (reachable from the same drawer-menu entry point) asking for:
- **Ticket number**, and
- **Email address** used when the ticket was raised.

Only if both match the same `support_tickets` row does the ticket's detail render, using the exact same customer-visible view described above (same fields shown, same fields hidden). If either doesn't match, show a generic "we couldn't find a matching ticket" message — never confirm which of the two fields was wrong, since that would let someone enumerate valid ticket numbers or emails.

This lookup is read-only by default: a guest can view status and the existing thread. Whether a guest can also **reply** (vs. needing to log in first to reply) is left to the build-agent's judgement based on how the rest of the site handles guest vs. logged-in actions elsewhere — but a guest must never be shown a ticket that isn't theirs, regardless of that choice.

### 3.2 Auto-close on customer inactivity, and reopening

- If a ticket is in a state that's waiting on the customer (e.g. `waiting_for_customer` / the Supabase-side equivalent of EspoCRM's `Pending`) and the customer does not reply within **24 hours**, the ticket auto-closes.
- **Before** that 24-hour auto-close fires, the customer must see an in-thread warning (e.g. "We haven't heard back — this ticket will auto-close if we don't get a reply soon") far enough ahead of the deadline to give them a real chance to respond, not a warning that arrives seconds before closure.
- The assigned agent must also be able to see, on the ticket itself, that it's approaching auto-close — this is not just a customer-facing warning, it should be visible in the internal panel (Section 4) as well so an agent knows a ticket in their queue is about to close itself.
- A ticket auto-closed this way can be **reopened by the customer within 30 days** of that closure. Reopening should: flip status back to an active state, notify the previously-assigned agent (or route through the normal auto-assignment if no agent was ever assigned), and — per Section 8 — cancel/reset that ticket's pending 30-day attachment-deletion timer, since the ticket is active again.
- After 30 days from closure, the ticket can no longer be reopened by the customer through self-service; at that point it behaves like any other permanently-closed ticket (staff can still manually intervene from the internal panel if truly needed, per admin override in Section 4.4).

---

## 4. Internal Support Panel (`support.ruhvi.in`) — functional requirements

### 4.1 Ticket list view
- Shows all tickets, filterable by: status, assigned agent, priority, date range, and "tagged to my team" / "tagged to me."
- Default view for an **agent**: tickets assigned to them, sorted oldest-first.
- Default view for a **manager**: all tickets for their team(s), with the ability to see agent-level workload (ticket count per agent) at a glance — this doubles as a manual sanity-check on the automatic least-busy assignment, not a replacement for it.
- Default view for an **admin**: every ticket, every team, unfiltered by default, with full drill-down.
- Each row shows: ticket number, customer name, subject, status, assigned agent, priority, last-updated time, and a visual flag if the ticket has an unread customer reply.

### 4.2 Ticket detail view
- Full conversation thread: customer messages and agent replies, in chronological order, clearly distinguishing "customer-visible" from "internal-only" content.
- A reply box that lets the agent choose:
  - **Reply to customer** (goes into the customer-visible thread; customer gets notified through the existing customer-side ticket UI).
  - **Internal note** (visible only inside `support.ruhvi.in`, never shown to the customer).
- File attachment on both reply types (image or PDF, see Section 8).
- Manual status change (New / Assigned / Pending / Closed / Rejected / Duplicate — same enum as EspoCRM, kept identical on purpose so the sync layer never has to translate an internal-panel-only status).
- Manual reassignment: an agent, manager, or admin can override the automatic least-busy assignment and assign the ticket to a specific Support Team member by name. This is the **exception path** — automatic assignment via the existing cron/EspoCRM logic remains the default for every new ticket; manual reassignment only fires when a human explicitly changes it.
- A visible, permanent **audit trail** per ticket: **every single action on a ticket — every status change, every reassignment, every tag/mention added or resolved, every reply and internal note — logged with who did it and an exact timestamp.** No action on a ticket should be able to happen without a corresponding logged, timestamped entry (see Section 9, which makes this a server-side guarantee rather than something a UI action could skip). Visible to managers and admins; agents can see the audit trail for their own tickets at minimum (see Section 6 for exact visibility rules to confirm with the person before building).

### 4.3 Cross-team tagging / mentions
This is the concrete scenario described: a customer says their order hasn't arrived, the support agent doesn't have shipping visibility, so they need to loop in Operations (or Marketing, or any other team/individual) to get an answer before replying to the customer.

Build **both** of the following, together, on every ticket:
- **Free-text @mention**: typing `@` in a reply or internal note brings up a searchable list of staff across all synced portals (see Section 5) and inserts a mention. The mentioned person gets a notification and gains visibility into that specific ticket even if they aren't normally in the Support Team's queue.
- **Department/team tag**: a dropdown to tag the ticket to a whole team (Operations, Marketing, Orders/Shipping, Admin) rather than one named person, for cases where the agent doesn't know exactly who owns it. Tagging a team makes the ticket visible in that team's portal (e.g., `operations.ruhvi.in`, once that portal exists) with a clear indicator that Support is waiting on their input.
- Either kind of tag lets the tagged person/team add their own reply (visible to the original agent, and to the customer only if explicitly marked customer-visible) — this is how "Operations confirms the dispatch delay reason" flows back to the Support agent without the agent needing raw access to shipping data they don't have permission for.
- A tagged ticket must clearly show, in the ticket detail view, **who/which team is currently tagged and still owes a response**, so nothing silently stalls.

### 4.4 Resolution SLA / timeframe

Every ticket has a target resolution timeframe so customers aren't left waiting indefinitely, based on the same `priority` field already used everywhere else (Low / Normal / High / Urgent — the existing EspoCRM enum, kept identical). Default starting values (**configurable — see below, not hardcoded**):

| Priority | Target resolution time |
|---|---|
| Urgent | 4 hours |
| High | 12 hours |
| Normal | 24 hours |
| Low | 48 hours |

- These numbers are a starting default, not a permanent constant — store them as **editable configuration** (a small settings table or admin-editable config, not a magic number buried in code) so the person can change them later as the team's capacity changes, without needing a code deploy.
- The SLA clock starts at ticket creation (`created_at`) and the target deadline is `created_at + SLA hours for that priority`.
- When a ticket is within a reasonable window of breaching its SLA (e.g., 80% of the time elapsed) or has already breached it, the internal panel (ticket list and detail view, Section 4.1–4.2) must visually flag it — this is what lets a manager or admin catch a ticket that's about to make a customer wait too long, before the customer has to complain about it.
- This is a resolution-time target, separate from the existing 30-minute first-assignment promise already shown to the customer at ticket creation (Section 3) — don't conflate the two.

### 4.5 Admin oversight
- Admin role can see every ticket across every team/agent, with full history of who touched it and what changed (built on the same audit trail as 4.2, just without the scoping restrictions a manager or agent has).
- Admin can reassign any ticket, override any status, and access every internal note and tag on any ticket, at any time.

---

## 5. Cross-portal identity, roles, and permissions — the sync requirement

This is the part the person explicitly called out as critical: **staff identity must not live only in one place.**

- Every staff member (agent, manager, admin, and eventually operations/marketing/orders-team members on their own subdomains) is created once and must be consistently know­n to:
  1. **Supabase** — as the source of truth for that staff member's login/auth and role/permission record, the same way customer identity already lives in Supabase.
  2. **EspoCRM** — as a User, and (for anyone who should be assignable to tickets) as a member of the relevant EspoCRM Team, exactly like the `Support` Team already works for ticket assignment.
- When a staff account is created, updated (role change, deactivation), or removed, that change must propagate to both systems — the same "who is source of truth for what" discipline already used between EspoCRM and Supabase for customer/ticket data applies here: pick one system as the origin of staff-record writes (recommend: Supabase, since every portal already authenticates against it) and treat EspoCRM's User/Team membership as a **synced copy**, updated the same way `sync.mjs` already keeps EspoCRM Contacts/Cases in sync from Supabase.
- Practically, this means: **extend the existing sync script (or a new sibling script following the same pattern) to also sync a `staff` table** (Section 7 defines it) — new staff → EspoCRM User + Team membership; role/permission change → updated EspoCRM side; deactivation → removed from the relevant EspoCRM Team so they drop out of the assignment pool automatically (this is what makes "add a new agent and they're instantly eligible for auto-assignment, with zero code changes" — already true for Support — extend cleanly to every future team).
- Each portal (`support.ruhvi.in` now, others later) reads role/permission from the same `staff` table so a manager's access level looks and behaves identically no matter which subdomain they're on.

---

## 6. Open questions the Antigravity build-agent should confirm with the person before finalizing permission logic

These are genuinely undecided and shouldn't be guessed at silently, since getting them wrong either locks staff out of things they need or exposes internal data too broadly:

1. Exact role list and their boundaries: this spec assumes **Agent / Manager / Admin**, but confirm whether a Manager's visibility is scoped to "their team" (and if so, how a team is defined for Support specifically — is it just the EspoCRM `Support` Team, or a separate concept?).
2. Whether an agent can see the full audit trail on their own tickets (including a manager's later override of their reassignment), or only a customer-facing-safe subset of it.
3. Whether a customer-visible reply from a tagged team member should show that team member's real name to the customer, or a generic "Ruhvi Support Team" label (recommend the latter for consistency, but confirm).
4. Notification channel for @mentions and team-tags — in-app only, or also email/SMS. (Not yet decided; do not assume email sending is wired up.)
5. Whether a guest (not logged in, per Section 3.1) can **reply** to a ticket after a successful ticket-number + email lookup, or must log in first to send a reply (view-only either way is already decided; replying is not).
6. Notification channel for the pre-auto-close warning (Section 3.2) and the SLA-breach flag (Section 4.4) — same open question as #4: in-app only, or also email/SMS.

---

## 7. Data model additions (Supabase)

Several new tables are needed beyond `support_tickets`, which already exists and only needs the extra columns noted in 7.1. Column names below are suggestions the build-agent should adapt to match existing naming conventions already used in the Supabase schema (e.g. if existing tables use `snake_case` timestamps like `created_at`, follow that same convention here).

### 7.1 `support_tickets` (if not already fully matching this — confirm against what already exists before altering)
Core columns needed for everything in this spec to work:
- `id`, `ticket_number` (format `RUV-YYYY-NNNNNN`, already in use — keep it), `customer_id` (FK to existing customer/user table), `title`, `description`, `status`, `priority`, `created_at`, `updated_at`, `closed_at`.
- `espo_case_id` — nullable, filled in once the sync job creates the matching EspoCRM Case (already how the existing sync retry logic detects "failed to sync" rows — do not remove or repurpose this column).
- `customer_email` — kept directly on the ticket (not just resolvable via a join to the customer's account) specifically so the guest lookup in Section 3.1 can match on it even for edge cases; keep this in sync with the customer's account email at creation time.
- `sla_deadline` — computed at creation as `created_at + <SLA hours for this ticket's priority, from support_sla_config>`, used to drive the visual flagging in Section 4.4.
- `close_reason` — e.g. `resolved` | `auto_closed_no_reply` | `rejected` | `duplicate` — lets the audit trail and any future reporting distinguish a genuine resolution from an auto-close, which matters for Section 3.2's reopen flow.
- `pending_customer_reply_since` — nullable timestamp, set when the ticket enters a customer-waiting state; this is what the 24-hour auto-close job (Section 3.2) checks against, and what determines when the pre-close warning should fire.
- `auto_close_eligible_until` — nullable timestamp, set alongside `closed_at` when `close_reason = auto_closed_no_reply`, equal to `closed_at + 30 days`; this is the boundary the reopen flow (Section 3.2) checks before allowing self-service reopening.

### 7.1a `support_sla_config` (new — backs Section 4.4)
- `priority` (PK, matches the existing `Low`/`Normal`/`High`/`Urgent` enum), `target_hours` (integer), `updated_at`, `updated_by_staff_id`.
- Seed with the defaults from Section 4.4 (4 / 12 / 24 / 48 hours) on initial setup. This table is what makes the SLA numbers editable without a code deploy — the app reads from here, never from a hardcoded constant.

### 7.2 `support_ticket_messages` (new — the conversation thread)
- `id`, `ticket_id` (FK), `author_type` (`customer` | `staff`), `author_id`, `body`, `visibility` (`customer` | `internal`), `created_at`.
- This single table backs both the customer-visible thread and the internal-notes thread — the `visibility` column is what the UI filters on for each surface. Keep it one table, not two, so the audit/history story stays simple.

### 7.3 `support_ticket_attachments` (new)
- `id`, `message_id` (FK to `support_ticket_messages`), `cloudinary_public_id`, `cloudinary_url`, `file_type` (`image` | `pdf`), `file_size_bytes`, `uploaded_at`, `visibility` (inherits the parent message's visibility, or set independently if the build-agent finds a reason to — default to inheriting).

### 7.4 `support_ticket_tags` (new — the tagging/mention system from 4.3)
- `id`, `ticket_id` (FK), `tag_type` (`person` | `team`), `tagged_staff_id` (nullable, FK to `staff`, used when `tag_type = person`), `tagged_team` (nullable text/enum: `operations`, `marketing`, `orders`, `admin`; used when `tag_type = team`), `tagged_by_staff_id`, `created_at`, `resolved_at` (nullable — set when the tag gets a response, this is what powers the "still owes a response" indicator in 4.3).

### 7.5 `support_ticket_audit_log` (new — backs Section 4.2's audit trail)
- `id`, `ticket_id` (FK), `actor_staff_id`, `action_type` (`status_change` | `reassignment` | `tag_added` | `tag_resolved` | other as needed), `previous_value`, `new_value`, `created_at`.

### 7.6 `staff` (new — backs Section 5)
- `id`, `email`, `full_name`, `role` (`agent` | `manager` | `admin`), `team` (which portal/team they primarily belong to — `support`, `operations`, `marketing`, `orders`, `admin`), `espo_user_id` (nullable, filled once synced to EspoCRM), `is_active`, `created_at`, `updated_at`.

---

## 8. File upload rules (apply identically on both the customer-facing side and the internal panel)

- **Provider:** Cloudinary (already configured — the build-agent should use the existing project credentials rather than creating a new Cloudinary account or API key).
- **Allowed types:** image files and PDF only. Reject everything else server-side (not just via the file picker's `accept` attribute, which a malicious client can bypass) — validate actual file content/MIME type on upload, not just the extension.
- **Max size:** 10 MB per file.
- **Abuse/misuse protection (explicitly requested — build this in, don't treat it as optional hardening):**
  - Rate-limit uploads per customer/staff account (e.g., a sane per-hour cap) so the upload endpoint can't be used to spam storage or run up Cloudinary costs.
  - Server-side re-validation of file type and size on every upload request, never trusting client-side checks alone.
  - Scan or otherwise sanity-check that an "image" upload is actually a valid image and a "PDF" upload is actually a valid PDF, to reduce the chance of disguised malicious files being stored or served back to another user.
  - Store attachments referencing Cloudinary's hosted URL/ID (per Section 7.3) rather than proxying raw file bytes through the app's own database, keeping the database itself free of binary blobs and reducing attack surface there.
- **Retention:** attachments are **temporary**. Once a ticket is closed, its attachments must be automatically deleted (both the Cloudinary asset and the local reference row) **30 days after `closed_at`**. This needs a scheduled job (e.g., a daily cron alongside the existing sync jobs) that finds tickets closed more than 30 days ago and purges their attachments. Reopening a closed ticket before the 30-day mark should reset/cancel the pending deletion for that ticket's attachments.

---

## 9. Security baseline (explicitly requested: "database protected rahe", "koi misuse/abuse na kar paye")

- All Supabase tables in Section 7 must have Row Level Security enabled, with policies that enforce exactly the visibility rules described above: a customer can only ever read their own tickets/messages/attachments where `visibility = 'customer'`; staff visibility follows their role and team per Section 4 and whatever gets confirmed in Section 6.
- The internal panel (`support.ruhvi.in`) must never be reachable without an authenticated staff session — no public routes, no unauthenticated API endpoints that return ticket data.
- Every write that changes ticket state (status, assignment, tag) must go through server-side logic that also writes the corresponding `support_ticket_audit_log` row in the same transaction/operation — the audit trail should be a side effect of the write path itself, not something that can be skipped or forgotten by a particular UI action.
- Uploads follow Section 8's abuse controls without exception, on both customer and internal upload paths.

---

## 10. What this spec deliberately leaves out of scope

- Building `operations.ruhvi.in`, `marketing.ruhvi.in`, or `orders.ruhvi.in` themselves — Section 5's staff-sync and Section 4.3's team-tagging are designed so those portals can plug into the same `staff` table and tagging system later, but building those other portals is a separate, later project.
- ShipRocket or any other shipping-provider API integration — the order/shipping dashboard is explicitly still basic/non-functional per the person, and this support system should not assume live shipping data is available. Build the tagging flow (4.3) so a human on the Operations side can manually answer a tagged shipping question in the meantime; wiring that to a live shipping API is future work, not part of this spec.
- Changing anything about the existing `sync.mjs` least-busy assignment logic itself — it already works and is out of scope here beyond the staff-sync extension described in Section 5.
