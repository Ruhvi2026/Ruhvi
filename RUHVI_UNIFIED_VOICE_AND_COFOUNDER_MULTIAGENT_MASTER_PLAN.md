# RUHVI UNIFIED VOICE NOTES, SPEECH-TO-TEXT & AI CO-FOUNDER MULTI-AGENT WORKSPACE
## Master End-to-End Implementation Plan

**Document:** `RUHVI_UNIFIED_VOICE_AND_COFOUNDER_MULTIAGENT_MASTER_PLAN.md`  
**Location:** Project Root (`c:\Users\INDIA\Desktop\Project Ruhvi`)  
**Status:** Canonical Master Implementation Plan  
**Target Systems:** 
1. **Ru Chat (Internal Staff & P2P Chat):** WhatsApp-style Voice Notes + Separate Speech-to-Text (STT) Mode  
2. **AI Co-Founder & Worker Workforce (`/co-founder`):** Multi-Conversation Workspace + 13 Specialist AI Worker Chats + Agent-to-Agent Collaboration Gateway  
3. **Automated Media Lifecycle:** Cloudinary 45-Day Automatic Voice Audio Purge Engine  

---

## 1. Executive Summary & Architecture Overview

This master document unites and executes the complete scope of both `RU_CHAT_VOICE_NOTE_AND_SPEECH_TO_TEXT_IMPLEMENTATION_PLAN.md` and `Ruhvi_CoFounder_MultiConversation_MultiAgent_Implementation_Plan.md` in a single, phased, non-breaking execution pipeline.

In addition, it incorporates an enterprise-grade **Cloudinary 45-Day Automated Audio Deletion Engine**, ensuring all recorded voice notes uploaded to Cloudinary are systematically purged 45 days after creation, protecting storage limits, customer/staff privacy, and data hygiene without leaving broken UI states.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PROJECT RUHVI UNIFIED WORKSPACE                                  │
├────────────────────────────────────────┬───────────────────────────────────────────────────────────────┤
│          TRACK A: RU CHAT VOICE        │            TRACK B: AI CO-FOUNDER & MULTI-AGENT WORKSPACE     │
├────────────────────────────────────────┼───────────────────────────────────────────────────────────────┤
│ 1. WhatsApp-Style Voice Notes:         │ 1. Multi-Conversation Co-Founder:                             │
│    • Local browser audio recording     │    • ChatGPT-style New Chat, history list, auto-title, delete │
│    • Dedicated Cloudinary upload       │    • Strict thread context isolation & global memory boundary │
│    • Inline audio player (No raw URLs) │ 2. 13 Specialist AI Worker Dedicated Chats:                   │
│    • STRICTLY NO Gemini in this flow   │    • 1:1 conversation with Marketing, SEO, Analytics, etc.    │
│ 2. Speech-to-Text (STT) Mode:          │    • Persistent worker-specific conversation history          │
│    • gemini-3.5-transcribe backend     │ 3. Agent-to-Agent Collaboration Gateway:                      │
│    • Transcribes Bengali/Hindi/English │    • Controlled worker-to-worker consultation                 │
│    • Populates editable draft in input │    • Co-Founder multi-worker planning & delegation            │
│    • Explicit Send by user only        │    • Loop prevention, recursion limits, audit trace           │
├────────────────────────────────────────┴───────────────────────────────────────────────────────────────┤
│                               TRACK C: CLOUDINARY 45-DAY AUTOMATED LIFECYCLE                          │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Upload tagging: 'voice_note', 'auto_purge_45d', uploaded_at, expires_at (NOW + 45 days)              │
│ • Database TTL registry: track public_id, audio metadata, expiry timestamp, active/expired status     │
│ • Automated Daily Cron: /api/cron/cleanup-voice-notes destroys Cloudinary assets & updates status     │
│ • UI Graceful Expiration: Inline audio player shows "Voice note expired after 45 days" (no broken UI)  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Non-Negotiable Core Rules & Guardrails

