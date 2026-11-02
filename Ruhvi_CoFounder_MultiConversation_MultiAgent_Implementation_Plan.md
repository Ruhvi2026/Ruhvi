# RUHVI AI CO-FOUNDER & WORKER CHAT SYSTEM
## Phase-by-Phase Implementation Plan

**Document type:** Technical implementation roadmap  
**Repository reviewed:** `Ruhvi2026/Ruhvi` (`main`)  
**Primary application area:** `/co-founder`  
**Backend area:** `src/app/api/admin/co-founder/*` and `src/lib/ai/co-founder/*`  
**Status:** Planning only — no repository files or database records have been changed  
**Implementation principle:** Extend the existing system. Do not rebuild the Co-Founder, worker registry, approval engine, voice stack, or existing tools.

---

## 1. লক্ষ্য ও চূড়ান্ত ধারণা

এই implementation-এর লক্ষ্য হলো Ruhvi AI Co-Founder-কে একটি **multi-conversation, multi-agent workspace**-এ পরিণত করা। Admin একই Co-Founder-এর সঙ্গে একাধিক আলাদা topic বা project নিয়ে আলাদা conversation চালাতে পারবেন। পাশাপাশি তিনি প্রয়োজন অনুযায়ী নির্দিষ্ট AI worker-এর সঙ্গে সরাসরি কথা বলতে পারবেন। Worker-রা backend-এ একে অপরের কাছ থেকে প্রয়োজনীয় domain information নিতে পারবে এবং Co-Founder-এর সঙ্গেও communicate করতে পারবে।

### 1.1 Admin-এর Co-Founder chat

Co-Founder-এর chat experience ChatGPT-এর conversation workflow-এর মতো হবে:

- **New Chat:** নতুন topic বা project-এর জন্য নতুন conversation শুরু করা।
- **Conversation List:** আগের conversation-গুলো title ও last activity অনুযায়ী list-এ দেখা।
- **Reopen:** list থেকে পুরনো conversation খুলে ঠিক সেই topic-এর আগের discussion চালিয়ে যাওয়া।
- **Delete:** কাজ শেষ হয়ে গেলে নির্দিষ্ট conversation delete করা। Delete করলে অন্য conversation বা global business memory প্রভাবিত হবে না।
- **Independent Context:** এক conversation-এর message অন্য conversation-এর active chat history-তে যাবে না।
- **Auto Title:** প্রথম কয়েকটি message থেকে conversation-এর উপযুক্ত title তৈরি করা; দরকার হলে admin title edit করতে পারবেন।

### 1.2 Individual Worker Chat

Admin চাইলে workforce UI থেকে যেকোনো registered worker select করে তার সঙ্গে সরাসরি আলোচনা করতে পারবেন। উদাহরণ:

- Marketing Worker — campaign, Meta Ads, creative angle, audience ও promotion strategy।
- SEO Worker — technical SEO, product metadata, keyword ও search discovery।
- Analytics & Performance Worker — revenue, traffic, conversion, anomaly ও business metrics।
- Product Worker — catalog, product information, SKU ও product content।
- Inventory Worker — stock, demand, reorder ও stockout risk।
- অন্য registered specialist workers-ও একইভাবে chat করতে পারবে।

**Worker chat-এর জন্য ChatGPT-style topic list, New Chat list বা delete workflow এই scope-এ প্রয়োজন নেই।** প্রতিটি worker-এর জন্য একটি dedicated chat window থাকবে এবং একই admin সেই worker-এর সঙ্গে আগের direct discussion চালিয়ে যেতে পারবেন। Worker chat-এর message context Co-Founder-এর conversation list-এর মধ্যে দেখানো হবে না।

### 1.3 Backend Agent-to-Agent Communication

Worker-রা শুধু admin-এর prompt-এর অপেক্ষায় থাকবে না। কাজের প্রয়োজনে:

- একজন worker অন্য worker-কে নির্দিষ্ট প্রশ্ন বা sub-task পাঠাতে পারবে।
- প্রাপ্ত উত্তর, evidence ও structured findings নিজের চলমান task-এর context-এ ব্যবহার করতে পারবে।
- Co-Founder worker-কে task দিতে পারবে, worker-এর result গ্রহণ করতে পারবে এবং প্রয়োজনে follow-up instruction দিতে পারবে।
- Worker কোনো decision বা action-এর জন্য Co-Founder-এর guidance চাইতে পারবে।
- Co-Founder একাধিক worker-কে coordinated plan-এ যুক্ত করে combined result দিতে পারবে।

এই communication হবে **server-side orchestration**-এর মাধ্যমে। Worker-দের মধ্যে unrestricted, uncontrolled বা infinite message loop তৈরি করা হবে না।

---

## 2. Existing Codebase Study: বর্তমান অবস্থা

নিচের observations repository-এর বর্তমান `main` branch-এর code inspection-এর ওপর ভিত্তি করে। এগুলো live production execution result নয়।

### 2.1 Co-Founder chat-এর বর্তমান অবস্থা

| Existing file | বর্তমান দায়িত্ব | নতুন implementation-এর জন্য প্রাসঙ্গিক বিষয় |
|---|---|---|
| `src/app/co-founder/page.tsx` | মূল Co-Founder UI, chat state, voice, image upload, worker visualizer ও workspace | `messages` বর্তমানে React state-এ রাখা হয়; thread ID বা conversation list flow দেখা যায়নি। UI-তে multi-conversation navigation যোগ করতে হবে। |
| `src/app/api/admin/co-founder/chat/route.ts` | Admin-authenticated Co-Founder chat, provider selection, tool/agent orchestration, streaming path | POST request-এ `messages` নেওয়া হয়, কিন্তু `conversationId` persist/load করার flow নেই। GET handler বর্তমানে operational alerts/signals-এর জন্য ব্যবহৃত হয়, chat history-এর জন্য নয়। |
| `src/lib/ai/co-founder/brain.ts` | Co-Founder system prompt, live business context, proactive signal ও long-term memory context তৈরি | Conversation-scoped context এবং global memory-কে আলাদা boundary-তে রাখতে হবে। |
| `src/lib/ai/co-founder/memory-engine.ts` | Semantic memory retrieval ও synthesis | Existing memory engine-কে global strategic memory হিসেবে রাখতে হবে; thread history-এর বিকল্প হিসেবে ব্যবহার করা যাবে না। |
| `src/lib/ai/co-founder/orchestrator.ts` | Model/provider orchestration ও tool execution loop | Existing tool loop ও provider fallback বজায় রেখে conversation context inject করতে হবে। |
| `src/lib/ai/index.ts` | Central AI provider/credential/fallback routing | নতুন worker chat যেন আলাদা, duplicate provider system তৈরি না করে; বিদ্যমান routing/configuration reuse করতে হবে। |

