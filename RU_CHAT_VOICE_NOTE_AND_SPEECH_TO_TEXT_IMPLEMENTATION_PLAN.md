# Ru Chat — Voice Note & Speech-to-Text Implementation Plan

**Project:** Ruhvi / Ru Chat  
**Scope:** WhatsApp-style Voice Notes + separate Speech-to-Text (STT) mode  
**Selected STT model:** `gemini-3.5-transcribe`  
**Storage for sent voice notes:** Existing Cloudinary account  
**Execution policy:** One phase at a time; report and approval required before the next phase.

---

## 1. Objective

Add exactly two independent voice features to the existing Ru Chat system:

1. **Voice Note:** Record audio inside Ru Chat, send it as an audio message, and let the recipient play it directly inside the chat bubble—like WhatsApp. The recipient must not see a raw Cloudinary URL or be redirected to the phone's external audio-player app.
2. **Speech-to-Text:** Record speech in a separate mode, transcribe it with Gemini 3.5 Transcribe, show the resulting text as an editable draft, and send it only when the user presses the normal Send button.

Voice Notes are in scope for Person-to-Person chats. Speech-to-Text is in scope for Person-to-Person chats and AI Worker / AI Co-Founder chats, subject to existing chat permissions and capabilities.

## 2. Non-Negotiable Feature Separation

These are two independent features. They must not be merged into one pipeline.

### Feature A — Voice Note

- The user records audio using the in-chat recording control.
- The user previews or reviews the recording and explicitly presses Send.
- The audio file is uploaded to Cloudinary.
- The chat stores an audio-message reference and required metadata.
- The receiver sees an inline WhatsApp-style audio bubble and taps Play.
- **Gemini must not be called in this flow.**
- No automatic transcription is performed.
- No live call, WebRTC, audio streaming call, or text-to-speech feature is included.

### Feature B — Speech-to-Text

- The user selects a separate Speech-to-Text / Dictation control.
- The user records speech for transcription.
- The recorded audio is sent securely to the backend and then to `gemini-3.5-transcribe`.
- The returned transcript appears in the normal message composer as an editable draft.
- The user reviews/edits it and explicitly presses Send.
- The existing normal text-message sending flow sends the transcript.
- **This flow must not create a Cloudinary voice-note message or an audio-player bubble.**
- The transcript must never be sent automatically without the user's confirmation.

### Important distinction for AI chats

In the current approved scope, Voice Note sending/playback is for Person-to-Person chats. AI Worker / AI Co-Founder chats receive the separate Speech-to-Text feature: the user records speech, reviews the transcript, and sends it as ordinary text. Do not add audio-attachment delivery to AI threads unless the owner explicitly approves that as a separate scope change.

---

## 3. Target Feature Matrix

| Chat type | Voice Note: record, send, inline playback | Speech-to-Text: transcribe, edit, send text |
|---|---:|---:|
| Person-to-Person | Yes | Yes |
| AI Worker | Not included in this scope | Yes; transcript enters the existing AI message pipeline |
| AI Co-Founder | Not included in this scope | Yes; transcript enters the existing AI message pipeline |

The audit phase must verify which chat variants share components and which have separate permission or message pipelines. Reuse shared components where safe; do not force a rewrite of different chat implementations.

---

## 4. Strict Existing-Feature Protection Rules

These rules apply to every phase and override implementation convenience.

