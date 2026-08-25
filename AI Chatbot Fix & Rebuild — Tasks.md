# AI Chatbot Fix & Rebuild — Tasks

## Phase 1: Fix Critical Blockers
- [x] Fix credential-encryption.ts to not crash when CREDENTIAL_ENCRYPTION_KEY is missing
- [x] Add CREDENTIAL_ENCRYPTION_KEY to .env.local
- [x] Fix Gemini model names to use real, existing models (gemini-3.6-flash — the only working model for the API key; 2.5/3.5/2.0 are deprecated)
- [x] Fix gemini.ts provider model resolution
- [x] Fix index.ts hardcoded model rewrites
- [x] Fix settings route model name references
- [x] Fix AI settings page model lists
- [x] Fix the GEMINI_API_KEY format issue (make system work with existing fallback keys)

## Phase 2: Knowledge Layer
- [ ] Create src/lib/ai/knowledge.ts with live data retrieval
- [ ] Integrate knowledge layer into support/chat/route.ts

## Phase 3: Persistent Configuration
- [ ] Load chatbot system prompt from DB settings
- [ ] Add temperature/token config support to providers
- [ ] Update support chat route to use DB-stored prompts

## Phase 4: Privacy & Security
- [ ] Add server-side output sanitization
- [ ] Strip internal details from error messages sent to frontend

## Phase 5: AI Control Center
- [x] Fix model lists in AI settings page
- [ ] Add chatbot-specific configuration panel