### 2.2 Existing worker architecture

| Existing file | বর্তমান দায়িত্ব | নতুন implementation-এর জন্য প্রাসঙ্গিক বিষয় |
|---|---|---|
| `src/lib/ai/co-founder/workers/types.ts` | `WorkerId`, `WorkerTaskInput`, `WorkerStructuredOutput`, `AIWorkerInterface` | বর্তমানে worker contract মূলত task execution ও structured result-ভিত্তিক; natural conversation contract আলাদাভাবে যোগ করতে হবে। |
| `src/lib/ai/co-founder/workers/registry.ts` | Worker registration, definition lookup ও keyword-based routing | এই registry-ই canonical worker source হবে; UI-তে আলাদা duplicate worker list hard-code করা যাবে না। |
| `src/lib/ai/co-founder/workers/dispatcher.ts` | Worker task dispatch, structured result, Co-Founder synthesis ও approval request | Existing dispatch ও multi-worker plan reuse করতে হবে; direct worker chat-কে এই execution path-এর সঙ্গে যুক্ত করতে হবে। |
| `src/lib/ai/co-founder/workers/intelligent-planner.ts` | Goal decomposition ও dependency-ordered multi-worker plan | Co-Founder-এর cross-worker coordination-এর foundation হিসেবে থাকবে। |
| `src/lib/ai/co-founder/tool-bridge.ts` | Co-Founder-এর tools execute করা এবং permission checks | Worker consultation tool/service একই permission discipline অনুসরণ করবে। |
| `src/lib/ai/co-founder/workers/status-builder.ts` | Live worker status তৈরি | Workforce UI-এর live status data reuse করতে হবে। |
| `src/app/api/admin/co-founder/workers/route.ts` | বর্তমানে admin-authenticated worker status GET endpoint | এটি worker directory/status endpoint হিসেবে থাকবে; direct chat API আলাদা হবে। |

### 2.3 গুরুত্বপূর্ণ baseline mismatch

1. **Worker count mismatch:** `workers/types.ts` ও `workers/registry.ts`-এ ১৩টি worker ID/register করা হয়েছে; কিন্তু `brain.ts`-এর Co-Founder instruction-এ ১২টি worker-এর কথা বলা হয়েছে। বর্তমান plan-এ ১৩টি registered worker-কে source of truth ধরা হবে এবং সব prompt/UI/API metadata একই registry থেকে sync করা হবে।
2. **Legacy UI worker roles:** `SWARM_NODES` এবং fallback `WorkerGrid` data-তে `researcher`, `coder`, `writer`, `designer`, `analyst`, `marketer`-এর মতো ছয়টি legacy role রয়েছে। এগুলো canonical backend `WorkerId`-এর সঙ্গে এক-একভাবে মেলে না। UI mapping reconcile না করে direct chat চালু করা যাবে না।
3. **Client-এর worker role backend-এ যাচ্ছে, কিন্তু route সেটি পড়ছে না:** `src/app/co-founder/page.tsx` request body-তে `role: targetedRole` পাঠায়। কিন্তু `src/app/api/admin/co-founder/chat/route.ts`-এর destructuring-এ `role` নেওয়া হয় না। তাই বর্তমান legacy tag/selection-কে direct worker routing ধরে নেওয়া যাবে না।
4. **Worker registry direct chat API নয়:** `dispatchWorkerTask()` একটি task চালিয়ে `WorkerStructuredOutput` দেয়; এটি নিজে পূর্ণ chat-session/message persistence interface নয়। Worker-এর সঙ্গে স্বাভাবিক conversation করার জন্য আলাদা chat adapter/service দরকার।
5. **Existing session table chat-thread table নয়:** `supabase/migrations/0102_co_founder_memory_and_sessions.sql`-এ `co_founder_sessions` আছে। এতে `room_name`, `status`, `summary`, `topics`, `decisions`, `pending_actions` আছে; কিন্তু conversation message table বা ChatGPT-style thread CRUD structure নেই। এটিকে সরাসরি multi-chat storage হিসেবে repurpose করা উচিত নয়।
6. **বর্তমান chat history UI state-নির্ভর:** `page.tsx`-এ `messages` `useState` দিয়ে শুরু হয় এবং request-এর সময় পুরো message array পাঠানো হয়। আলাদা conversation ID, server-side message retrieval ও thread list যুক্ত না করলে topic isolation এবং refresh-এর পর history restore করা যাবে না।
7. **Worker list UI ও backend registry আলাদা:** `WorkerGrid`-এর initial display data legacy role-এর ওপর নির্ভর করে; live workforce data থাকলেও card-to-worker navigation canonical WorkerId দিয়ে নিশ্চিত করতে হবে।

### 2.4 Existing functionality যেগুলো অক্ষত রাখতে হবে

- Co-Founder-এর existing system prompt, business context ও global long-term memory।
- Existing 13-worker registry, domain worker implementations ও `dispatchWorkerTask()`।
- `executeMultiWorkerPlan()` এবং intelligent planner।
- Existing Co-Founder tools, MCP permission checks ও provider/credential fallback।
- Human approval flow, Action Center, action execution ও closed-loop verification।
- LiveKit voice session, browser voice, transcript handling ও voice customization।
- Image upload/Cloudinary workflow, multimodal prompt support, browser window ও workspace visualizer।
- Existing workforce status, proactive signals, alerts, approvals ও intelligence drawer।
- Existing admin RBAC ও `requireAdmin()` security boundary।

---

## 3. Architecture Principles ও নির্ধারিত আচরণ

### 3.1 Context isolation model

System-এ তিন ধরনের context আলাদা থাকবে:

| Context layer | কী থাকবে | কোথায় ব্যবহার হবে |
|---|---|---|
| **Conversation context** | একটি নির্দিষ্ট Co-Founder thread-এর messages, thread summary, সেই thread-এর attachments ও collaboration summaries | শুধু ওই Co-Founder conversation-এ |
| **Worker context** | নির্দিষ্ট worker-এর সঙ্গে admin-এর direct chat history এবং worker-এর domain-scoped context | শুধু সংশ্লিষ্ট worker-এর direct chat-এ |
| **Global business memory** | Founder-এর explicitly saved preference, business rules, approved decisions, brand facts ও authoritative live business data | Co-Founder ও অনুমোদিত worker প্রয়োজন অনুযায়ী ব্যবহার করতে পারবে |