1. **Do not break, remove, rename, replace, or silently change any existing feature, button, route, API, database field, message type, event, permission, or user flow.**
2. Do not rewrite the existing chat composer or message-send handler wholesale. Add the new controls and handlers around the existing implementation.
3. Existing text messages must continue to send, receive, render, paginate, search, notify, and persist exactly as before.
4. Preserve all current login/authentication, Firebase session, Supabase access/RLS, staff roles, AI Worker permissions, AI Co-Founder permissions, and conversation-membership checks. Confirm the actual current implementation during audit; do not assume or replace it.
5. Use **additive and backward-compatible** database changes only. Do not delete or rename columns, change primary keys, rewrite historical messages, or make existing text-message fields newly mandatory.
6. Do not expose Cloudinary API secrets, Gemini API keys, or signing secrets to browser code.
7. Do not expose a raw media URL as visible message text. The URL may be used internally as the audio player's source, but access must be authorized for the conversation participant.
8. Do not call Gemini from the Voice Note path. Do not call Cloudinary from the Speech-to-Text path unless the audit discovers a technically necessary, explicitly approved reason.
9. Do not auto-send an audio recording or transcript. The user must explicitly press Send.
10. Do not add live calls, WebRTC, always-on microphone access, background recording, TTS, automatic translation, or an unrelated media/file-sharing redesign.
11. Keep the features behind independently controllable feature flags until testing is complete.
12. Do not proceed to the next phase until the current phase has a written completion report and the owner approves it.

### Required workflow for every phase

**Inspect → Plan → Implement only the approved task → Test → Regression-check → Report → Wait for approval.**

If a phase reveals an existing bug or an architectural change outside this scope, document it and ask for approval. Do not silently fix unrelated code while implementing these features.

---

## 5. Technical Architecture

### 5.1 Voice Note path

```text
In-chat Record control
        ↓
Browser microphone permission
        ↓
Record audio locally (MediaRecorder or compatible approach)
        ↓
Preview / Cancel / Send
        ↓
Authenticated backend upload/signing endpoint
        ↓
Cloudinary audio upload
        ↓
Persist audio-message metadata in the existing chat data model
        ↓
Send/receive through the existing chat message delivery mechanism
        ↓
WhatsApp-style inline audio bubble
        ↓
Recipient taps Play and listens inside Ru Chat
```

**Cloudinary implementation note:** Cloudinary treats audio files as video resources for upload/delivery purposes. The implementation should use the correct `resource_type` (`video`, or a deliberately tested `auto` upload strategy) rather than assuming the default image resource type. Keep this detail inside the Cloudinary service adapter, not scattered across UI components.

### 5.2 Speech-to-Text path

```text
Separate Speech-to-Text control
        ↓
Record speech locally
        ↓
Stop recording / submit for transcription
        ↓
Authenticated backend transcription endpoint
        ↓
Gemini Files API + Interactions API
        ↓
Model: gemini-3.5-transcribe
        ↓
Receive transcript text
        ↓
Show editable draft in existing composer
        ↓
User reviews/edits and presses Send
        ↓
Existing normal text-message send handler
        ↓
Person receives text OR AI Worker/Co-Founder receives text
```

The Speech-to-Text audio is temporary input for transcription. It is not saved as a Cloudinary voice-note message and it does not create an audio-player bubble.

---

## 6. Selected Speech-to-Text Model

Use the dedicated Gemini model ID:

```text
gemini-3.5-transcribe
```

The model's current official documentation describes automatic detection across 85+ locales and code-switching. The supported language table includes Bengali (India) `bn-IN`, Hindi `hi-IN`, and Indian English `en-IN`. For automatic detection and mixed-language speech, omit the explicit language-code restriction unless testing shows a clear reason to pass a language hint.

**Model integration requirements:**

- Use the official Gemini API flow documented for audio transcription (Files upload followed by an Interactions API request).
- Keep the model call inside a server-side service/adapter.
- Use the existing Gemini secret/provider configuration only after confirming that its current API key, project, key restrictions, API endpoint, and quota can access this model and the required API method.
- Do not assume that a Google AI Pro subscription from a Jio offer automatically includes Gemini Developer API credits. API billing and quota are determined by the API project/tier. Verify the actual project in AI Studio before enabling production use.
- The official pricing page currently lists a Free Tier as free of charge for this model, subject to access and rate limits. The Paid Tier estimate is approximately `$0.003/min` audio input plus `$0.002/min` text output (about `$0.005/min` blended). Recheck pricing and project eligibility immediately before launch; do not hard-code price assumptions.
- The official Free Tier terms say submitted content may be used to improve Google products. Review this privacy implication before sending private staff/customer conversations or sensitive voice content. If unacceptable, obtain approval for a paid/API privacy configuration before production use.
- Do not fall back to another model or paid provider without approval. If the selected model/key is unavailable, show a clear error and report the blocker.