To prevent breaking existing functionalities and strictly adhere to project rules:

1. **Zero Functional Breakage:** Under no circumstances should an optimization or feature addition alter or break existing application flows, business logic, authentication (Firebase Auth), Supabase RLS, LiveKit voice sessions, or task management.
2. **Protected Documentation:** `PROJECT_ARCHITECTURE_DOCS.md` and `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` must NOT be deleted or overwritten. Any newly introduced services or tools must be audited into `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
3. **Strict Separation of Voice Features:**
   - **Feature A (Voice Note):** Microphone → Local Blob → Cloudinary Upload → Inline Audio Bubble. **NO GEMINI API INVOLVED.**
   - **Feature B (Speech-to-Text):** Microphone → Local Blob → Backend Gemini 3.5 Transcribe → Populates Composer Draft. **NO CLOUDINARY UPLOAD. NO AUDIO MESSAGE CREATED.**
4. **Cloudinary 45-Day Expiry Guarantee:**
   - Every audio note uploaded to Cloudinary must have an `expires_at` timestamp set to `created_at + 45 days`.
   - The deletion must happen via Cloudinary Admin/Uploader API destroying the asset (`resource_type: 'video'`).
   - If an expired audio note is accessed in chat, it must render an elegant expired notice rather than a broken player.
5. **Human Approval Safeguards:** High-impact business actions proposed by Co-Founder or Workers (pricing updates, discount coupons, stock adjustments, blog publishing, ad changes) MUST route through the existing Action Center approval flow. Direct worker chat cannot bypass this.
6. **Additive Database Operations:** Only additive migrations (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`). Never alter or drop existing tables (`users`, `orders`, `co_founder_sessions`, `chat_messages`).

---

## 3. Detailed Cloudinary 45-Day Automated Audio Deletion Architecture

### 3.1 Metadata & Tagging Contract on Upload
When a voice note is uploaded via `/api/internal-chat/voice-notes/upload`:
- **Cloudinary Folder:** `ruhvi/chat_voice_notes`
- **Cloudinary Resource Type:** `'video'` (Cloudinary stores audio files under the `'video'` resource type)
- **Tags applied at upload:**
  ```typescript
  tags: ['voice_note', 'auto_purge_45d', `env_${process.env.NODE_ENV || 'production'}`]
  ```
- **Context Metadata applied at upload:**
  ```typescript
  context: {
    uploaded_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    uploaded_by: staffUser.id,
    conversation_id: conversationId,
  }
  ```

### 3.2 Database Tracking Table: `chat_voice_notes`
An additive table in Supabase stores the lifecycle state:
```sql
CREATE TABLE IF NOT EXISTS chat_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES internal_chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES internal_chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  cloudinary_url TEXT NOT NULL,
  duration_seconds NUMERIC(6, 2) NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '45 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'deleted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_voice_notes_expiry 
  ON chat_voice_notes(expires_at, status) 
  WHERE status = 'active';
```

### 3.3 Daily Automated Cleanup Cron Engine
**Route:** `src/app/api/cron/cleanup-voice-notes/route.ts`  
**Authentication:** Bearer `CRON_SECRET` OR authenticated Admin Staff session.  
**Schedule:** Configured in `vercel.json` (`0 3 * * *` = daily at 03:00 UTC) and callable via `task-scheduler`.

**Execution Process:**
1. **Database Query:** Fetch up to 100 active expired voice notes:
   ```typescript
   const { data: expiredNotes } = await supabase
     .from('chat_voice_notes')
     .select('id, cloudinary_public_id, message_id')
     .eq('status', 'active')
     .lte('expires_at', new Date().toISOString())
     .limit(100);
   ```
2. **Cloudinary Asset Purge:** For each expired note, execute:
   ```typescript
   await cloudinary.uploader.destroy(note.cloudinary_public_id, {
     resource_type: 'video', // Audio files reside under video resource_type
     invalidate: true        // Invalidate CDN cache
   });
   ```