**মূল নিয়ম:** একটি topic-এর conversation history অন্য topic-এ স্বয়ংক্রিয়ভাবে inject হবে না। Global memory আলাদা থাকবে এবং conversation delete করলে global business memory delete হবে না। কোনো topic-এর তথ্য long-term global memory-তে promote করার আগে explicit/approved memory policy থাকতে হবে।

### 3.2 Conversation ownership ও data model

প্রস্তাবিত data model হবে:

- `co_founder_conversations` — Co-Founder chat thread এবং এক worker-এর direct chat session-এর metadata।
- `co_founder_messages` — User, Co-Founder, worker, tool ও system message-এর durable history।
- `co_founder_worker_collaboration_events` — backend-এ worker-to-worker বা worker-to-Co-Founder request/response audit trail।

`co_founder_conversations`-এ অন্তত নিচের ধরনের field থাকবে:

- `id`, `user_id`, `conversation_type` (`cofounder` / `worker`)
- `worker_id` — worker type-এর জন্য; Co-Founder thread-এ null
- `title`, `summary`, `last_message_at`, `last_message_preview`
- `created_at`, `updated_at`, optional `deleted_at`

`co_founder_messages`-এ অন্তত:

- `id`, `conversation_id`, `sender_type`, `sender_id` বা worker identity
- `content`, `content_type`, `attachments` (URL/metadata only)
- `metadata` (provider, model, latency, tool/collaboration trace, message status)
- `created_at`

**নোট:** এটি logical schema proposal। Migration লেখার সময় existing database types, FK naming, index conventions, current RLS policy ও migration numbering reconciliation দেখে final SQL ঠিক করতে হবে। `co_founder_sessions`-এর existing voice/session semantics অক্ষত থাকবে।

### 3.3 Worker communication model

Worker-to-worker যোগাযোগ হবে একটি central **Worker Collaboration Gateway / Orchestrator** দিয়ে:

1. Requesting worker একটি typed consultation request তৈরি করবে।
2. Gateway target WorkerId registry থেকে resolve করবে।
3. Target worker শুধু তার allowed domain scope অনুযায়ী কাজ করবে।
4. Result structured format-এ ফেরত আসবে — findings, evidence, recommendation, provenance ও confidence/uncertainty সহ।
5. Requesting worker result নিজের current task context-এ ব্যবহার করবে।
6. প্রয়োজন হলে Co-Founder result synthesize বা next task নির্দেশ করবে।

Worker-রা অন্য worker-এর private chat history সরাসরি পড়বে না। তারা কেবল current request-এর জন্য প্রয়োজনীয়, sanitized context পাবে।

### 3.4 Human approval boundary

- Read-only analysis/lookup সংশ্লিষ্ট worker permission-এর মধ্যে স্বয়ংক্রিয়ভাবে করা যাবে।
- Pricing, inventory mutation, coupon creation, ads publishing, customer messaging, blog publishing বা অন্য high-impact write action existing approval workflow ছাড়া execute করা যাবে না।
- Direct worker chat Co-Founder approval বা Action Center approval bypass করতে পারবে না।
- Worker-to-worker consultation কোনো worker-কে অন্য worker-এর permission inherit করাবে না। Target worker তার নিজস্ব permission scope প্রয়োগ করবে।

---

# 4. Phase-by-Phase Implementation Roadmap

## Phase 0 — Baseline Audit, Worker Identity Reconciliation ও No-Breakage Guardrails

**লক্ষ্য:** Implementation শুরুর আগে existing system-এর exact baseline স্থির করা এবং worker identity mismatch resolve করার scope তৈরি করা।

### কাজ

1. বর্তমান `main` branch commit, TypeScript, ESLint, unit tests, Co-Founder tests ও relevant E2E tests-এর baseline record তৈরি করা।
2. `WorkerRegistry.getAllDefinitions()` থেকে canonical worker directory তৈরি করা।
3. বর্তমানে registered ১৩টি worker-এর ID, name, domain, responsibilities, priority, required tools ও permission scope extract করা।
4. `SWARM_NODES`, `WorkerGrid`, `agentNodesToWorkerGrid()` ও live workforce API-এর mapping পর্যালোচনা করা।
5. Co-Founder prompt-এ থাকা ১২-worker statement এবং actual ১৩-worker registry reconcile করার acceptance criteria তৈরি করা।
6. Legacy aliases (`researcher`, `coder`, `writer`, `designer`, `analyst`, `marketer`) থেকে canonical WorkerId-এ explicit mapping তৈরি করা, যেখানে mapping সত্যিই valid। Unsupported legacy role-কে ভুল worker-এ silently route করা যাবে না।
7. Existing chat, voice, image, worker task dispatch, approval, tool ও memory flows-এর regression checklist freeze করা।

### Expected output

- Canonical Worker Directory contract।
- Legacy UI role mapping table।
- Baseline test report।
- Protected functionality checklist।

### Acceptance criteria

- UI, prompt ও backend worker count-এর source of truth এক জায়গায় নির্ধারিত।
- প্রতিটি visible worker card একটি valid backend `WorkerId`-এ resolve করে।
- কোনো existing worker ID rename/remove করা হয়নি।
- এই phase-এ business logic বা production data পরিবর্তন হয় না।

---

## Phase 1 — Shared Conversation ও Agent Communication Contracts

**লক্ষ্য:** Co-Founder conversation, direct worker chat এবং agent-to-agent communication-এর common types ও lifecycle define করা।

### কাজ

1. `CoFounderConversation`, `CoFounderMessage`, `ConversationType`, `MessageSenderType` এবং `ConversationAttachment` types define করা।
2. `ConversationType` হবে `cofounder` অথবা `worker`। Worker conversation-এর সঙ্গে একটি canonical `worker_id` থাকবে।
3. `WorkerChatRequest`, `WorkerChatResponse`, `WorkerConsultationRequest`, `WorkerConsultationResult` ও collaboration trace types তৈরি করা।
4. প্রতিটি chat request-এ `conversationId`, `requestId`/`correlationId`, user identity, channel ও target identity থাকবে।
5. Message sender type স্পষ্ট করা: `user`, `cofounder`, `worker`, `tool`, `system`। UI-তে tool event ও worker response আলাদাভাবে render করা যাবে।
6. Message content ও structured metadata আলাদা রাখা; generated JSON, tool results ও user-visible summary এক string-এ গুলিয়ে ফেলা যাবে না।
7. Voice transcript, image attachment ও future file message-এর compatibility রাখা।

### Suggested code area

- `src/lib/ai/co-founder/conversations/types.ts`
- `src/lib/ai/co-founder/workers/collaboration-types.ts`
- Existing `workers/types.ts`-এ compatibility-preserving extension।