Official references are listed in Section 13.

---

# 7. Step-by-Step Implementation Phases

Each phase has one primary task. No phase may begin until the previous phase's report is reviewed and approved.

## Phase 0 — Read-Only Ru Chat Audit and Baseline

**One task:** Understand and document the existing Ru Chat architecture without changing code.

### Inspect

- All Person-to-Person chat pages/components and their shared composer.
- AI Worker and AI Co-Founder chat pages/components.
- Current text-message creation, validation, persistence, realtime delivery, pagination, ordering, unread counts, and notifications.
- Existing message schema/types and any attachment/media support.
- Current Supabase tables, constraints, RLS policies, indexes, and migrations relevant to chat.
- Current authentication/session and conversation-participant authorization checks.
- Existing Cloudinary configuration, upload helpers, signed-upload patterns, and cleanup strategy.
- Existing Gemini API integration, API-key rotation/provider layer, environment variables, and server-side routes.
- Current mobile microphone permissions and browser support assumptions.
- Existing tests, lint/type-check/build commands, and deployment setup.

### Baseline tests

Record whether these work before any change: login/session, open chat, send text, receive text, refresh/reload, realtime updates, message ordering, pagination, unread count, notifications, role restrictions, and AI response/context flow.

### Deliverable

`RU_CHAT_VOICE_FEATURE_AUDIT_REPORT.md` with architecture map, relevant files/routes/tables, baseline test results, identified risks, recommended additive design, and a regression checklist.

**No code or database changes in this phase.**

**Exit gate:** Owner approves the audit report and the proposed implementation approach.

## Phase 1 — Final Technical Contract and UI Placement

**One task:** Finalize the exact integration contract for both independent features.

### Define

- Separate composer controls and their labels/icons/tooltips so Voice Note and Speech-to-Text cannot be confused.
- Recording states: idle, recording, stopped/preview, uploading or transcribing, failed, cancelled, and completed.
- The Voice Note message payload and the Speech-to-Text response payload.
- Which existing chat components can safely reuse the same recorder/player components.
- Maximum recording duration and maximum file size as configurable values, selected after the audit and based on current app/storage limits.
- Loading, retry, permission-denied, unsupported-browser, empty-recording, and network-error behavior.

### UI contract

- Voice Note: separate record control; recording indicator and timer; Stop; optional preview; Cancel; explicit Send.
- Speech-to-Text: separate dictation control; recording timer; Stop; Transcribe; transcript appears in the existing composer for editing; explicit Send.
- Existing text input and Send button remain in place and keep their current behavior.

### Deliverable

Approved component/state diagram, API contract, schema proposal, and UI behavior specification.

**Exit gate:** Owner approves the UI and technical contract.

## Phase 2 — Additive Message Data-Model Support

**One task:** Add backward-compatible storage for audio-message metadata.

### Requirements

- Follow the exact existing schema discovered in Phase 0.
- Represent audio messages without changing the meaning or required fields of existing text messages.
- Prefer the least disruptive additive method: an existing extensible metadata field if already designed for it, or a separate attachment table linked to the existing message ID if that is safer.
- Store only necessary metadata, such as message ID, conversation ID, sender ID, media type, Cloudinary asset identifier, secure delivery reference, MIME type, duration, byte size, and creation time.
- Ensure old messages continue to deserialize/render as their existing text type.
- Keep participant/role authorization and RLS rules intact; add only the minimal required policy for the new media record.
- Include a reversible migration or rollback procedure. Do not rewrite historical rows.

### Tests

- Existing text-message records load unchanged.
- New optional audio metadata can be inserted/read by authorized participants.
- Unauthorized users cannot read or alter another conversation's audio metadata.

### Deliverable