3. **Database State Transition:**
   ```typescript
   await supabase
     .from('chat_voice_notes')
     .update({
       status: 'expired',
       deleted_at: new Date().toISOString()
     })
     .in('id', expiredIds);
   ```
4. **Secondary Cloudinary Orphan Guard:**
   Query Cloudinary Search API for any assets in `ruhvi/chat_voice_notes` tagged `auto_purge_45d` with `created_at < 45 days ago` to purge any orphaned uploads that failed database insertion.
5. **Audit Logging:** Log total purged assets, errors, and memory freed.

### 3.4 Frontend Expired Audio Bubble UX
If `status === 'expired'` or audio stream fails due to 404/410:
- The inline player replaces the waveform/play button with an elegant amber badge:
  `"Audio expired (45-day retention policy)"`.
- The timestamp and sender remain visible in the message history so the conversation flow is preserved.

---

## 4. Phase-by-Phase Unified Implementation Roadmap

### Phase 0: Baseline Audit & Reconciliation (Read-Only)
**Objective:** Freeze existing working state, map canonical workers, verify credentials, and document regression checkpoints without touching production logic.

- [ ] **Task 0.1:** Record working baselines for Ru Chat (`/api/internal-chat/*`), Co-Founder (`/api/admin/co-founder/*`), LiveKit voice, and Action Center.
- [ ] **Task 0.2:** Reconcile Worker Directory discrepancy:
  - Canonical Worker Registry: 13 workers in `src/lib/ai/co-founder/workers/types.ts` & `registry.ts`.
  - Fix prompt discrepancy in `src/lib/ai/co-founder/brain.ts` (updates description from "12 workers" to "13 workers").
  - Map legacy UI aliases (`SWARM_NODES`: `researcher`, `coder`, `writer`, `designer`, `analyst`, `marketer`) cleanly to canonical `WorkerId`s.