### Acceptance criteria

- Co-Founder thread ও Worker chat-এর shared message contract একটিই।
- Worker conversation-এ `worker_id` ছাড়া message create করা যায় না।
- Message sender ও execution metadata type-safe।
- Existing `WorkerTaskInput`/`WorkerStructuredOutput` breaking change ছাড়াই reuse করা যায়।

---

## Phase 2 — Database Migration ও Persistent Storage Layer

**লক্ষ্য:** Co-Founder-এর বহু conversation এবং প্রতিটি worker-এর dedicated chat history নিরাপদে persist করা।

### কাজ

1. Additive migration দিয়ে `co_founder_conversations` table তৈরি করা।
2. Additive migration দিয়ে `co_founder_messages` table তৈরি করা; conversation deletion হলে তার child messages cascade delete হবে।
3. `conversation_type='cofounder'` হলে `worker_id` null এবং `conversation_type='worker'` হলে valid worker identity বাধ্যতামূলক করার check/validation design করা।
4. Admin-user + worker pair-এর জন্য একটি active worker conversation নিশ্চিত করতে unique constraint/index design করা। ফলে একই admin-এর একই worker-এর একটিই persistent direct chat থাকবে; UI-তে worker topic list থাকবে না।
5. Conversation list-এর জন্য `(user_id, conversation_type, last_message_at)` index তৈরি করা। Message pagination-এর জন্য `(conversation_id, created_at, id)` index তৈরি করা।
6. প্রয়োজন অনুযায়ী collaboration events table তৈরি করা: requester worker, target worker, root conversation, request ID, status, summary, timestamps ও safe metadata।
7. RLS policy তৈরি করা; owner admin নিজের conversation ও message-ই access করতে পারবে। Server-side `requireAdmin()` check-ও বাধ্যতামূলক থাকবে।
8. Service-role query ব্যবহার করলে API layer-এ owner check করতে হবে; শুধু RLS-এর ওপর নির্ভর করা যাবে না।
9. Message attachment-এর জন্য raw base64 database-এ রাখা যাবে না; Cloudinary বা approved storage URL এবং file metadata store করতে হবে।
10. Existing `co_founder_sessions`, `co_founder_memories`, approvals, recommendations ও business action tables alter/drop করা যাবে না।

### Deletion rule

- Admin delete confirmation দিলে conversation list থেকে thread সঙ্গে সঙ্গে সরবে।
- Delete endpoint শুধু ওই user-এর ওই thread delete করতে পারবে।
- Thread messages ও thread-owned attachment metadata delete হবে; প্রয়োজন হলে orphaned Cloudinary object cleanup আলাদা safe job হিসেবে চলবে।
- Delete করলে global `co_founder_memories`, business records, approvals, action plans বা অন্য conversation delete হবে না।

### Acceptance criteria

- Migration staging/test database-এ সফলভাবে apply হয়।
- User A, User B-এর conversation/message পড়তে বা delete করতে পারে না।
- Conversation delete করলে অন্য thread ও long-term memory অক্ষত থাকে।
- Existing voice session table-এর পুরনো rows/flow unaffected থাকে।

---

## Phase 3 — Conversation Repository ও Secure Conversation APIs

**লক্ষ্য:** UI যেন browser state-কে chat history-এর source of truth হিসেবে ব্যবহার না করে; server থেকে conversation load/save করতে পারে।

### কাজ

1. Server-only conversation repository তৈরি করা:
   - Create conversation
   - List user's Co-Founder conversations
   - Fetch conversation + paginated messages
   - Append message
   - Update title/summary/last activity
   - Delete conversation
   - Resolve/create the one worker conversation for a given worker
2. Co-Founder conversations-এর জন্য API routes তৈরি করা; উদাহরণ:
   - `GET /api/admin/co-founder/conversations` — list
   - `POST /api/admin/co-founder/conversations` — new conversation
   - `GET /api/admin/co-founder/conversations/[id]` — detail + paginated messages
   - `PATCH /api/admin/co-founder/conversations/[id]` — title/metadata update
   - `DELETE /api/admin/co-founder/conversations/[id]` — delete
3. Existing `/api/admin/co-founder/chat` route-কে conversation-aware করা: request-এ `conversationId` লাগবে; server ওই conversation-এর message নিজে load করবে।
4. Browser থেকে সম্পূর্ণ trusted history ধরে নেওয়া যাবে না। Client কেবল নতুন user message ও conversation ID পাঠাবে; authoritative prior messages server repository থেকে load হবে।
5. Message persistence sequence ঠিক করা: user message save → context load → model/agent execution → tool/collaboration events → assistant response save।
6. Error হলে user message হারাবে না; response status `failed`/`interrupted` metadata দিয়ে retryable রাখা হবে।
7. Pagination cursor-based হবে; পুরো conversation list বা হাজার message একবারে load হবে না।
8. GET endpoint-এর বর্তমান alert/signal behaviour আলাদা করা বা compatibility বজায় রেখে পৃথক endpoint ব্যবহার করা; chat history API-এর সঙ্গে alerts response গুলিয়ে ফেলা যাবে না।

### Acceptance criteria

- Page refresh করলেও conversation ও messages ফিরে আসে।
- একটি conversation-এর server request অন্য thread-এর message টেনে আনে না।
- Client-এর পাঠানো forged `userId`/`workerId` দিয়ে অন্যের thread access করা যায় না।
- duplicate request/retry-এর ফলে একই user message একাধিকবার save হয় না; idempotency key ব্যবহার করা হলে তা test করা হয়।

---

## Phase 4 — Conversation-Scoped Context, Summary ও Memory Boundaries

**লক্ষ্য:** Topic conflict দূর করা এবং global business memory-কে conversation transcript থেকে পৃথক রাখা।

### কাজ

1. নতুন Co-Founder conversation-এ prior conversation-এর messages inject করা হবে না।
2. Active conversation context তৈরি হবে:
   - Current thread-এর recent messages
   - Current thread-এর rolling summary
   - Current thread-এর attachments ও relevant collaboration summaries
   - Existing live business context / fresh database facts
   - Approved global strategic memory / business preferences