Migration, updated types/contracts, and test report.

**Exit gate:** Owner approves migration and compatibility test report.

## Phase 3 — Reusable In-Chat Audio Recorder

**One task:** Build the client-side recording component without connecting it to Cloudinary or chat sending yet.

### Requirements

- Request microphone permission only after the user deliberately presses the Voice Note record control.
- Support start, stop, cancel, duration timer, and local preview.
- Detect browser-supported recording MIME types rather than assuming one codec.
- Release microphone tracks and browser resources after stop, cancel, unmount, or error.
- Handle permission denied, no microphone, unsupported MediaRecorder, empty recording, and interrupted recording.
- Work on supported Android browsers and desktop browsers used by Ru Chat.
- Do not introduce background recording or persistent microphone access.

### Tests

- Start/stop/cancel works repeatedly without leaking the microphone.
- The recorded Blob has a correct MIME type and non-zero size.
- A cancelled recording is not sent or uploaded.
- Existing chat composer remains functional.

### Deliverable

Reusable recorder component and isolated tests; no production message sending yet.

**Exit gate:** Owner approves recorder behavior on target devices.

## Phase 4 — Secure Cloudinary Audio Upload Service

**One task:** Implement the server-controlled Cloudinary upload path for Voice Notes.

### Requirements

- Use the existing Cloudinary account/configuration; do not create a second storage system.
- Upload audio using the correct Cloudinary resource type (`video` for audio, or a tested `auto` strategy).
- Use server-signed upload parameters or an authenticated backend upload route, consistent with the existing project architecture.
- Keep `api_secret` and signing credentials server-only.
- Validate authenticated user, allowed conversation context, MIME type, file size, and configured duration limits.
- Generate non-guessable asset identifiers and store the Cloudinary asset ID/public ID needed for management.
- Do not display the raw URL in the chat UI.
- Ensure the receiver can play the audio only after existing conversation authorization is checked. Use an appropriately protected/signed delivery approach if public delivery would expose private conversation audio.
- Define cleanup for an uploaded asset if message persistence fails, and a safe cleanup strategy for abandoned/orphan uploads.

### Tests

- Valid audio uploads and can be retrieved by an authorized participant.
- Invalid MIME/oversized files are rejected.
- Unauthenticated or unauthorized upload requests are rejected.
- Cloudinary credentials never appear in client bundles or responses.

### Deliverable

Cloudinary audio service/API, environment-variable documentation, and security test report.

**Exit gate:** Owner approves secure upload verification.

## Phase 5 — Send and Persist Voice Notes in Person-to-Person Chat

**One task:** Connect the recorder and Cloudinary service to the existing Person-to-Person send flow.

### Requirements

- Add the Voice Note control without replacing the existing composer or text Send handler.
- User records, stops, reviews if enabled, and explicitly presses Send.
- Upload audio, then create the audio-message record using the existing conversation/message delivery mechanism.
- Preserve sender identity, conversation ID, permissions, timestamps, ordering, unread counts, and notifications.
- Provide clear states: recording, uploading, sent, failed, retry, and cancel.
- Prevent duplicate messages/uploads when the user taps Send more than once or retries after a network error (idempotency or equivalent guard).
- If upload succeeds but message persistence fails, handle the orphaned Cloudinary asset safely.

### Tests

- Voice Note sends between two authorized users.
- Existing text messages still send exactly as before.
- No Gemini request is made during this flow.
- Unauthorized users cannot send into a conversation.

### Deliverable

Person-to-Person Voice Note sending with regression test report.

**Exit gate:** Owner approves P2P send/receive behavior before player integration.

## Phase 6 — WhatsApp-Style Inline Audio Player

**One task:** Build the in-chat audio bubble/player and render received Voice Notes inside the chat.

### UI requirements