- [ ] **Task 0.3:** Verify Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` & `CHAT_CLOUDINARY_*` fallbacks).
- [ ] **Task 0.4:** Verify Gemini credentials and verify `gemini-3.5-transcribe` access and quota.
- [ ] **Deliverable:** `PHASE_0_BASELINE_AUDIT_REPORT.md` (no functional breakage).

---

### Phase 1: Shared Data Contracts & Types
**Objective:** Define typed contracts for Voice Notes, Speech-to-Text, Multi-Conversations, and Multi-Agent Collaboration.

- [ ] **Task 1.1:** Create `src/lib/chat/voice-types.ts`:
  - `VoiceNoteMetadata`: `id`, `publicId`, `url`, `duration`, `size`, `mimeType`, `expiresAt`, `status`.
  - `VoiceRecorderState`: `idle` | `recording` | `paused` | `reviewing` | `uploading` | `error`.
  - `SpeechToTextState`: `idle` | `listening` | `transcribing` | `success` | `error`.
- [ ] **Task 1.2:** Create `src/lib/ai/co-founder/conversations/types.ts`:
  - `CoFounderConversation`: `id`, `userId`, `conversationType` (`'cofounder'` | `'worker'`), `workerId` (null for cofounder), `title`, `summary`, `lastMessageAt`, `createdAt`.
  - `CoFounderMessage`: `id`, `conversationId`, `senderType` (`'user'` | `'cofounder'` | `'worker'` | `'tool'` | `'system'`), `senderId`, `content`, `contentType`, `attachments`, `metadata`, `createdAt`.
- [ ] **Task 1.3:** Create `src/lib/ai/co-founder/workers/collaboration-types.ts`:
  - `WorkerConsultationRequest`: `correlationId`, `requesterWorkerId`, `targetWorkerId`, `task`, `context`, `timeoutMs`.
  - `WorkerConsultationResult`: `correlationId`, `status`, `targetWorkerId`, `findings`, `evidence`, `uncertainty`, `trace`.

---

### Phase 2: Additive Database Migrations
**Objective:** Deploy backward-compatible database schema in Supabase with RLS policies and indexes.

- [ ] **Task 2.1:** Create migration `supabase/migrations/0123_co_founder_multi_conversations.sql`:
  - Table `co_founder_conversations`: `id`, `user_id`, `conversation_type`, `worker_id`, `title`, `summary`, `last_message_at`, `created_at`, `updated_at`.
  - Unique index for worker chat: `(user_id, worker_id) WHERE conversation_type = 'worker'` (guarantees exactly one ongoing chat per admin-worker pair).
  - Table `co_founder_messages`: `id`, `conversation_id`, `sender_type`, `sender_id`, `content`, `content_type`, `attachments`, `metadata`, `created_at`.
  - Table `co_founder_worker_collaborations`: audit logs for worker consultations.
  - RLS Policies: only owner staff can select/insert/delete their own conversations.
- [ ] **Task 2.2:** Create migration `supabase/migrations/0124_ru_chat_voice_notes_and_lifecycle.sql`:
  - Table `chat_voice_notes`: `id`, `message_id`, `conversation_id`, `sender_id`, `cloudinary_public_id`, `cloudinary_url`, `duration_seconds`, `file_size_bytes`, `mime_type`, `uploaded_at`, `expires_at`, `status`, `deleted_at`.
  - Add optional column `voice_note_id` to `internal_chat_messages` (additive foreign key).
  - Index on `(expires_at, status)` for fast cron execution.
- [ ] **Deliverable:** Apply migration via Supabase CLI / runner and verify existing tables are untouched.

---

### Phase 3: Secure Cloudinary Audio Upload & 45-Day Cleanup Engine
**Objective:** Server-side upload handler with 45-day TTL registration + daily cron cleanup runner.

- [ ] **Task 3.1:** Create `src/lib/chat/cloudinary-audio.ts`:
  - `uploadAudioVoiceNote(buffer, metadata)`: upload with `resource_type: 'video'`, folder `ruhvi/chat_voice_notes`, tags `['voice_note', 'auto_purge_45d']`.
  - `deleteAudioVoiceNote(publicId)`: call `cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true })`.
- [ ] **Task 3.2:** Create API endpoint `src/app/api/internal-chat/voice-notes/upload/route.ts`:
  - Authentication: Staff session verification.
  - Validation: Max 10MB audio, allowed audio MIME types (`audio/webm`, `audio/mp4`, `audio/ogg`, `audio/wav`, `audio/aac`).
  - Upload to Cloudinary → insert record into `chat_voice_notes` with `expires_at = NOW() + 45 days`.
  - Returns `{ voiceNoteId, publicId, secureUrl, duration, expiresAt }`.
- [ ] **Task 3.3:** Create Cron Endpoint `src/app/api/cron/cleanup-voice-notes/route.ts`:
  - Auth check: `req.headers.get('authorization') === 'Bearer ' + process.env.CRON_SECRET` OR staff session.
  - Query up to 100 active expired voice notes (`expires_at <= NOW()`).
  - Batch delete from Cloudinary (`resource_type: 'video'`).
  - Update DB status to `'expired'` with `deleted_at = NOW()`.
  - Execute orphan check against Cloudinary search API.
- [ ] **Task 3.4:** Register cron job in `vercel.json`:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/automations",
        "schedule": "0 4 * * *"
      },
      {
        "path": "/api/cron/cleanup-voice-notes",
        "schedule": "0 3 * * *"
      }
    ]
  }
  ```

---

### Phase 4: In-Chat Voice Note Audio Recorder (Client-Side)
**Objective:** WhatsApp-style audio recording UI component with waveform animation, timer, cancel, and preview.

- [ ] **Task 4.1:** Create `src/components/chat/VoiceNoteRecorder.tsx`:
  - Explicit mic permission prompt on tap.
  - `MediaRecorder` hook supporting `audio/webm;codecs=opus` with fallback to `audio/mp4` on Safari/iOS.
  - Realtime recording duration timer and animated volume visualizer.
  - Controls: **Cancel (trash icon)**, **Stop & Review**, **Direct Send**.
  - Track cleanup: release `MediaStreamTrack` immediately on cancel/stop/unmount to avoid leaking microphone hardware.