3. `getCoFounderSystemPrompt()`-এর existing live data ও long-term memory logic preserve করতে হবে, কিন্তু thread history আলাদা conversation service থেকে pass করতে হবে।
4. `co_founder_memories`-কে global memory হিসেবে ধরতে হবে; সব chat message স্বয়ংক্রিয়ভাবে এখানে ঢোকানো যাবে না।
5. Conversation summary update policy তৈরি করতে হবে — নির্দিষ্ট message/token threshold পেরোলে summary refresh; আগের facts, decisions, open questions ও constraints retain করতে হবে।
6. User-এর explicit correction/decision global memory-তে রাখতে হলে approved memory promotion rule অনুসরণ করতে হবে।
7. Conversation delete করলে শুধু thread-scoped summary/history delete হবে; explicitly saved global memory আলাদা থাকবে।
8. Context retrieval-এর priority নির্ধারণ করতে হবে: current request → current conversation → fresh verified business data → approved global memory → general knowledge।
9. Conflicting facts থাকলে live authoritative DB তথ্য পুরনো conversation statement-কে supersede করবে; historical decision হলে তা timestamp/source সহ উল্লেখ করতে হবে।

### Acceptance criteria

- Topic A-তে রাখা private discussion Topic B-তে prompt context হিসেবে যায় না।
- New Chat শুরু করলে আগের conversation-এর summary/messages দেখা যায় না।
- Global business rules ও explicit founder preferences যথাযথভাবে available থাকে।
- Thread summary update হলেও source messages database-এ থাকে এবং retrieval-এ duplicate context তৈরি হয় না।

---

## Phase 5 — ChatGPT-Style Co-Founder Conversation UI

**লক্ষ্য:** Existing Co-Founder interface না ভেঙে conversation list, New Chat, reopen ও delete experience যোগ করা।

### UI behaviour

1. Chat tab-এ একটি collapsible left sidebar বা responsive conversation drawer যোগ করা।
2. Sidebar-এ:
   - `New Chat` control
   - Recent conversation list
   - Title ও last activity
   - Search (ঐচ্ছিক; conversation সংখ্যা বেশি হলে enable)
   - Active conversation indicator
   - Rename ও Delete actions
3. নতুন chat শুরু করলে blank thread তৈরি হবে; server থেকে নতুন conversation ID না পাওয়া পর্যন্ত message send enable হবে না।
4. প্রথম user message-এর পরে title generate হবে; initial title generation fail হলে fallback title থাকবে, যেমন `New conversation` বা message-derived short title।
5. পুরনো conversation select করলে messages, thread summary এবং attachments restore হবে।
6. Delete button-এ confirmation modal থাকবে; accidental delete এড়ানো হবে।
7. Delete সফল হলে অন্য open conversation বা worker chat state reset হবে না।
8. Mobile-এ sidebar drawer হিসেবে খুলবে; chat input, message list ও voice controls usable থাকবে।
9. Existing voice, image upload, browser window, intelligence drawer, alerts, worker visualizer ও tabs preserve করতে হবে।
10. Main Co-Founder chat-এর active conversation ID voice session start/stop-এর সঙ্গে bind করতে হবে, যাতে voice transcript ভুল thread-এ লেখা না হয়।

### Acceptance criteria

- Admin একাধিক topic-এ একাধিক chat তৈরি করতে পারেন।
- Conversation A থেকে B-তে switch করলে A-এর message B-এর মধ্যে মেশে না।
- Refresh, logout/login policy অনুযায়ী thread restore হয়।
- Delete করলে selected thread disappear করে এবং অন্য thread unchanged থাকে।
- Existing Co-Founder tools/voice/workspace controls আগের মতো কাজ করে।

---

## Phase 6 — Canonical Worker Directory ও UI-to-Worker Mapping

**লক্ষ্য:** প্রতিটি worker card/chat action যেন backend-এর সঠিক specialist worker-এ যায়।

### কাজ

1. Worker directory API `getWorkerRegistryStatus()` বা registry definitions থেকে build করতে হবে।
2. UI metadata (avatar, colour, role label, short description) canonical `WorkerId`-এর সঙ্গে map করতে হবে।
3. Legacy six-role aliases-কে direct backend WorkerId হিসেবে ব্যবহার করা যাবে না। প্রতিটি legacy UI card-এর target যদি নির্ভুলভাবে map করা না যায়, সেটি rename/replace করতে হবে।
4. `brain.ts`-এর worker list ও count registry থেকে derive বা generated করতে হবে, যাতে ১২ বনাম ১৩ discrepancy আবার না হয়।
5. `WorkerGrid`, 3D hierarchy visualizer ও `LiveWorkspace`-এর click action canonical worker ID পাঠাবে।
6. Worker card-এ `Chat` action থাকবে; status/active-task view এবং chat open action আলাদা থাকবে।
7. System workers (যেমন Execution/Monitoring) UI-তে আলাদা label পেতে পারে, কিন্তু তাদের permission rules সাধারণ domain worker-এর মতো broad করা যাবে না।

### Acceptance criteria

- Registry-তে থাকা প্রতিটি worker-এর একটিমাত্র stable ID থাকে।
- UI-র Chat action সঠিক backend worker-কে target করে।
- Unknown/deactivated worker-এর জন্য পরিষ্কার unavailable message আসে; default analytics worker-এ silently route হয় না।
- Live workforce status ও worker directory একই identity mapping ব্যবহার করে।

---

## Phase 7 — Individual Worker Chat Backend

**লক্ষ্য:** Worker-এর existing `execute()` capability-এর ওপর একটি natural-language conversation layer তৈরি করা।

### কাজ

1. একটি server-only `WorkerChatService` তৈরি করা। এটি registry থেকে target worker resolve করবে এবং worker definition অনুযায়ী system context তৈরি করবে।
2. Direct chat route তৈরি করা; উদাহরণ:
   - `POST /api/admin/co-founder/workers/[workerId]/chat`
   - প্রয়োজনে `GET /api/admin/co-founder/workers/[workerId]/conversation`
3. Admin request এলে service সেই admin ও worker-এর existing direct conversation resolve/create করবে।
4. Worker conversation-এর history শুধু ওই worker thread থেকে load হবে; Co-Founder topic conversation-এর message worker prompt-এ automatically যাবে না।
5. Worker-এর `WorkerDefinition` থেকে objective, responsibilities, tools ও permission scope prompt/context-এ inject হবে।
6. সাধারণ প্রশ্নে natural conversational answer দিতে হবে। Live data বা task প্রয়োজন হলে worker-এর existing `execute()` adapter/approved tools ব্যবহার করে verified result আনতে হবে।
7. Structured worker output user-facing conversational response-এ রূপান্তর করতে হবে; numeric facts/evidence অক্ষত রাখতে হবে।
8. Worker direct chat-এর প্রতিটি request/response persistent হবে। UI-তে worker-এর জন্য একটিই continuing chat থাকবে; Co-Founder-style topic list বা conversation delete workflow থাকবে না।
9. Worker unavailable বা tool failure হলে worker যেন fake result না দেয়; clear uncertainty ও next step জানাবে।
10. Worker conversation-এর provider/model current AI configuration/fallback stack reuse করবে; অকারণে আলাদা provider credential store তৈরি করা যাবে না।
11. Worker chat attachments/image support চাইলে existing secure upload path reuse হবে; launch stage-এ text-first delivery করা যেতে পারে এবং multimodal support পরের sub-phase-এ যুক্ত করা যায়।