- Play/Pause button inside the message bubble.
- Progress/waveform visualization and elapsed/total duration.
- Tap/click to play directly inside Ru Chat; do not open the phone's external audio-player app or show a raw URL.
- Keep the styling consistent with the sender/receiver chat bubbles and Ru Chat theme.
- No autoplay; playback starts only after the user taps Play.
- Handle loading, buffering, playback failure, expired/unauthorized media link, and retry.
- Ensure multiple audio messages do not unexpectedly play over one another; choose and document a predictable behavior.
- Use an embedded browser audio element/service under the custom UI; the native audio engine may handle playback internally, but the user must remain in Ru Chat.

### Tests

- Sender and receiver can play the message inline.
- Pause/resume and progress work.
- Message history/reload restores the audio bubble.
- A raw Cloudinary URL is not rendered as visible text.
- Text, image, and other existing message types render unchanged.

### Deliverable

WhatsApp-style audio bubble/player and UI regression report.

**Exit gate:** Owner approves visual and playback behavior.

## Phase 7 — Separate Speech-to-Text Recording Mode UI

**One task:** Add the independent STT recording control and its client-side states; do not connect the real Gemini call yet.

### Requirements

- Use a clearly separate control from the Voice Note button (distinct icon/tooltip/accessibility label).
- The UI must make it clear that this mode creates text, not an audio message.
- Record speech, stop, cancel, and submit for transcription.
- Show a transcribing/loading state.
- Provide an empty/error/retry state.
- Reserve a draft area in the existing composer for the returned text.
- Do not call Cloudinary and do not create a message during this phase.
- Do not automatically send any result.

### Tests

- Speech-to-Text control cannot accidentally trigger Voice Note send.
- Voice Note control cannot accidentally trigger STT.
- Existing text typing and sending remain unchanged.

### Deliverable

Separate STT control and state-management report.

**Exit gate:** Owner approves the two-control UI distinction.

## Phase 8 — Gemini 3.5 Transcribe Backend Integration

**One task:** Add the server-side transcription adapter using the existing approved Gemini project/key configuration.

### Requirements

- Model ID must be `gemini-3.5-transcribe`.
- Use the supported audio-file transcription flow (Gemini Files API upload, then Interactions API request), following the current official SDK/API documentation.
- Verify the existing key's project, key type/restrictions, API access, free-tier eligibility, rate limits, and billing status before making production calls.
- Keep the API key on the server only. Never send it to the browser.
- Accept only authenticated, authorized requests; validate audio MIME type, byte size, and configured duration.
- Enable automatic language detection by default so Bengali, Hindi, English, and code-switching can be handled without forcing a single language.
- Return only the transcript and safe metadata needed by the UI. Do not pass raw Gemini response internals to the client.
- Add timeout, retry rules for transient failures, rate limiting, usage logging, and clear error codes. Never retry endlessly.
- Do not send STT audio to Cloudinary or the AI Worker prompt pipeline.
- Do not automatically invoke the AI Worker after transcription; the user must review and press Send first.
- Handle Google API quota/rate-limit, authentication, permission, unsupported format, empty transcript, and server errors gracefully.
- Do not log raw audio or full sensitive transcripts in application logs.

### Tests

- Test Bengali, English, Hindi, and mixed Bangla-English/Hindi speech using consented sample recordings.
- Verify transcript output and behavior for silence/noise/empty input.
- Verify API-key and quota failures produce a useful UI error without exposing secrets.
- Verify the request is made only from the STT flow.

### Deliverable

Gemini transcription service/API, configuration notes, language test results, and cost/quota/privacy verification.

**Exit gate:** Owner approves language quality and API cost/privacy status.

## Phase 9 — Transcript Preview, Edit, and Send in Person-to-Person Chat

**One task:** Connect the transcript result to the P2P composer and existing text-send handler.

### Requirements

- After transcription, populate the existing composer with the returned text as a draft.
- Allow the user to edit, shorten, or discard the draft.
- Send only when the user presses the existing Send button.
- The final message must be a standard text message, not an audio message or special STT message type unless the existing schema needs non-visible provenance metadata and this is separately approved.
- On failure, preserve the user's recording/draft state where feasible and offer retry.
- Do not add a duplicate send path; use the existing text-message send handler.