- [ ] **Task 4.2:** Integrate recorder into `src/components/chat/InternalChatComposer.tsx`:
  - Add Mic button beside the paperclip/attachment icon.
  - Clear separation: Mic button starts Voice Note mode; Dictate button starts STT mode.

---

### Phase 5: WhatsApp-Style Inline Audio Player Bubble
**Objective:** Inline audio playback bubble inside chat with duration, seek bar, play/pause, and expired state handling.

- [ ] **Task 5.1:** Create `src/components/chat/VoiceNotePlayer.tsx`:
  - Play/Pause toggle with audio state management.
  - Progress bar / simulated audio waveform with seek support.
  - Audio duration display (elapsed / total).
  - Never display raw Cloudinary URLs to the user.
  - **Graceful Expired State:** If `status === 'expired'` or audio stream returns 404/410, display:
    `"Voice note expired after 45 days"` with an amber shield badge.
  - Prevents overlapping playback: pause any playing voice note when another starts.
- [ ] **Task 5.2:** Update `src/components/chat/MessageItem.tsx`:
  - If message contains `voice_note_id` or `type === 'voice_note'`, render `VoiceNotePlayer`.
  - Standard text messages render completely unchanged.

---

### Phase 6: Gemini 3.5 Transcribe Backend Service
**Objective:** Fast, accurate server-side transcription using `gemini-3.5-transcribe` supporting English, Bengali, and Hindi code-switching.

- [ ] **Task 6.1:** Create `src/lib/ai/transcribe-service.ts`:
  - Model: `gemini-3.5-transcribe`.
  - Server-side only: never expose Gemini API key to client.
  - Accepts audio blob/buffer from POST request.
  - Sends to Gemini Files API + generateContent with transcribe instruction.
  - Autodetects language: supports `en-IN`, `bn-IN`, `hi-IN` and mixed colloquial speech without forcing single locale.
  - Returns `{ transcript: string, detectedLanguage?: string, durationSeconds?: number }`.
  - Temporary processing only: **Audio is NOT stored in Cloudinary and is deleted immediately after transcription.**
- [ ] **Task 6.2:** Create API route `src/app/api/chat/transcribe/route.ts`:
  - Endpoint for STT requests. Authenticates user session.
  - Validates audio size (max 5MB for STT dictation).
  - Calls `transcribeService`. Returns `{ transcript: text }`.

---

### Phase 7: Speech-to-Text Recording UI & Draft Editor
**Objective:** Speech-to-text dictation control that fills the composer input as an editable draft.

- [ ] **Task 7.1:** Create `src/components/chat/SpeechToTextButton.tsx`:
  - Distinct mic-with-text icon (labeled "Dictate" / "Speech to Text").
  - On tap: records speech locally.
  - On stop: sends audio to `/api/chat/transcribe/route.ts`.
  - Displays loading spinner ("Transcribing Bengali / Hindi / English...").
  - On success: **Appends/replaces the transcribed text in the standard text input box**.
  - **Does NOT auto-send.** The user reviews, edits, and taps normal Send.
- [ ] **Task 7.2:** Embed in both Ru Chat composer (`src/components/chat/InternalChatComposer.tsx`) and Co-Founder composer (`src/app/co-founder/page.tsx`).

---

### Phase 8: Co-Founder Multi-Conversation Storage Repository & APIs
**Objective:** Server-side conversation persistence replacing ephemeral React-only state.

- [ ] **Task 8.1:** Create `src/lib/ai/co-founder/conversations/repository.ts`:
  - `createConversation(userId, type, workerId?, title?)`
  - `listConversations(userId, type)`
  - `getConversationWithMessages(conversationId, userId, limit, cursor)`
  - `appendMessage(conversationId, messagePayload)`
  - `updateConversationTitle(conversationId, newTitle)`
  - `deleteConversation(conversationId, userId)`: soft/hard delete of conversation and child messages; does NOT touch global memory or business data.
  - `getOrCreateWorkerConversation(userId, workerId)`: resolves the single persistent direct chat thread for that worker.
