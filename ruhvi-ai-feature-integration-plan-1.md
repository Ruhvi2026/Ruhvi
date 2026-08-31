# Ruhvi Jewels — AI Feature Integration Plan

**Goal:** Extend the existing AI Control Center (multi-provider routing + fallback) to power new AI-assisted features across the admin, ops, and support platforms — without touching or breaking anything currently live (chatbot, SEO metadata generation, routing/fallback logic).

---

## 1. What already exists (do not rebuild)

- **AI Control Center** at `ruhvi.in/admin/ai-settings` with tabs: Dashboard, Analytics, Providers, Routing & Fallback, Failure Diagnostics (24h), Prompts, Playground, Security & Rate Limits, Global Settings.
- **Routing strategy:** Priority Chain (sequential cascade, primary → secondary on 5xx/timeout). Alternatives available but unused: Round Robin, Best Responsive.
- **Fallback Priority Order (global):**
  1. Google Gemini — `gemini-3.6-flash`
  2. OpenRouter — `inclusionai/ling-3.0-tiny:free`
  3. DeepSeek AI — `deepseek-v4-flash`
  4. OpenAI
  5. Anthropic Claude
  6. Custom Gateway (OpenAI Compatible) — currently **disabled**
- **Feature-Specific Model Binding:** lets individual features override the global chain with their own provider/model.
  - **Chatbot** — bound to Google Gemini / `gemini-3.6-flash`, toggle ON.
  - **Product Description** — toggle exists but is **OFF**; provider set to Custom Gateway with **no model selected**.
  - **SEO Metadata** — toggle ON.
- **Failure Diagnostics (24h)** tab already logs provider failures/timeouts — new features should log here too, not create a separate log.
- **Multiple keys per provider:** the system must support adding more than one API key/instance for the same provider as separate entries (e.g. Gemini-1, Gemini-2, Gemini-3 using three different Gemini API keys) so they can each sit in the Priority Chain / be bound to different features. This is an existing capability that must keep working — not a new feature to build.

**Key principle for everything below:** every new AI feature is just a new *feature key* in this same system. No feature should call a provider API directly — it should always go through the same internal routing layer the Chatbot already uses.

---

## 2. New features being added

### 2.1 Product Description Generator
- **Where:** Admin/Operations Portal, product add/edit form.
- **Trigger:** "Generate Description ✨" button, enabled once required fields are filled (name, category, material, weight, gemstone/stone, occasion).
- **Output:** (a) customer-facing product description, (b) SEO meta title + meta description (150–160 chars) — both editable before save.
- **Call pattern:** one-time generation at listing time. Result is stored as static text in the product record. **No live AI calls on customer page views.**

### 2.2 Support Reply Enhancer
- **Where:** Support Dashboard (`support.ruhvi.in`), ticket reply view.
- **Trigger:** Agent drafts a reply → clicks "Enhance" → draft is rewritten for grammar/tone/clarity using the draft + original customer message (+ order context if relevant) as input.
- **Rule:** AI never auto-sends. Agent always reviews the enhanced draft before hitting Send — same UX pattern as Kilo Code's own Enhance Prompt.

### 2.3 Other candidate integrations (future, not in this phase)
| Area | Use |
|---|---|
| Coupons & Offers | Generate promo copy/banner text from discount %, occasion, category |
| Marketing Portal | Draft newsletter content, social captions, WhatsApp broadcast copy |
| Ticket Queue / Support Portal | Auto-summarize long ticket threads; sentiment/urgency tagging for SLA prioritization |
| Support Analytics / Reports | Plain-English narrative summary on top of raw numbers |
| Staff Productivity | Auto-drafted per-agent performance summary |
| Notifications | Order-status / wallet-update copy in brand voice |
| Wallet re-engagement | "Unused Reward Coins" / cart-abandonment nudge copy |

Not recommended for AI: Orders Portal, Audit Logs, Security & Rate Limits, SLA Config — operational/data screens, not content generation.

### 2.4 Ollama on Oracle Cloud (parallel, optional track)
- Ollama exposes an OpenAI-compatible API (`/v1/chat/completions`).
- Slots in as just another entry under **Custom Gateway (OpenAI Compatible)**, pointed at the Oracle VM's endpoint.
- No separate integration path needed — it becomes another node in the Priority Chain or a per-feature binding option, same as any other provider.
- Keep this decoupled from Phase 1 below — nice-to-have, not a dependency.

---

## 3. Architecture rule (why nothing should break)

```
[Feature UI button] → /api/ai/invoke?feature=<key>
                            │
                    reads Feature-Specific Model Binding
                            │
              binding ON? ──┴── binding OFF?
                 │                   │
         use bound provider    fall back to global
         + model                Priority Chain
                            │
                    call provider (with existing
                    fallback cascade on 5xx/timeout)
                            │
                    log to Failure Diagnostics (24h)
```

Because every feature (old and new) goes through the same `/api/ai/invoke` layer, adding features means **adding rows to Feature-Specific Model Binding**, not writing new provider-calling code per feature. This is what prevents regressions to the chatbot or SEO metadata generation.

---

## 4. Step-by-step implementation plan