### Tests

- Transcript appears in the P2P input field.
- Edit then send works as ordinary text.
- Cancel/discard sends nothing.
- Existing typed messages are unaffected.

### Deliverable

P2P STT draft/send integration and regression report.

**Exit gate:** Owner approves P2P Speech-to-Text behavior.

## Phase 10 — Transcript Preview, Edit, and Send in AI Worker / AI Co-Founder Chat

**One task:** Connect the same STT draft flow to the existing AI chat message pipeline.

### Requirements

- Transcribed text appears in the existing AI chat composer as an editable draft.
- Only pressing Send sends it to the existing AI Worker/AI Co-Founder message pipeline.
- Preserve AI context, conversation history, role/worker selection, permissions, approval gates, tool execution rules, and response rendering.
- Do not bypass existing AI middleware, model routing, rate limits, or safety checks.
- Do not execute or process a transcript before explicit send.
- Do not add a second AI message-send implementation.

### Tests

- AI receives the transcript as ordinary user text.
- Existing manually typed prompts work unchanged.
- AI context and tool/approval behavior remain unchanged.
- Transcription failure does not create an AI message or trigger a worker.

### Deliverable

AI chat STT integration and AI regression report.

**Exit gate:** Owner approves AI Worker and Co-Founder dictation flow.

## Phase 11 — End-to-End Regression, Security, and Mobile QA

**One task:** Verify the complete two-feature implementation against the original baseline.

### Required test coverage

**Voice Note**
- P2P send, receive, reload, history, play, pause, seek/progress, retry, and authorization.
- Unsupported recording format, permission denied, network interruption, upload failure, and message persistence failure.

**Speech-to-Text**
- Bengali, Hindi, English, and mixed-language recordings.
- Transcript preview, edit, discard, retry, and explicit send.
- P2P sends transcript as normal text.
- AI chat receives transcript through the existing AI pipeline.
- No Cloudinary upload and no auto-send in STT mode.

**Existing feature regression**
- Login/logout/session restoration.
- All existing chat types and role permissions.
- Normal text send/receive, realtime updates, message order, pagination, unread counts, notifications, refresh/reload, and message history.
- Existing image/file attachments and other message types, if present.
- AI Worker routing, AI Co-Founder chat, context/history, tools, approval flow, and current model routing.
- Mobile and desktop layout, keyboard behavior, accessibility labels, and touch interactions.

### Release controls

- Keep Voice Note and STT behind separate feature flags.
- Enable first for a controlled test account/conversation, then expand after approval.
- Monitor upload failures, transcription failures, latency, quota errors, and client-side errors without collecting raw audio unnecessarily.
- Document how to disable each feature independently.
- Provide a rollback plan that disables the feature flags and reverts only the new additive code/migration if needed. Never roll back or rewrite existing chat data.

### Deliverable

`RU_CHAT_VOICE_FEATURE_FINAL_QA_REPORT.md` with test evidence, known limitations, remaining risks, rollout status, rollback steps, and confirmation that baseline features still work.

**Exit gate:** Owner approves production rollout.

---

## 8. Required UI Behavior Summary

| User action | Expected result | Cloudinary used? | Gemini used? | Message type sent |
|---|---|---:|---:|---|
| Record Voice Note → Send | Inline audio bubble appears; receiver taps Play | Yes | **No** | Audio message |
| Record in Speech-to-Text mode → Stop | Transcript is generated and shown as a draft | No | Yes | Nothing sent yet |
| Edit transcript → press Send | Normal text message is sent | No | No additional call | Text message |
| Cancel Voice Note | Recording is discarded | No | No | Nothing |
| Cancel STT draft | Draft is discarded | No | Only the already-requested transcription may have run | Nothing |

---

## 9. Definition of Done

The implementation is complete only when all conditions below are true:

- [ ] Voice Note and Speech-to-Text are visibly separate controls/modes.
- [ ] Voice Notes upload to Cloudinary and are played inside the Ru Chat bubble like WhatsApp.
- [ ] The UI never prints the raw Cloudinary URL as message text.
- [ ] Voice Note sends/playback never call Gemini.
- [ ] Speech-to-Text uses `gemini-3.5-transcribe` through the backend.
- [ ] Bengali, English, Hindi, and mixed-language test recordings have been checked.
- [ ] Speech-to-Text returns an editable draft and never auto-sends.
- [ ] Pressing Send uses the existing text-message send handler.
- [ ] Both features work in the approved P2P and AI chat surfaces.
- [ ] Existing authentication, permissions, chat behavior, AI pipelines, and all baseline features pass regression tests.
- [ ] API keys/secrets remain server-side and audio access is authorized.
- [ ] Cost, quota, privacy, and Free/Paid project status have been explicitly checked.
- [ ] Independent feature flags and rollback instructions are documented.
- [ ] Final QA report is approved.

---

## 10. Explicitly Out of Scope

Do not implement these as part of this task:

- Live audio calls or video calls.
- WebRTC, real-time audio streaming, or always-listening microphone mode.
- Text-to-speech or AI-generated voice replies.
- Automatic transcription of every Voice Note.
- Automatic AI execution from a Voice Note attachment.
- Automatic sending of any transcript.
- Automatic translation between Bengali, English, or Hindi.
- A new general-purpose file-sharing system or an unrelated chat redesign.
- Replacing Cloudinary, the current database, authentication, AI routing, or the existing chat architecture.

---

## 11. Implementation Governance

The AI coding agent must follow these instructions strictly:

1. Start with Phase 0 only. Do not edit files during the audit.
2. Present the Phase 0 report and wait for explicit approval.
3. Implement only one approved phase at a time.
4. Before editing, list the exact files/tables/routes expected to change and why.
5. After editing, list every changed file and migration, tests run, results, and any issue found.
6. Run the project's relevant lint, type-check, unit/integration tests, and production build where available.
7. Compare the current result against the Phase 0 regression baseline.
8. If any existing feature regresses, stop, fix only the regression caused by the current phase, rerun tests, and report it. Do not continue to the next phase.
9. If an unexpected architecture change, new paid service, new subscription, or destructive migration appears necessary, stop and ask for approval.
10. Wait for the owner's explicit approval before starting the next phase.

**Absolute instruction:** No existing feature may be broken, removed, weakened, bypassed, or changed as a side effect of this implementation. If a requirement cannot be met without risking an existing feature, stop and present the conflict instead of making the risky change.

---

## 12. Suggested Configuration (Confirm During Audit)

Use configuration rather than hard-coded values for:

- `VOICE_NOTE_ENABLED`
- `SPEECH_TO_TEXT_ENABLED`
- `GEMINI_TRANSCRIBE_MODEL=gemini-3.5-transcribe`
- Maximum recording duration
- Maximum audio upload size
- Allowed audio MIME types
- Upload/transcription timeout
- Retry limit
- Rate limits per user/conversation

Do not add production values or expose secrets in source control. Use the existing environment-variable/secret-management conventions discovered in Phase 0.

---

## 13. Official Technical References

- Gemini Audio Transcription guide: https://ai.google.dev/gemini-api/docs/transcribe
- Gemini 3.5 Transcribe model details: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe
- Gemini Developer API pricing: https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-transcribe
- Gemini API billing and Free/Paid tiers: https://ai.google.dev/gemini-api/docs/billing
- Gemini API key security: https://ai.google.dev/gemini-api/docs/api-key
- Cloudinary upload parameters and audio resource type: https://cloudinary.com/documentation/upload_parameters

**Pricing and availability note:** As checked while preparing this plan, Google's published Gemini 3.5 Transcribe pricing lists Free Tier use as free of charge (subject to model access and rate limits) and Paid Tier estimated usage at about `$0.005/min` blended. Recheck the official page and the actual API project's tier immediately before deployment because prices, availability, and quota can change.