- [ ] **Task 8.2:** Create REST routes under `src/app/api/admin/co-founder/conversations/`:
  - `GET /api/admin/co-founder/conversations` (list threads)
  - `POST /api/admin/co-founder/conversations` (create new chat)
  - `GET /api/admin/co-founder/conversations/[id]` (get thread messages)
  - `PATCH /api/admin/co-founder/conversations/[id]` (rename thread)
  - `DELETE /api/admin/co-founder/conversations/[id]` (delete thread)
- [ ] **Task 8.3:** Update `src/app/api/admin/co-founder/chat/route.ts`:
  - Accept `conversationId` in request body.
  - Load previous conversation history from server repository rather than relying on untrusted client state.
  - Persist assistant response and tool outputs to `co_founder_messages`.

---

### Phase 9: Co-Founder Multi-Conversation UI (ChatGPT-Style)
**Objective:** Responsive sidebar, New Chat button, active thread switcher, auto-titling, and thread deletion.

- [ ] **Task 9.1:** Create `src/components/co-founder/ConversationSidebar.tsx`:
  - Left collapsible sidebar (drawer on mobile).
  - **"+ New Chat"** button at top.
  - List of past conversations grouped by Date (Today, Yesterday, Previous 7 Days).
  - Active conversation indicator.
  - Actions menu on hover: Rename (pencil icon), Delete (trash icon with confirmation modal).
- [ ] **Task 9.2:** Auto-title generation:
  - After the first user message & assistant reply, trigger a background lightweight title summary (3-5 words).
  - Update `co_founder_conversations.title`.
- [ ] **Task 9.3:** Integrate into `src/app/co-founder/page.tsx`:
  - Bind active `conversationId` to the chat viewport.
  - Switching conversation loads that thread's messages and summary.
  - Thread deletion removes only that conversation without clearing global memory.
  - Maintain existing LiveKit voice controls, workspace visualizer, and action center.

---

### Phase 10: Canonical 13-Worker Directory Reconciliation & Workforce UI
**Objective:** Synchronize all 13 registered AI workers across backend and UI cards.

- [ ] **Task 10.1:** Verify all 13 workers in `src/lib/ai/co-founder/workers/registry.ts`:
  1. `marketing` (Marketing & Ads Strategist)
  2. `seo` (Technical SEO & Keyword Specialist)
  3. `analytics` (Business & Analytics Specialist)
  4. `product` (Product Catalog & SKU Specialist)
  5. `inventory` (Inventory & Reorder Specialist)
  6. `customer_service` (Customer Support & VIP Concierge)
  7. `finance` (Cashbook, Ledger & Finance Specialist)
  8. `competitor` (Market & Competitor Intelligence)
  9. `compliance` (Hallmarking, Legal & Regulatory)
  10. `social_media` (Social Media & Influencer Outreach)
  11. `pricing` (Dynamic Gold/Silver Pricing & Margin Specialist)
  12. `supply_chain` (Vendor, Karigar & Logistics Specialist)
  13. `growth` (CRO & Retention Specialist)
- [ ] **Task 10.2:** Update `src/app/co-founder/workers/WorkerGrid.tsx` and 3D visualizers:
  - Map every card strictly to its canonical `WorkerId`.
  - Add explicit **"Chat with Worker"** button on each card.
  - Separate "Status / Active Task" inspection from direct chat initiation.

---

### Phase 11: Specialist AI Worker Direct Chat Service & UI
**Objective:** Dedicated 1:1 conversation window with each specialist AI worker.

- [ ] **Task 11.1:** Create `src/lib/ai/co-founder/workers/worker-chat-service.ts`:
  - Resolves target worker definition from registry.
  - Builds worker-specific system prompt (responsibilities, tools, allowed domains).
  - Injects worker's persistent thread history.
  - Executes conversational LLM response; runs domain tools if data lookup is needed.