### Phase 0 — Safety net (before touching anything)
1. Confirm `/api/ai/invoke` (or whatever the chatbot currently calls) is a single shared internal endpoint, not duplicated per feature. If it's currently chatbot-specific, generalize it to accept a `feature` parameter without changing its existing chatbot behavior.
2. Take a config snapshot / backup of current AI Control Center settings (Routing & Fallback + Feature-Specific Model Binding) before making changes.
3. Test any change first in the **Playground** tab (already built for this) before enabling it live.

### Phase 1 — Fix/finish existing Product Description binding
4. In Feature-Specific Model Binding, either:
   - select a model under Custom Gateway (currently disabled — not usable until enabled), **or**
   - switch Product Description's provider to Google Gemini or DeepSeek (already active/working), matching the Chatbot pattern.
5. Toggle Product Description **ON** only after a model is confirmed selected and tested in Playground.
6. Build the prompt template for product description generation (attributes → description + SEO meta) in the **Prompts** tab, consistent with how existing prompts are managed there.

### Phase 2 — Wire up the admin UI button
7. Add "Generate Description ✨" button to the product add/edit form, calling `/api/ai/invoke?feature=product_description`.
8. Enable button only when required fields are filled.
9. Render returned description + SEO fields as editable text; nothing auto-saves without admin review.
10. Test with real product data in a staging/test product entry (not a live customer-facing one) before wider use.

### Phase 3 — Add Support Reply as a new bound feature
11. Add a new row "Support Reply" to Feature-Specific Model Binding (toggle OFF by default until tested).
12. Assign provider/model (start with an existing active provider — Gemini or DeepSeek — for consistency and lower risk).
13. Build the prompt template in Prompts tab: input = agent's draft + customer's original message (+ order context if relevant); instruction = fix grammar/tone, stay on-brand, don't invent facts not present in the draft/ticket.
14. Add "Enhance" button to the support dashboard's ticket reply box, calling `/api/ai/invoke?feature=support_reply`.
15. Toggle the feature ON only after a few test tickets confirm expected output quality.

### Phase 4 — Validation before wider rollout
16. Run both new features through Playground and Failure Diagnostics for at least a day of light real use.
17. Confirm fallback still works: temporarily disable the primary provider for one feature and confirm it cascades correctly instead of failing silently.
18. Confirm Chatbot and SEO Metadata features are unaffected — same output quality/speed as before any changes (regression check).
19. Check Analytics/Dashboard tabs still reflect accurate usage across all features, old and new.

### Phase 5 — Optional: Ollama/Oracle Cloud provider
20. Deploy Ollama on the Oracle Cloud VM, confirm `/v1/chat/completions` responds correctly via a direct curl test.
21. Add it as a Custom Gateway entry in Providers tab; do **not** set it as primary for any feature initially — add it low in the Fallback Priority Order or as an opt-in binding for one low-risk feature first.
22. Monitor latency/reliability before considering it for higher-priority use.

---

## 5. Rollback plan (if something breaks)

- Every new feature has its own toggle in Feature-Specific Model Binding — turning it OFF immediately stops it from being called, without affecting other features.
- If a shared piece (e.g. `/api/ai/invoke`) was generalized in Phase 0 and something regresses, the config snapshot from step 2 is the reference point to diff against.
- Because routing/fallback logic is shared but feature bindings are independent, a bad prompt template or wrong model on one feature cannot cascade into another feature's behavior.

---

## 6. Non-negotiable requirements (verify at every phase, not just at the end)

These apply throughout implementation, not as a one-time final check:

- **Build on the existing structure, don't replace it.** All new work (Product Description, Support Reply, and any future feature) must sit on top of the current AI Control Center — routing, fallback, Feature-Specific Model Binding, Prompts, Failure Diagnostics — exactly as it already works. No parallel/competing system.
- **Multi-key/multi-instance support must keep working.** It must remain possible to add multiple API keys of the same provider (e.g. three separate Gemini keys as distinct entries) into the Priority Chain or feature bindings, same as today. Confirm this still works after any change to routing or provider config.
- **Fallback/failover rules must keep working correctly.** The Priority Chain cascade (primary → secondary on 5xx/timeout) must be explicitly re-tested after every phase, not assumed — trigger a real failure on the primary provider and confirm it correctly falls to the next one in order.
- **Mandatory live testing after every phase, before moving to the next:**
  1. Confirm the AI chatbot (and any other already-working feature, e.g. SEO Metadata) still responds correctly — same as before the change.
  2. Confirm whatever was just implemented in that phase also works correctly end-to-end (not just in Playground — a real/live test).
  3. Only proceed to the next phase once both checks above pass.

---

## 7. Open decisions still needed

- [ ] Final model choice for Product Description binding (currently unset).
- [ ] Final model choice for new Support Reply binding.
- [ ] Whether Custom Gateway (OpenAI Compatible) gets enabled now or stays disabled until Ollama is ready.
- [ ] Priority order for Phase 3+ candidate features (Coupons copy vs. ticket summarization vs. others) — suggested starting point: ticket summarization (helps the 30-min SLA) and coupon/offer copy (low risk, quick win).