### Acceptance criteria

- Admin সরাসরি Marketing Worker-কে message করলে response Marketing Worker identity থেকে আসে।
- SEO Worker-এর chat context Analytics Worker বা Co-Founder thread থেকে আসবে না।
- Worker real data query করলে source-backed output পাবে; unavailable হলে hallucinate করবে না।
- Worker-specific permission scope প্রতিটি tool/action-এর আগে enforce হয়।

---

## Phase 8 — Individual Worker Chat UI ও Workforce Integration

**লক্ষ্য:** Co-Founder-এর workforce UI থেকে worker-এর dedicated chat window খোলা।

### কাজ

1. `WorkerGrid` card ও `LiveWorkspace` worker node-এ `Chat`/`Talk to Worker` action যোগ করা।
2. Worker select করলে একটি dedicated chat panel/window খুলবে; header-এ worker name, role, status ও domain থাকবে।
3. Message history ওই worker-এর persistent direct conversation থেকে load হবে।
4. Admin Co-Founder chat-এ ফিরে গেলে active Co-Founder conversation ও draft input অক্ষত থাকবে।
5. Worker chat open থাকলেও Co-Founder-এর conversation sidebar worker chat-কে topic conversation হিসেবে list করবে না।
6. Worker chat panel responsive হবে; mobile-এ full-screen/drawer pattern ব্যবহার করা যাবে।
7. Worker output-এ structured findings/evidence/approval-needed state থাকলে readable summary/card হিসেবে দেখাতে হবে।
8. Existing status, animation, 3D character এবং live-workspace activity UI অক্ষত থাকবে।
9. Worker card-এর `selectedWorkerId` আর Co-Founder prompt tagging-এর ambiguous state হিসেবে ব্যবহার করা যাবে না; target selection explicit হতে হবে।

### Acceptance criteria

- প্রতিটি registered worker-এর নিজস্ব chat window খোলা যায়।
- Worker বদলালে আগের worker-এর messages অন্য worker window-তে আসে না।
- Co-Founder conversation sidebar-এ worker session দেখা যায় না।
- Chat action ও live task status action পৃথকভাবে কাজ করে।

---

## Phase 9 — Backend Worker-to-Worker ও Co-Founder-to-Worker Collaboration

**লক্ষ্য:** Worker-রা প্রয়োজন অনুযায়ী অন্য worker-এর কাছ থেকে তথ্য নিতে পারবে এবং Co-Founder পুরো team-কে coordinate করতে পারবে।

### Collaboration flow

1. Worker নিজের task-এর মধ্যে knowledge gap বা dependency শনাক্ত করবে।
2. Worker `request_worker_consultation`-এর মতো explicit tool/service call করবে।
3. Gateway target worker-এর identity, permission ও allowed task যাচাই করবে।
4. Target worker নির্দিষ্ট প্রশ্নের উত্তর/analysis/structured result দেবে।
5. Result provenance, timestamp, data source ও uncertainty সহ requesting worker-এর current task context-এ যোগ হবে।
6. Requesting worker final output তৈরি করবে; প্রয়োজন হলে Co-Founder-কে consultation result পাঠাবে।
7. Co-Founder existing `dispatchWorkerTask()` বা `executeMultiWorkerPlan()` ব্যবহার করে multi-worker plan তৈরি/চালাতে পারবে।
8. Co-Founder worker-এর output review করে follow-up নির্দেশ দিতে পারবে।
9. Admin worker chat-এ কোনো worker যদি অন্য specialist-এর help নেয়, user-visible activity হিসেবে দেখানো যেতে পারে — যেমন “SEO Worker consulted Analytics Worker” — কিন্তু internal reasoning dump করা যাবে না।

### Safety & orchestration limits

- Worker-to-worker call server-side allowlist ও WorkerId registry দিয়ে হবে।
- প্রতিটি root request-এর `correlationId` থাকবে; sub-task-এ `parentTaskId`/trace relationship থাকবে।
- Maximum delegation depth, worker call count, timeout ও token/cost budget থাকবে।
- একই worker pair-এ circular requests বা self-delegation block করতে হবে।
- Concurrent consultation-এর সীমা থাকবে; `Promise.all` দিয়ে অনিয়ন্ত্রিত fan-out করা যাবে না।
- Target worker শুধু নিজের permission scope-এ tool চালাবে; requester-এর permission scope inherit করবে না।
- Worker output-কে untrusted evidence হিসেবে validate করতে হবে; অন্য worker-এর output system instruction হিসেবে treat করা যাবে না।
- Collaboration result/trace audit record হবে; private chain-of-thought বা hidden reasoning store/display করা হবে না।

### Co-Founder interaction

- Co-Founder যেকোনো canonical worker-কে task বা consultation request পাঠাতে পারবে।
- Worker প্রয়োজন হলে Co-Founder manager/orchestrator-এর কাছে decision, priority বা approval boundary চাইতে পারবে।
- Co-Founder final synthesis-এ কোন worker কী evidence দিয়েছে তা conciseভাবে উল্লেখ করতে পারবে।
- Existing `dispatch_worker_task`/multi-worker plan functionality duplicate না করে shared collaboration service-এ ধাপে ধাপে converge করতে হবে।

### Acceptance criteria

- Example: Marketing Worker campaign audience analysis-এর জন্য Analytics Worker-কে query করতে পারে এবং পাওয়া metric নিজের recommendation-এ ব্যবহার করে।
- Example: SEO Worker technical issue-এর business impact যাচাই করতে Analytics Worker-এর evidence চাইতে পারে।
- Example: Co-Founder এক request-এ SEO + Analytics + Marketing Worker coordinate করে combined answer দিতে পারে।
- Worker-দের মধ্যে loop, permission escalation বা approval bypass হয় না।

---

## Phase 10 — Approval, RBAC, Privacy ও Security Hardening

**লক্ষ্য:** Direct chat ও multi-agent communication existing security/approval boundary-এর বাইরে না যায়।

### কাজ