- [ ] **Task 11.2:** Create API route `src/app/api/admin/co-founder/workers/[workerId]/chat/route.ts`:
  - Handles direct conversation with specific worker.
  - Verifies admin authentication.
  - Uses `getOrCreateWorkerConversation(userId, workerId)`.
- [ ] **Task 11.3:** Create `src/components/co-founder/WorkerChatDrawer.tsx`:
  - Slide-over / modal chat window for talking directly to the chosen specialist.
  - Header displays worker avatar, badge, status, and domain responsibilities.
  - Keeps worker conversations isolated from the main Co-Founder conversation sidebar.

---

### Phase 12: Backend Worker-to-Worker & Co-Founder Collaboration Gateway
**Objective:** Orchestrated agent consultations with loop prevention, recursion budgets, and audit logging.

- [ ] **Task 12.1:** Create `src/lib/ai/co-founder/workers/collaboration-gateway.ts`:
  - `consultWorker(request: WorkerConsultationRequest)`:
    - Checks allowlist and validates target `WorkerId`.
    - Checks recursion depth (`maxDepth = 2`) to prevent circular loops (Worker A → Worker B → Worker A).
    - Applies timeout (15s per consultation) and token budget.
    - Executes target worker in isolated sandbox with requesting context.
    - Records trace into `co_founder_worker_collaborations`.
    - Returns structured evidence and recommendations.
- [ ] **Task 12.2:** Expose `consult_specialist_worker` tool to Co-Founder orchestrator and worker tools:
  - Co-Founder can consult multiple workers (e.g., SEO + Analytics) to synthesize a single combined answer.
  - Workers can query peer workers for dependencies (e.g., Marketing queries Analytics for top converting products).

---

### Phase 13: Approval Workflow, RBAC, Multimodal Binding & Security
**Objective:** Enforce human-in-the-loop approvals, access control, and seamless voice/image binding.

- [ ] **Task 13.1:** Action Center Approval Integration:
  - Any mutating action generated by Co-Founder or Worker (price changes, coupons, catalog mutations) must output a structured `ActionProposal` with `status: 'pending_approval'`.
  - Commit to database only when admin explicitly approves in Action Center.
- [ ] **Task 13.2:** Multimodal & Voice Binding:
  - When LiveKit voice session runs, associate transcripts with the currently active `conversationId`.
  - When images are uploaded to Co-Founder chat, store Cloudinary reference in `co_founder_messages.attachments`.
- [ ] **Task 13.3:** Security & Sanitization:
  - Enforce `requireAdmin()` on all Co-Founder and Worker routes.
  - Enforce staff session checks on chat upload routes.
  - Redact API keys, tokens, and sensitive customer PII from collaboration logs.

---

### Phase 14: End-to-End Regression Testing & Quality Verification
**Objective:** Comprehensive unit, integration, and E2E validation against regression baseline.

- [ ] **Task 14.1:** Automated Unit Tests:
  - Test Cloudinary 45-day calculation and cleanup cron filter logic.
  - Test voice note recorder state machine and timer cleanup.
  - Test Gemini 3.5 Transcribe mock response handling and error states.
  - Test conversation repository CRUD and context isolation.
  - Test worker collaboration gateway recursion breaker.
- [ ] **Task 14.2:** Integration & Regression Tests:
  - Verify P2P text message sending works identically to baseline.
  - Verify Voice Note upload, inline playback, and Cloudinary storage.
  - Verify STT populates draft text without auto-sending.
  - Verify Co-Founder New Chat creates isolated context.
  - Verify Worker Direct Chat keeps separate history.
  - Verify Daily Voice Cleanup cron deletes expired files from Cloudinary and marks DB records as `'expired'`.
- [ ] **Task 14.3:** Mobile & UI Verification:
  - Responsive verification on mobile viewports for both chat bubbles and conversation drawers.

---

### Phase 15: Staged Rollout, Monitoring & Documentation Update
**Objective:** Safe production release with rollback capability and documentation sync.

- [ ] **Task 15.1:** Feature flags in environment:
  - `NEXT_PUBLIC_VOICE_NOTES_ENABLED=true`
  - `NEXT_PUBLIC_SPEECH_TO_TEXT_ENABLED=true`
  - `NEXT_PUBLIC_COFOUNDER_MULTI_CONVERSATION_ENABLED=true`
  - `NEXT_PUBLIC_WORKER_DIRECT_CHAT_ENABLED=true`
- [ ] **Task 15.2:** Update `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`:
  - Document Gemini 3.5 Transcribe addition.
  - Document Cloudinary Voice Note 45-day auto-purge engine and cron schedule.
  - Document multi-conversation and 13-worker directory structure.
- [ ] **Task 15.3:** Rollback Protocol:
  - Document steps to flip feature flags to `false` in case of unexpected provider issues, falling back cleanly to existing single-chat and text-only modes without data loss.

---

## 5. Verification Checklist & Success Criteria (Definition of Done)

| Feature Area | Verification Test | Expected Outcome | Status |
|---|---|---|---|
| **Voice Note (P2P)** | Record 10s voice note & send in Ru Chat | Inline WhatsApp bubble renders; audio plays inline; no raw URL visible | [ ] |
| **Voice Note Isolation** | Inspect network trace during Voice Note send | **Zero calls to Gemini API**. Pure Cloudinary upload. | [ ] |
| **Cloudinary 45D Purge** | Trigger `/api/cron/cleanup-voice-notes` with expired mock note | Asset destroyed on Cloudinary (`resource_type: video`); DB marked `'expired'` | [ ] |
| **Expired Audio UX** | View expired voice note in chat | Renders `"Voice note expired after 45 days"` badge without crashing | [ ] |
| **Speech-to-Text** | Dictate Bengali / English audio via STT button | Transcript populates text box as editable draft; **does not auto-send** | [ ] |
| **STT Cloudinary Isolation** | Inspect network trace during STT dictation | **Zero Cloudinary uploads**. Pure temporary buffer to Gemini. | [ ] |
| **Co-Founder Multi-Chat** | Create Topic A, then Topic B in Co-Founder | Two separate threads in sidebar; switching restores exact thread context | [ ] |
| **Context Isolation** | Ask about Topic A details in Topic B | Co-Founder answers from Topic B context only; no prompt bleeding | [ ] |
| **Delete Conversation** | Delete Topic B | Topic B removed; Topic A and global business memory remain 100% intact | [ ] |
| **Worker Direct Chat** | Open Marketing Worker card & chat | Dedicated chat with Marketing specialist; separate from Co-Founder sidebar | [ ] |
| **Worker Collaboration** | Worker queries another worker for data | Collaboration Gateway resolves query with audit trace; no infinite loops | [ ] |
| **Approval Safety** | Worker proposes price reduction | Action queued in Action Center as pending; no unauthorized DB write | [ ] |
| **Zero Regression** | Run full test suite (`npm run test`, `npm run build`) | All existing chat, login, products, orders, and tools pass with 0 errors | [ ] |

---

## 6. Execution Command Reference

When executing this plan phase-by-phase, use the following standard commands:

```powershell
# 1. Run type checking and linter
npm run type-check
npm run lint

# 2. Run unit and integration tests
npm run test

# 3. Apply database migrations to Supabase
npx supabase migration up

# 4. Trigger the voice note 45-day cleanup cron manually (testing)
curl -X GET "http://localhost:3000/api/cron/cleanup-voice-notes" -H "Authorization: Bearer $env:CRON_SECRET"

# 5. Build for production verification
npm run build
```

---
*This plan is the authoritative single source of truth for the complete Voice Notes, Speech-to-Text, and Multi-Conversation / Multi-Agent Workspace implementation on Project Ruhvi.*