1. Worker chat endpoints-এ `requireAdmin()` ও owner/role validation বাধ্যতামূলক করা।
2. Worker-এর `permissionScope` প্রতিটি tool execution-এর আগে check করা।
3. Co-Founder ও worker একই Action Center approval system ব্যবহার করবে।
4. Worker chat থেকে কোনো high-impact write action হলে তা draft/proposal/approval request হিসেবে তৈরি হবে; explicit approval ছাড়া commit হবে না।
5. Worker consultation অন্য worker-এর customer PII বা confidential staff/admin data অকারণে expose করতে পারবে না।
6. Conversation ID, WorkerId, file URL ও action payload সব server-side validate করতে হবে।
7. Prompt injection defense-এ user message, retrieved KB, worker output ও browser content-কে untrusted input হিসেবে আলাদা boundary-তে রাখতে হবে।
8. File attachments-এ MIME type, file size, storage ownership ও access URL validation করতে হবে।
9. Conversation delete endpoint-এ ownership verification, CSRF/origin policy (প্রকল্পের বর্তমান API standard অনুযায়ী) এবং idempotent delete behavior রাখতে হবে।
10. Logs-এ API key, raw token, unnecessary customer PII বা full attachment base64 রাখা যাবে না।
11. Rate limit ও token/cost budget user + thread + worker target অনুযায়ী enforce করতে হবে।

### Acceptance criteria

- Direct worker chat থেকে approval ছাড়া pricing/product/order/payment/marketing write action execute করা যায় না।
- Worker A, Worker B-এর restricted tools invoke করতে পারে না।
- Conversation ID guess করে অন্য admin-এর thread access করা যায় না।
- Security logs/telemetry-তে secrets বা full sensitive payload নেই।

---

## Phase 11 — Voice, Image ও Streaming Integration

**লক্ষ্য:** নতুন conversation model-এর সঙ্গে existing multimodal Co-Founder experience সামঞ্জস্যপূর্ণ করা।

### কাজ

1. Active Co-Founder conversation ID-কে LiveKit voice session start-এর সময় bind করা।
2. Voice transcript, assistant response ও tool summaries ওই একই conversation-এ save হবে।
3. Conversation switch বা New Chat-এর সময় active voice session থাকলে safe handoff/stop confirmation behavior define করতে হবে; পুরনো voice transcript নতুন thread-এ লিখবে না।
4. Image upload-এর Cloudinary URL ও metadata message attachment হিসেবে persist করতে হবে; raw base64 chat history-তে বারবার পাঠানো যাবে না।
5. Existing browser voice/voice note flow একই conversation message service ব্যবহার করবে।
6. Existing Co-Founder streaming path-এ message lifecycle events যোগ করা: started, delta, tool_started, tool_completed, approval_required, completed, failed।
7. Streaming response complete হলে durable assistant message save করতে হবে; interrupted stream recoverable status পাবে।
8. Worker chat-এর voice mode initial release-এর বাধ্যতামূলক অংশ নয়; text-first worker chat stable হওয়ার পরে একই voice/transcript framework reuse করে যুক্ত করা যাবে।

### Acceptance criteria

- Text ও voice একই active Co-Founder thread-এ history share করে।
- Thread switch-এর পর পুরনো voice transcript ভুল thread-এ যায় না।
- Image message reopen করলে attachment preview/URL restore হয়।
- Stream failure হলে user message বা completed assistant response হারিয়ে যায় না।

---

## Phase 12 — Testing, Regression ও Multi-Agent Evaluation

**লক্ষ্য:** Functional behavior, context isolation, worker routing, approval safety ও existing Co-Founder behavior যাচাই করা।

### Unit tests

- Conversation repository: create, list, get, title update, append, delete।
- Thread owner isolation এবং worker session uniqueness।
- Conversation summary/context assembly ও global memory separation।
- Worker directory: সব registered WorkerId-এর mapping।
- Worker chat prompt builder এবং domain boundary।
- Collaboration gateway: allowlist, recursion depth, call budget, timeout, trace ও permission checks।
- Approval workflow direct Co-Founder এবং direct worker chat উভয় path-এ একইভাবে enforce হচ্ছে কি না।

### API integration tests

- Unauthorized request-এ 401/403।
- Admin A অন্য Admin B-এর thread read/update/delete করতে পারবে না।
- New Chat → message → reload → reopen flow।
- Conversation A-এর message Conversation B-এর prompt context-এ যায় না।
- Delete conversation → messages/attachments metadata cleanup; global memory/other thread remain।
- Worker chat route valid WorkerId গ্রহণ করে; invalid ID reject করে।
- Direct Marketing/SEO/Analytics chat সঠিক worker execute করে।
- Worker A → Worker B consultation এবং Worker → Co-Founder response flow।
- Worker collaboration loop ও permission escalation rejected।
- Approval-required action pending approval হয়; direct execution হয় না।

### UI / E2E tests

- New Chat তৈরি, conversation list-এ দেখা, reopen করা ও delete করা।
- দুই বা ততোধিক topic parallel রেখে একটির message অন্যটিতে না ঢোকা।
- Page refresh এবং mobile navigation।
- Conversation switch করার পর draft/input/thread identity ঠিক থাকা।
- Workforce card থেকে worker chat open, message send, worker switch ও আগের worker thread restore।
- Worker chat Co-Founder conversation list-এ না থাকা।
- Existing voice, image upload, Live Workspace, Worker Grid, alerts, browser widget ও approval UI regression।

### Acceptance criteria

- নতুন feature-এর critical tests pass।
- Existing relevant Co-Founder, worker, voice, approvals ও cross-system regression tests pass।
- TypeScript, lint, build ও relevant E2E green।
- Production credentials/real write actions ব্যবহার না করে staging/mock environment-এ integration tests সম্পন্ন হয়।

---

## Phase 13 — Staged Rollout, Monitoring ও Final Sign-off

**লক্ষ্য:** Production rollout-এর আগে safe release, observability ও rollback readiness নিশ্চিত করা।

### কাজ

1. Feature flags দিয়ে পর্যায়ক্রমে enable করা:
   - Co-Founder conversation persistence
   - Multi-conversation sidebar
   - Direct worker chat
   - Worker-to-worker collaboration
2. প্রথমে staging/admin-only environment-এ test data দিয়ে চালানো।
3. Database migration-এর backup/rollback plan ও migration ordering যাচাই করা।
4. Observability metrics record করা:
   - conversation create/open/delete count
   - chat response latency ও error rate
   - worker target selection correctness
   - worker consultation count, depth ও timeout
   - token/cost per conversation/worker
   - approval required vs approved vs rejected actions
5. Failure হলে feature flag disable করে existing Co-Founder chat/worker dispatch path-এ ফিরে যাওয়ার ব্যবস্থা রাখা।
6. Admin acceptance test ও final sign-off নেওয়া।

### Final acceptance criteria

- Admin একই Co-Founder-এর সঙ্গে আলাদা topic-এর জন্য বহু conversation রাখতে পারেন।
- পুরনো conversation খুললে সেই topic-এর history restore হয়।
- Admin unwanted conversation delete করতে পারেন; অন্য thread/global memory অক্ষত থাকে।
- Admin workforce UI থেকে সব registered specialist worker-এর সঙ্গে direct chat করতে পারেন।
- Worker-রা backend-এ controlled way-তে একে অপরের সঙ্গে তথ্য বিনিময় করতে পারে।
- Co-Founder worker-দের task দিতে, তাদের কাছ থেকে result নিতে ও follow-up নির্দেশ দিতে পারে।
- Worker-রা প্রয়োজন হলে Co-Founder manager-এর guidance নিতে পারে।
- Approval, permissions, existing tools, voice ও business workflows আগের মতো নিরাপদে কাজ করে।

---

# 5. Recommended Implementation Order ও Dependencies

```text
Phase 0  Baseline + worker identity reconciliation
   |
Phase 1  Contracts and architecture
   |
Phase 2  Database migration and storage
   |
Phase 3  Secure conversation APIs
   |
Phase 4  Context isolation and memory boundaries
   |
Phase 5  Co-Founder multi-conversation UI
   |
Phase 6  Canonical worker directory and UI mapping
   |
Phase 7  Worker chat backend
   |
Phase 8  Worker chat UI
   |
Phase 9  Worker-to-worker / Co-Founder collaboration
   |
Phase 10 Security and approval hardening
   |
Phase 11 Voice / image / streaming integration
   |
Phase 12 Full test and regression validation
   |
Phase 13 Staged rollout and sign-off
```

**Recommended delivery checkpoints:**

- **Checkpoint A:** Phase 0–5 complete হলে Co-Founder multi-conversation experience independently usable হবে।
- **Checkpoint B:** Phase 6–8 complete হলে admin প্রতিটি specialist worker-এর সঙ্গে direct chat করতে পারবেন।
- **Checkpoint C:** Phase 9–11 complete হলে controlled multi-agent collaboration ও multimodal continuity যুক্ত হবে।
- **Checkpoint D:** Phase 12–13 complete হলে production rollout-এর জন্য sign-off নেওয়া যাবে।

---

# 6. Scope Boundaries — কী পরিবর্তন হবে না

এই পরিকল্পনা নিচের কাজগুলো করার অনুমতি দেয় না:

- Existing Co-Founder feature বা worker implementation replace/rebuild করা।
- Existing 13 registered workers বাদ দেওয়া বা অকারণে rename করা।
- Worker chat-এর জন্য Co-Founder-এর মতো আলাদা topic list/New Chat/Delete UI তৈরি করা।
- Conversation delete করলে global business memory, approvals, orders, products, tickets বা action plans delete করা।
- Workers-কে approval ছাড়া business-impacting action execute করার স্বাধীনতা দেওয়া।
- Worker-দের unrestricted shared database access বা unlimited recursive communication দেওয়া।
- Existing LiveKit/voice, tools, provider fallback, browser, analytics বা workforce UI বাদ দেওয়া।
- Staff-এর প্রত্যেক মানব account-এর জন্য আলাদা personal AI identity তৈরি করা — এই roadmap-এ direct chat existing specialist AI worker registry-র জন্য। ভবিষ্যতে employee-specific personal assistant চাইলে সেটি আলাদা assignment/permission feature হিসেবে scope করতে হবে।

---

# 7. Final Definition of Done

Implementation সম্পূর্ণ বলা যাবে তখনই, যখন সবগুলো শর্ত পূরণ হবে:

- [ ] Co-Founder-এর New Chat, conversation list, reopen, rename ও delete কাজ করে।
- [ ] প্রতিটি Co-Founder conversation-এর history server-side persistent এবং isolated।
- [ ] Conversation delete করলে অন্য conversation বা global memory প্রভাবিত হয় না।
- [ ] Worker directory backend registry থেকে তৈরি এবং সব UI action canonical WorkerId ব্যবহার করে।
- [ ] Admin প্রতিটি registered worker-এর সঙ্গে dedicated chat window-তে কথা বলতে পারেন।
- [ ] প্রতিটি worker-এর direct chat context আলাদা এবং reload-এর পর restore হয়।
- [ ] Worker chat Co-Founder conversation list-এ মেশে না।
- [ ] Worker-to-worker communication backend collaboration gateway দিয়ে হয়।
- [ ] Co-Founder worker-দের orchestrate করতে এবং worker-রা Co-Founder-এর guidance চাইতে পারে।
- [ ] Worker consultation-এ source/provenance ও trace সংরক্ষিত থাকে।
- [ ] Permission, rate limit, recursion limit, timeout ও approval safeguards enforce হয়।
- [ ] Voice, image, existing tools, provider fallback, memory, approvals ও live workforce regression pass করে।
- [ ] TypeScript, ESLint, build, unit, integration ও E2E validation pass করে।
- [ ] Staging acceptance এবং production rollback plan sign-off হয়েছে।

---

## 8. Implementation Agent-এর জন্য বাধ্যতামূলক নির্দেশনা

এই document অনুসরণ করে কোনো coding agent কাজ করলে:

1. একবারে একটি phase implement করবে; পরের phase শুরু করার আগে current phase-এর acceptance criteria পূরণ করতে হবে।
2. প্রথমে current code ও migration history আবার inspect করবে; এই document-এর path বা schema suggestion-কে blindly apply করবে না।
3. Existing behavior preserve করে additive changes করবে। প্রয়োজন ছাড়া বড় file rewrite/refactor করবে না।
4. প্রতিটি phase-এর আগে/পরে relevant tests চালাবে এবং result নথিভুক্ত করবে।
5. নতুন migration idempotent, additive ও rollback-aware হতে হবে।
6. কোনো live business mutation, payment, courier action, campaign publish, customer message বা inventory write test হিসেবে চালাবে না।
7. কোনো phase অসম্পূর্ণ থাকলে `PASS` লিখবে না; `BLOCKED`, `PARTIAL` বা `NOT STARTED` হিসেবে reason উল্লেখ করবে।
8. Documentation-এ implemented code, mocked tests এবং live production verification-কে আলাদা করে দেখাবে।
9. কোনো existing feature সরাতে বা behavior পরিবর্তন করতে হলে আগে exact impact লিখে approval চাইবে।
10. Repository code change শুরু করার আগে Phase 0 baseline ও no-breakage checklist তৈরি করবে।

**Current status:** Planning document prepared only. No code changes, database migrations, deployment, or worker behavior changes have been performed.
