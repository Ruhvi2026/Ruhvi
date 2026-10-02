# STAGE 1 — EXISTING RUHVI AI CO-FOUNDER AUDIT & ARCHITECTURE

## OBJECTIVE

Perform a complete audit and architectural analysis of the existing Ruhvi AI Co-Founder application before any implementation work begins.

The goal of this stage is to understand exactly:

- What already exists
- What is currently working
- What is incomplete
- What can be reused
- What needs modification
- What is genuinely missing
- What the final Co-Founder architecture should look like
- What future stages will need to implement

THIS IS AN ANALYSIS AND AUDIT STAGE ONLY.

DO NOT modify, refactor, delete, rename, migrate, reinstall, rewrite, replace, or otherwise change any existing code, configuration, database schema, API, component, workflow, dependency, credential, or deployment configuration during this stage.


==================================================
PHASE 1 — COMPLETE SYSTEM INVENTORY
==================================================

First inspect the complete repository and identify:

- Complete project structure
- Frontend framework
- Backend architecture
- API routes
- Server actions
- Database integration
- Authentication
- Authorization
- AI/model integrations
- Co-Founder Brain
- AI orchestration
- MCP integrations
- MCP tools
- Other tools/functions
- Memory system
- Conversation system
- Support-ticket system
- Analytics
- Logging
- Error handling
- Rate limiting
- Fallback mechanisms
- Background jobs
- External services
- Deployment configuration
- Environment configuration
- Testing infrastructure
- Existing realtime functionality
- Existing voice/audio functionality

Search the repository thoroughly.

Do not assume that a capability is missing simply because it is not found in one obvious file.

Before declaring anything missing, search all relevant directories, files, dependencies, configuration, APIs, and database structures.


==================================================
PHASE 2 — EXISTING CO-FOUNDER ARCHITECTURE
==================================================

Trace the actual existing Co-Founder flow from beginning to end.

Document the real flow discovered in the codebase.

Use a structure similar to:

User
  ↓
Frontend
  ↓
API / Backend
  ↓
AI Orchestration
  ↓
Co-Founder Brain
  ↓
Context / Memory
  ↓
Model
  ↓
MCP / Tools
  ↓
Database / External Services
  ↓
Response
  ↓
Frontend

Do not describe an ideal architecture.

Describe the architecture that ACTUALLY EXISTS.

Identify:

- Entry points
- Request flow
- Response flow
- AI orchestration
- Co-Founder Brain logic
- Context construction
- Model selection
- Tool selection
- Tool execution
- Memory retrieval
- Memory storage
- Error handling
- Fallback handling
- Rate limiting
- Logging
- Session handling


==================================================
PHASE 3 — AI & MODEL SYSTEM AUDIT
==================================================

Inspect every existing AI/model integration.

Determine:

- Supported AI providers
- Supported models
- Provider selection logic
- Model routing
- Custom provider support
- Fallback logic
- Rate-limit handling
- Streaming support
- API-key handling
- Centralized model configuration
- Existing realtime capabilities
- Compatibility requirements for Gemini Live API

Document how the current AI system works.

Do not replace or remove any existing AI provider.

Do not modify model configuration.

Determine what changes will eventually be required to support realtime voice interaction for the Co-Founder.


==================================================
PHASE 4 — MEMORY & CONTEXT AUDIT
==================================================

Inspect the complete memory implementation.

Determine:

- Supabase memory structure
- Memory tables
- Conversation history
- Short-term context
- Long-term memory
- User context
- Business context
- Session context
- Retrieval mechanism
- Storage mechanism
- Summarization
- Context injection into the AI
- Any existing memory optimization

Determine how the existing memory system can be reused by the future realtime Co-Founder.

Do not modify the memory system.


==================================================
PHASE 5 — MCP & TOOL AUDIT
==================================================

Inspect all existing:

- MCP servers
- MCP tools
- Functions
- APIs
- Tool-calling mechanisms
- External integrations

For each important tool document:

- Tool name
- Purpose
- Input
- Output
- Authentication requirements
- Data source
- Dependencies
- Current caller
- Whether it can be used by the future Co-Founder Agent
- Whether realtime voice introduces any special requirement

Do not rebuild existing tools.

Identify which existing tools can directly be reused by the future Co-Founder.


==================================================
PHASE 6 — SECURITY AUDIT
==================================================

Review the existing system for security risks.

Inspect:

- Environment variables
- API keys
- Secrets
- Authentication
- Authorization
- Client/server secret exposure
- API endpoint protection
- Supabase RLS
- Database access
- MCP/tool authorization
- Rate limiting
- Input validation
- Output handling
- CORS
- Webhooks
- Sensitive information in logs
- Credential exposure
- Publicly accessible sensitive endpoints

If any credential or secret appears exposed, report:

- Location
- Type of credential/secret
- Severity
- Potential impact
- Recommended remediation

DO NOT rotate, delete, replace, or modify credentials during Stage 1.


==================================================
PHASE 7 — REALTIME VOICE READINESS
==================================================

DO NOT implement LiveKit during Stage 1.

Analyze the existing system's readiness for:

- LiveKit Cloud
- LiveKit Agent
- Gemini Live API
- Realtime audio streaming
- Voice sessions
- Barge-in / interruption
- Session state
- Conversation context
- Supabase memory
- MCP tool calls
- Existing Co-Founder Brain

The project already has:

- LiveKit Cloud API/credentials
- Gemini Live API credentials

Treat these as existing resources.

DO NOT create new credentials.

Determine:

- Where LiveKit should connect
- Where the LiveKit Agent should live
- How Gemini Live API should connect
- How the existing Co-Founder Brain should be called
- How Supabase memory should be accessed
- How MCP tools should be exposed to the Agent
- How authentication should work
- What frontend changes will eventually be required
- What backend/token infrastructure will eventually be required
- What realtime session state will be required
- How interruption/barge-in should interact with the existing system

Do not implement any of the above during Stage 1.


==================================================
PHASE 8 — FRONTEND READINESS
==================================================

Inspect the existing frontend for the future Co-Founder experience.

Identify:

- Current Co-Founder UI
- Current chat UI
- Conversation UI
- Authentication state
- User/session state
- Existing streaming UI
- Existing audio functionality
- Existing realtime functionality
- Reusable components
- Components requiring modification
- Components that need to be newly created

Do not modify the frontend.

Determine what can be reused for the future realtime voice interface.


==================================================
PHASE 9 — SUPABASE & DATABASE AUDIT
==================================================

Inspect:

- Tables
- Relationships
- RLS policies
- Functions
- Triggers
- Views
- Indexes
- Memory tables
- Conversation tables
- User tables
- Business data
- Analytics data
- Relevant database functions

Identify everything relevant to the Co-Founder architecture.

Document dependencies between the Co-Founder and Supabase.

Do not modify database structures or migrations.


==================================================
PHASE 10 — TESTING & DEPLOYMENT AUDIT
==================================================

Inspect existing:

- Unit tests
- Integration tests
- E2E tests
- Playwright configuration
- Build configuration
- Deployment configuration
- Environment configuration
- CI/CD
- Preview deployment workflow
- Production deployment workflow

Determine:

- Current testing coverage
- Current deployment flow
- Existing automated tests
- Missing tests
- Future testing requirements for realtime voice
- Future testing requirements for Co-Founder actions

Do not modify anything.


==================================================
PHASE 11 — GAP ANALYSIS
==================================================

After completing the audit, classify every important finding into exactly four categories.

A. EXISTING & REUSABLE

Already implemented and should be reused.

B. EXISTING BUT NEEDS MODIFICATION

Already implemented but requires changes for the final architecture.

C. MISSING — MUST IMPLEMENT

Required capability that genuinely does not currently exist.

D. OPTIONAL / FUTURE

Useful but not required for the current Co-Founder implementation.

Do not recommend rebuilding an existing working system without a concrete technical reason.

For every important item, provide evidence from the codebase.


==================================================
PHASE 12 — DEPENDENCY MAP
==================================================

Create a dependency map covering:

- Next.js frontend
- Vercel
- Backend/API
- Co-Founder Brain
- AI/model layer
- LiveKit Cloud
- LiveKit Agent
- Gemini Live API
- Supabase
- Memory
- MCP
- Tools
- Authentication
- Analytics
- External services

Clearly explain which component communicates with which other component.

Identify critical dependencies and possible bottlenecks.


==================================================
PHASE 13 — FUTURE IMPLEMENTATION IMPACT
==================================================

Without implementing anything, determine what future stages will need to implement for:

1. LiveKit Cloud integration
2. LiveKit Agent
3. Gemini Live API
4. Realtime audio streaming
5. Barge-in / interruption
6. Voice session management
7. Co-Founder Brain integration
8. Supabase Memory integration
9. MCP/tool integration
10. Proactive Intelligence
11. Business Actions
12. Engineering/Coding Co-Founder
13. Browser Testing
14. Outcome Tracking
15. Continuous Learning Loop

Only document requirements discovered from the audit.

Do not implement any of them.


==================================================
PHASE 14 — RISK REGISTER
==================================================

Create a risk register using:

| Risk | Area | Severity | Evidence | Impact | Recommended Action |

Only report risks supported by evidence from the repository.

Do not speculate.

Clearly distinguish:

- Confirmed issue
- Potential issue
- Unknown / requires verification


==================================================
PHASE 15 — EXISTING FUNCTIONALITY PROTECTION
==================================================

The existing Ruhvi system already contains working functionality.

Therefore:

- Do not replace working functionality unnecessarily.
- Do not redesign working architecture without evidence.
- Do not remove existing AI providers.
- Do not remove fallback logic.
- Do not remove rate limiting.
- Do not rebuild existing MCP tools.
- Do not rebuild existing support-ticket functionality.
- Do not create duplicate systems.
- Do not introduce unnecessary dependencies.
- Do not break existing workflows.
- Do not change existing business logic during this stage.

The objective is:

EXTEND THE EXISTING RUHVI SYSTEM SAFELY RATHER THAN REBUILDING IT FROM ZERO.


==================================================
PHASE 16 — TARGET ARCHITECTURE
==================================================

Based on the audit, propose the target Co-Founder architecture.

The target architecture should consider:

Ruhvi Co-Founder Frontend
        ↓
Next.js / Vercel
        ↓
Realtime Connection
        ↓
LiveKit Cloud
        ↓
LiveKit Agent
        ↓
Gemini Live API
        ↓
Co-Founder Brain
        ↓
 ┌────────────────┬────────────────┐
 │                │                │
Memory           MCP              Business
 │              Tools              Data
 ↓                ↓                ↓
Supabase       Existing APIs     Supabase /
                                  Services

This is a target architecture reference only.

DO NOT implement it during Stage 1.

Adjust the proposed architecture if the audit reveals a better integration path that:

- Preserves existing functionality
- Minimizes unnecessary changes
- Maintains security
- Supports realtime voice
- Supports existing Brain/Memory/MCP systems
- Is practical for the current deployment architecture


==================================================
PHASE 17 — FUTURE STAGE DEPENDENCIES
==================================================

Determine the correct implementation order for the future stages.

For every major dependency explain:

- What must exist first
- Why it must exist first
- What depends on it
- Whether it is blocking or non-blocking

Pay particular attention to:

- Existing Co-Founder Brain
- LiveKit Cloud
- Gemini Live API
- LiveKit Agent
- Supabase Memory
- MCP
- Business tools
- Authentication
- Security
- Testing
- Deployment


==================================================
PHASE 18 — FINAL STAGE 1 REPORT
==================================================

Generate ONE final Stage 1 report.

The report must contain:

## 1. Executive Summary

Briefly explain the current state of the Ruhvi AI Co-Founder.

## 2. Existing Architecture

Show the architecture discovered from the actual codebase.

## 3. Existing Capabilities

List what is already implemented and reusable.

## 4. Required Modifications

List existing components that require future changes.

## 5. Missing Capabilities

List capabilities that genuinely need to be implemented.

## 6. Security Findings

List confirmed security issues with severity and evidence.

## 7. Realtime Voice Readiness

Explain readiness for:

- LiveKit Cloud
- LiveKit Agent
- Gemini Live API
- Realtime audio
- Barge-in / interruption
- Memory
- MCP

## 8. Target Architecture

Show the proposed final architecture.

## 9. Dependency Map

Show implementation dependencies.

## 10. Future Stage Requirements

Briefly state what each future stage needs to implement.

## 11. Risks & Blockers

List important confirmed risks and blockers.

## 12. Recommended Implementation Order

Provide the safest implementation sequence based on the audit.


==================================================
CRITICAL RULES
==================================================

RULE 1 — NO CODE CHANGES

Stage 1 is strictly analysis.

DO NOT:

- Edit files
- Create implementation files
- Delete files
- Rename files
- Install packages
- Modify environment variables
- Modify database
- Modify API routes
- Modify configuration
- Modify deployment
- Modify credentials
- Modify existing workflows


RULE 2 — DO NOT GUESS

If something cannot be verified from the repository, explicitly write:

UNKNOWN — REQUIRES VERIFICATION

Never present assumptions as facts.


RULE 3 — SEARCH BEFORE DECLARING SOMETHING MISSING

Before declaring a feature missing:

1. Search the repository.
2. Inspect related files.
3. Inspect dependencies.
4. Inspect configuration.
5. Inspect API routes/services.
6. Inspect database/schema where relevant.

Only then classify it as missing.


RULE 4 — PRESERVE EXISTING SYSTEM

The goal is to build the new Co-Founder capabilities ON TOP OF THE EXISTING RUHVI SYSTEM wherever possible.

Do not rebuild existing working systems without evidence that they must be replaced.


RULE 5 — DO NOT IMPLEMENT LIVEKIT IN STAGE 1

LiveKit implementation belongs

LIVEKIT_URL=wss://ruhvi-rkkfx6qd.livekit.cloud
LIVEKIT_API_KEY=APIEmGTosWpnWBo
LIVEKIT_API_SECRET=ubzWgLqZbYEqKAr5sbZyrwj8E1AW72LFkKfsWS8lVSF

gemini key = [CONFIGURED_IN_ENV]


# STAGE 2 — REALTIME VOICE CO-FOUNDER IMPLEMENTATION
# LIVEKIT CLOUD + LIVEKIT AGENT + GEMINI LIVE API

## OBJECTIVE

Implement the realtime voice conversation layer for the Ruhvi AI Co-Founder using:

- LiveKit Cloud
- LiveKit Agent
- Gemini Live API
- Existing Ruhvi Co-Founder Brain
- Existing Supabase Memory
- Existing MCP / Tools
- Existing authentication and business logic

The goal is to allow the user to have a natural realtime voice conversation with the Ruhvi AI Co-Founder.

The system must support:

- Realtime voice input
- Realtime AI voice output
- Streaming conversation
- Natural turn-taking
- Barge-in / interruption
- Session management
- Existing Co-Founder context
- Existing memory
- Existing MCP tools
- Secure authentication
- Secure credential handling
- Graceful error handling

IMPORTANT:

Stage 1 must be treated as the source of truth for the existing codebase.

Before implementing anything in this stage, review the Stage 1 audit report and follow its findings.

Do not rebuild existing working systems unnecessarily.


==================================================
PHASE 1 — STAGE 1 FINDINGS REVIEW
==================================================

Before making any changes:

1. Read the complete Stage 1 audit report.
2. Review the existing architecture identified in Stage 1.
3. Review all identified reusable components.
4. Review all required modifications.
5. Review identified blockers.
6. Review security findings.
7. Review existing Brain, Memory, MCP and authentication architecture.

Create a short implementation plan based on the Stage 1 findings.

Do not start implementation until the plan is internally consistent with the existing architecture.


==================================================
PHASE 2 — LIVEKIT CLOUD CONFIGURATION
==================================================

Use the existing LiveKit Cloud project and credentials.

DO NOT create another LiveKit project unless the Stage 1 audit proves the existing project cannot be used.

Configure the required LiveKit environment variables securely.

Determine and configure:

- LiveKit server URL
- API key
- API secret
- Required room configuration
- Required participant configuration
- Required Agent configuration

IMPORTANT:

LiveKit API secret must NEVER be exposed to the browser/client.

Only safe public configuration may be exposed to the frontend.


==================================================
PHASE 3 — SECURE LIVEKIT TOKEN SYSTEM
==================================================

Implement a secure server-side mechanism for generating short-lived LiveKit access tokens.

The token system must:

- Run server-side
- Authenticate the user
- Identify the correct user/session
- Grant only required permissions
- Use the existing authentication system
- Never expose LiveKit API secrets to the client
- Prevent unauthorized room access
- Prevent arbitrary user impersonation

Do not create a second authentication system.

Reuse the existing Ruhvi authentication architecture wherever possible.


==================================================
PHASE 4 — LIVEKIT AGENT SETUP
==================================================

Set up the LiveKit Agent required for the Co-Founder.

The Agent must:

- Connect to LiveKit Cloud
- Join the appropriate realtime room
- Handle realtime user audio
- Communicate with Gemini Live API
- Produce realtime AI audio
- Handle conversation events
- Handle interruptions
- Maintain session context
- Integrate with the existing Co-Founder Brain

Use the deployment architecture identified during Stage 1.

Do not introduce unnecessary infrastructure.

Prefer the simplest architecture compatible with the existing Ruhvi deployment.


==================================================
PHASE 5 — GEMINI LIVE API INTEGRATION
==================================================

Use the existing Gemini Live API credentials.

DO NOT create new Gemini credentials.

Connect Gemini Live API to the LiveKit Agent.

Implement:

- Realtime input
- Realtime output
- Streaming
- Session initialization
- Model configuration
- System instructions
- Conversation context
- Error handling
- Session termination

Keep the Gemini API key server-side.

Do not expose the Gemini API key to the browser.


==================================================
PHASE 6 — CO-FOUNDER BRAIN INTEGRATION
==================================================

Connect the realtime voice layer to the existing Co-Founder Brain.

The realtime voice interface must NOT create a separate intelligence system.

The intended architecture is:

User Voice
   ↓
LiveKit
   ↓
LiveKit Agent
   ↓
Gemini Live
   ↓
Existing Co-Founder Brain
   ↓
Existing Context / Memory / Tools
   ↓
Response
   ↓
Gemini Live
   ↓
LiveKit
   ↓
User Voice

Reuse the existing:

- System instructions
- Business context
- AI orchestration
- Decision logic
- Tool selection
- Existing business rules

Do not duplicate Brain logic inside the Agent.


==================================================
PHASE 7 — MEMORY INTEGRATION
==================================================

Connect the realtime conversation system with the existing Supabase memory architecture.

The Co-Founder should be able to use relevant existing context during a voice session.

Determine the appropriate separation between:

- Session context
- Conversation history
- Short-term memory
- Long-term memory
- Business context

Do not create duplicate memory systems if the existing system can be reused.

Ensure memory operations do not unnecessarily block realtime audio.


==================================================
PHASE 8 — MCP & TOOL INTEGRATION
==================================================

Make existing MCP/tools available to the realtime Co-Founder where appropriate.

The Agent must be able to use existing tools without rebuilding them.

Implement the required tool flow:

User request
   ↓
Co-Founder reasoning
   ↓
Tool selection
   ↓
Existing MCP/tool
   ↓
Tool result
   ↓
Co-Founder response
   ↓
Realtime voice output

Maintain existing:

- Authentication
- Authorization
- Validation
- Tool permissions
- Error handling
- Business rules


==================================================
PHASE 9 — FRONTEND REALTIME VOICE UI
==================================================

Integrate LiveKit into the existing Co-Founder frontend.

Do not replace the existing UI unnecessarily.

Create or modify only the components required for realtime voice interaction.

The UI should support:

- Start conversation
- Stop conversation
- Microphone permission
- Connection status
- Connecting state
- Connected state
- Speaking state
- Listening state
- AI speaking state
- Error state
- Reconnecting state
- Session ended state

If an existing chat interface is present, preserve it.

The voice experience should integrate naturally with the existing Co-Founder interface.


==================================================
PHASE 10 — REALTIME STREAMING
==================================================

Implement realtime audio streaming.

Verify:

- User microphone → LiveKit
- LiveKit → Agent
- Agent → Gemini Live
- Gemini Live → Agent
- Agent → LiveKit
- LiveKit → User speaker

The system should not depend on waiting for a complete response before beginning playback.

Audio should stream progressively.


==================================================
PHASE 11 — BARGE-IN / INTERRUPTION
==================================================

Implement natural interruption behavior.

Required behavior:

When the AI is speaking and the user starts speaking:

1. Detect user speech.
2. Stop or interrupt AI output appropriately.
3. Prioritize the user's new input.
4. Continue the conversation naturally.

The system must not continue talking over the user unnecessarily.

Test multiple interruption scenarios.


==================================================
PHASE 12 — SESSION MANAGEMENT
==================================================

Implement reliable realtime session handling.

Handle:

- Session creation
- Room creation/joining
- User identity
- Agent identity
- Session state
- Conversation state
- Disconnect
- Reconnect
- Session timeout
- User ending session
- Agent ending session
- Unexpected disconnect

Ensure stale sessions do not remain active indefinitely.


==================================================
PHASE 13 — AUTHENTICATION & AUTHORIZATION
==================================================

Integrate realtime voice with existing Ruhvi authentication.

Verify:

- Only authenticated users can access protected Co-Founder functionality.
- Users receive only authorized LiveKit permissions.
- Users cannot impersonate another user.
- Users cannot access another user's conversation/session.
- Tool calls remain authorized.
- Memory access remains user-scoped.
- Business data remains properly protected.

Do not bypass existing authorization.


==================================================
PHASE 14 — ERROR & FALLBACK HANDLING
==================================================

Implement graceful handling for:

- LiveKit connection failure
- Agent failure
- Gemini API failure
- Gemini session failure
- Authentication failure
- Token failure
- Microphone permission failure
- Network interruption
- Tool failure
- Memory failure
- Unexpected Agent disconnect

The user should receive a useful UI state instead of a silent failure.

Where existing Ruhvi fallback logic is applicable, reuse it.

Do not create conflicting fallback systems.


==================================================
PHASE 15 — SECURITY REVIEW
==================================================

After implementation, verify:

- LiveKit API secret is server-only.
- Gemini API key is server-only.
- Tokens are short-lived.
- Token permissions are minimal.
- Authentication is enforced.
- User identity is verified server-side.
- Rooms cannot be accessed arbitrarily.
- MCP tools cannot be called without authorization.
- Memory cannot be accessed across users.
- Sensitive information is not exposed to the browser.
- Sensitive credentials are not logged.
- Client-side environment variables contain no secrets.

Fix only security issues introduced or required by this Stage.

Do not perform unrelated security refactoring.


==================================================
PHASE 16 — REALTIME PERFORMANCE
==================================================

Test the realtime conversation experience.

Check:

- Connection latency
- Time to first audio
- Audio continuity
- Interruption response
- Reconnection behavior
- Agent responsiveness
- Memory retrieval impact
- Tool execution impact
- Network interruption behavior

Identify obvious bottlenecks.

Do not prematurely optimize without evidence.


==================================================
PHASE 17 — TESTING
==================================================

Test the complete realtime flow.

Minimum test scenarios:

1. User connects successfully.
2. Microphone permission works.
3. User speaks.
4. AI responds with realtime voice.
5. User interrupts AI.
6. AI stops appropriately.
7. User continues conversation.
8. Existing Co-Founder context is available.
9. Existing memory is available.
10. Existing MCP tools work.
11. Unauthorized user is rejected.
12. Invalid/expired token is rejected.
13. Gemini failure is handled.
14. LiveKit failure is handled.
15. Network interruption is handled.
16. User disconnects cleanly.
17. Agent disconnects cleanly.
18. Session can be started again.

Use existing testing infrastructure where possible.


==================================================
PHASE 18 — END-TO-END VERIFICATION
==================================================

Perform an end-to-end verification:

User
 ↓
Ruhvi Frontend
 ↓
Authentication
 ↓
Secure LiveKit Token
 ↓
LiveKit Cloud
 ↓
LiveKit Agent
 ↓
Gemini Live API
 ↓
Co-Founder Brain
 ↓
Supabase Memory / MCP / Tools
 ↓
Co-Founder Response
 ↓
Gemini Live
 ↓
LiveKit
 ↓
Ruhvi Frontend
 ↓
User Voice

Verify every important connection.

Confirm that no existing critical functionality was broken.


==================================================
PHASE 19 — IMPLEMENTATION REPORT
==================================================

After implementation, generate a Stage 2 report containing:

## 1. What Was Implemented

List every actual implementation completed.

## 2. Files Changed

List files created or modified.

For each file explain briefly why it changed.

## 3. LiveKit Configuration

Document the implemented LiveKit architecture.

## 4. Gemini Live Integration

Document how Gemini Live is connected.

## 5. Agent Architecture

Document the LiveKit Agent implementation.

## 6. Co-Founder Brain Integration

Explain how the existing Brain is reused.

## 7. Memory Integration

Explain how Supabase memory is connected.

## 8. MCP / Tool Integration

Explain how existing tools are accessed.

## 9. Frontend Voice Experience

Document the implemented UI.

## 10. Security

Document the security controls implemented.

## 11. Error Handling

Document failure and fallback behavior.

## 12. Testing Results

Document:

- Passed
- Failed
- Blocked
- Not Tested

Do not hide failures.

## 13. Known Issues

List unresolved issues.

## 14. Stage 3 Dependencies

List everything Stage 3 will depend on from Stage 2.


==================================================
CRITICAL RULES
==================================================

RULE 1 — REUSE EXISTING SYSTEMS

Do not rebuild:

- Co-Founder Brain
- Existing Memory
- Existing MCP tools
- Existing authentication
- Existing support-ticket system
- Existing fallback logic
- Existing rate limiting

unless Stage 1 explicitly determined that modification/replacement is required.


RULE 2 — DO NOT EXPOSE SECRETS

Never expose:

- LiveKit API secret
- Gemini API key
- Supabase service-role key
- Any other server-side credential

to the browser or client bundle.


RULE 3 — NO UNNECESSARY INFRASTRUCTURE

Do not create a dedicated VM/server if the audited architecture can support the implementation without one.

Use:

- Vercel where appropriate
- LiveKit Cloud for realtime infrastructure
- Existing Ruhvi infrastructure
- Existing Supabase infrastructure

unless Stage 1 identifies a technical reason otherwise.


RULE 4 — PRESERVE EXISTING FUNCTIONALITY

Do not break existing:

- Chat
- AI providers
- Fallback
- Rate limiting
- Support tickets
- MCP tools
- Authentication
- Memory
- Business functionality


RULE 5 — NO UNRELATED REFACTORING

Do not use this stage as an opportunity to:

- Rewrite unrelated code
- Rename unrelated files
- Upgrade unrelated dependencies
- Redesign unrelated UI
- Refactor unrelated architecture


RULE 6 — VERIFY BEFORE DECLARING SUCCESS

Do not say that a feature works unless it has actually been tested.

Use:

- PASS
- FAIL
- BLOCKED
- NOT TESTED

where appropriate.


==================================================
STAGE 2 COMPLETION CRITERIA
==================================================

Stage 2 is complete only when:

[ ] LiveKit Cloud is integrated.
[ ] Secure LiveKit token generation works.
[ ] LiveKit Agent is operational.
[ ] Gemini Live API is connected.
[ ] Realtime voice input works.
[ ] Realtime voice output works.
[ ] Streaming works.
[ ] Barge-in/interruption works.
[ ] Session management works.
[ ] Existing Co-Founder Brain is integrated.
[ ] Existing Supabase Memory is integrated.
[ ] Existing MCP/tools are integrated where required.
[ ] Existing authentication is preserved.
[ ] Security requirements are satisfied.
[ ] Error handling is implemented.
[ ] Frontend voice UI works.
[ ] End-to-end realtime flow is verified.
[ ] Existing critical functionality remains working.
[ ] Tests have been performed.
[ ] Known issues are documented.
[ ] Stage 2 report is generated.


==================================================
FINAL INSTRUCTION
==================================================

COMPLETE STAGE 2 ONLY.

Use the Stage 1 audit as the source of truth.

Implement the realtime voice Co-Founder layer using:

LiveKit Cloud
+
LiveKit Agent
+
Gemini Live API
+
Existing Co-Founder Brain
+
Existing Supabase Memory
+
Existing MCP / Tools

Do not rebuild existing working systems.

Do not make unrelated changes.

Do not expose credentials.

Do not automatically start Stage 3.

After completing Stage 2 and generating the final report:

STOP.

WAIT FOR EXPLICIT APPROVAL BEFORE STARTING STAGE 3.

# STAGE 3 — CO-FOUNDER BRAIN, MEMORY & BUSINESS CONTEXT

## OBJECTIVE

Build and integrate the core intelligence/context layer of the Ruhvi AI Co-Founder on top of the existing system.

The objective is to ensure that the Co-Founder does not behave like a generic AI assistant.

It must understand:

- Ruhvi
- The user's role and permissions
- Ruhvi's business context
- Relevant business data
- Previous conversations
- Important long-term memory
- Current session context
- Existing tools and capabilities
- What it is allowed to do
- When it should ask for approval
- When it should take an action
- When it should report uncertainty

Stage 1 audit and Stage 2 implementation are the source of truth.

Do not rebuild systems that already exist.

Do not create duplicate memory, authentication, MCP, or AI orchestration systems unless the audit proves they are required.


==================================================
PHASE 1 — EXISTING BRAIN REVIEW
==================================================

Review the Co-Founder Brain identified in Stage 1.

Document:

- Current Brain architecture
- System instructions
- Context construction
- Model interaction
- Decision logic
- Tool selection
- Existing business rules
- Existing guardrails
- Existing fallback logic
- Existing memory usage

Determine what is already sufficient and what requires modification.

Do not rewrite the Brain unnecessarily.


==================================================
PHASE 2 — CO-FOUNDER IDENTITY & ROLE
==================================================

Define the Co-Founder identity within the existing architecture.

The Co-Founder should understand that it is an AI business partner for Ruhvi, not a generic chatbot.

Establish appropriate:

- Role
- Responsibilities
- Scope
- Business context
- Communication behavior
- Decision boundaries
- Tool permissions
- Approval boundaries

Do not create unrealistic claims about actions it cannot actually perform.


==================================================
PHASE 3 — BUSINESS CONTEXT LAYER
==================================================

Identify and integrate the relevant Ruhvi business context.

Where available, understand:

- Products
- Customers
- Orders
- Sales
- Revenue
- Inventory
- Support
- Marketing
- Content
- Business operations
- Existing analytics
- Business goals
- Relevant configuration

Use existing Supabase/business data.

Do not duplicate business data unnecessarily.

The Brain should receive only relevant context rather than loading the entire database into every conversation.


==================================================
PHASE 4 — SHORT-TERM SESSION CONTEXT
==================================================

Implement or improve session context handling.

The Co-Founder must maintain awareness of the current conversation.

Track where appropriate:

- Current topic
- Current task
- Recent user statements
- Pending actions
- Tool results
- Decisions made during the session
- Approval state
- Current business context

Ensure the context does not grow indefinitely.

Use appropriate summarization or compaction where required.


==================================================
PHASE 5 — LONG-TERM MEMORY
==================================================

Use the existing Supabase memory architecture.

Identify what should become long-term memory.

Examples may include:

- Important business decisions
- Stable preferences
- Important project context
- Recurring workflows
- Previously established requirements
- Relevant strategic information

Do NOT store every conversation message as permanent memory.

Implement appropriate memory classification and retention behavior.


==================================================
PHASE 6 — MEMORY RETRIEVAL
==================================================

Implement or improve intelligent memory retrieval.

When the user asks something, retrieve relevant memories rather than loading all historical memory.

Memory retrieval should consider:

- Current query
- Current task
- User context
- Business context
- Recency
- Relevance

Avoid irrelevant memory injection.

Avoid excessive context that could reduce model performance.


==================================================
PHASE 7 — MEMORY WRITE POLICY
==================================================

Define when the Co-Founder should write information to long-term memory.

Memory should be stored when information is:

- Important
- Stable
- Reusable
- Relevant to future Co-Founder interactions

Avoid storing:

- Temporary conversation noise
- Every casual statement
- Duplicate information
- Sensitive information without a legitimate requirement
- Unverified assumptions

Where possible, preserve the source/context of important memories.


==================================================
PHASE 8 — MEMORY CORRECTION
==================================================

The Co-Founder must be able to handle changing information.

If new verified information conflicts with old memory:

- Do not blindly preserve both.
- Identify the newer verified information.
- Update or supersede outdated memory appropriately.
- Avoid silently treating contradictory information as simultaneously true.

Do not delete important historical information unless the existing memory policy permits it.


==================================================
PHASE 9 — CONTEXT PRIORITIZATION
==================================================

Create a clear priority model for context.

The Brain should distinguish between:

1. Current user request
2. Current conversation context
3. Verified business data
4. Relevant long-term memory
5. Existing system instructions
6. Tool results
7. Lower-priority historical context

Do not allow irrelevant memory to override verified current information.


==================================================
PHASE 10 — DATA FRESHNESS
==================================================

For dynamic business information, prefer current database/tool results over stale memory.

Examples:

- Current inventory
- Current order status
- Current sales
- Current customer information
- Current product information
- Current operational status

Memory may provide historical context, but current business data should come from the appropriate live source.


==================================================
PHASE 11 — TOOL-AWARE INTELLIGENCE
==================================================

Ensure the Brain knows when it needs a tool.

The Co-Founder should distinguish between:

- Information already available in context
- Information available through memory
- Information requiring a live database query
- Information requiring an MCP tool
- Actions requiring an external service

Do not hallucinate business data when a tool can provide the actual answer.


==================================================
PHASE 12 — UNCERTAINTY HANDLING
==================================================

The Co-Founder must not present assumptions as confirmed facts.

When information is unavailable:

- Say what is known.
- Say what is unknown.
- Use the appropriate tool when available.
- Ask the user when necessary.

Do not invent:

- Business numbers
- Customer information
- Product information
- Operational events
- Tool results
- Completed actions


==================================================
PHASE 13 — APPROVAL BOUNDARIES
==================================================

Establish the distinction between:

### READ ACTIONS

Actions that only retrieve information.

### LOW-RISK ACTIONS

Actions that can safely be performed automatically if existing permissions allow.

### HIGH-IMPACT ACTIONS

Actions that require explicit user approval.

Examples of potentially high-impact actions include:

- Sending external communications
- Publishing content
- Changing important business settings
- Deleting data
- Financially consequential actions
- Irreversible actions

Use the existing authorization system.

Do not create a new permission system unless necessary.


==================================================
PHASE 14 — VOICE CONTEXT INTEGRATION
==================================================

Integrate the Brain with the realtime voice system implemented in Stage 2.

The voice interface must use the same Co-Founder intelligence layer as other interfaces.

The architecture should remain:

Voice
 ↓
LiveKit
 ↓
LiveKit Agent
 ↓
Gemini Live
 ↓
Co-Founder Brain
 ↓
Memory / Business Context / MCP
 ↓
Co-Founder Response

Do not create a separate "voice Brain."


==================================================
PHASE 15 — MULTI-MODAL / TEXT COMPATIBILITY
==================================================

If the existing system supports text conversation, ensure that text and voice can use the same underlying Co-Founder Brain.

The user should not receive completely different intelligence depending only on whether they type or speak.

Reuse:

- Context
- Memory
- Tools
- Business rules
- Permissions
- Decision logic


==================================================
PHASE 16 — CONTEXT SECURITY
==================================================

Verify that context passed to the model does not accidentally expose:

- Another user's data
- Unauthorized business information
- Secrets
- API keys
- Internal credentials
- Sensitive database information
- Tool credentials

Apply existing authentication and authorization.

Keep server-side secrets server-side.


==================================================
PHASE 17 — TESTING
==================================================

Test the Brain and memory system with scenarios including:

1. New user conversation.
2. Returning user conversation.
3. Relevant long-term memory retrieval.
4. Irrelevant memory exclusion.
5. Current database information overriding stale memory.
6. Important information being saved.
7. Temporary information not being saved unnecessarily.
8. Memory correction.
9. Tool-required question.
10. Unknown information.
11. Conflicting information.
12. Approval-required action.
13. Unauthorized action.
14. Voice conversation using the same Brain.
15. Text conversation using the same Brain, if supported.
16. Long conversation/context management.
17. Session restart.
18. Multiple sessions for the same user.


==================================================
PHASE 18 — PERFORMANCE & CONTEXT EFFICIENCY
==================================================

Check:

- Memory retrieval latency
- Database query latency
- Context size
- Token usage
- Realtime voice responsiveness
- Tool latency
- Duplicate retrieval
- Unnecessary context injection

Optimize only where evidence shows a problem.

Do not introduce unnecessary complexity.


==================================================
PHASE 19 — FINAL VERIFICATION
==================================================

Verify the complete intelligence flow:

User
 ↓
Conversation / Voice
 ↓
Co-Founder Brain
 ↓
Current Context
 ↓
Relevant Memory
 ↓
Current Business Data
 ↓
MCP / Tools when required
 ↓
Reasoning / Response
 ↓
User

Confirm that:

- Existing functionality remains intact.
- Existing memory is preserved.
- Existing MCP tools remain functional.
- Existing authentication remains intact.
- Voice and text use the same core intelligence where applicable.
- Current business data is not replaced by stale memory.
- The Co-Founder does not invent unavailable information.


==================================================
PHASE 20 — FINAL STAGE 3 REPORT
==================================================

Generate a complete Stage 3 report containing:

## 1. Brain Architecture

What exists and what was implemented/modified.

## 2. Business Context

How business context is supplied to the Co-Founder.

## 3. Memory Architecture

How short-term and long-term memory work.

## 4. Memory Retrieval

How relevant memory is selected.

## 5. Memory Write Policy

When information becomes long-term memory.

## 6. Memory Correction

How outdated/conflicting memory is handled.

## 7. Context Prioritization

How different context sources are prioritized.

## 8. Tool Awareness

How the Brain decides when tools are required.

## 9. Approval Boundaries

How read, low-risk, and high-impact actions are handled.

## 10. Voice Integration

How the Stage 2 realtime layer uses the Brain.

## 11. Security

Security verification results.

## 12. Testing Results

For each test:

- PASS
- FAIL
- BLOCKED
- NOT TESTED

## 13. Known Issues

List unresolved issues.

## 14. Stage 4 Dependencies

List everything the next stage depends on.


==================================================
CRITICAL RULES
==================================================

1. DO NOT rebuild the existing Brain unnecessarily.

2. DO NOT create a duplicate memory system.

3. DO NOT duplicate business data.

4. DO NOT bypass existing authentication.

5. DO NOT bypass existing MCP authorization.

6. DO NOT expose secrets.

7. DO NOT treat stale memory as current business truth.

8. DO NOT hallucinate unavailable business data.

9. DO NOT automatically execute high-impact actions without the required approval.

10. DO NOT make unrelated refactors.

11. DO NOT break existing functionality.

12. Do not claim a feature works unless it has been tested.


==================================================
STAGE 3 COMPLETION CRITERIA
==================================================

[ ] Existing Co-Founder Brain reviewed.
[ ] Brain architecture implemented/updated where required.
[ ] Business context integrated.
[ ] Session context implemented/verified.
[ ] Long-term memory implemented/verified.
[ ] Memory retrieval implemented/verified.
[ ] Memory write policy implemented/verified.
[ ] Memory correction handled.
[ ] Context prioritization verified.
[ ] Current data vs stale memory behavior verified.
[ ] Tool awareness verified.
[ ] Approval boundaries verified.
[ ] Voice integration verified.
[ ] Authentication preserved.
[ ] Security verified.
[ ] Performance checked.
[ ] Tests completed.
[ ] Known issues documented.
[ ] Final Stage 3 report generated.


==================================================
FINAL INSTRUCTION
==================================================

COMPLETE STAGE 3 ONLY.

Use the Stage 1 audit and Stage 2 implementation as the source of truth.

Implement only what is required for this stage.

Preserve all existing working functionality.

Do not automatically start Stage 4.

After completing Stage 3 and generating the final report:

STOP.

WAIT FOR EXPLICIT APPROVAL BEFORE STARTING STAGE 4.

# STAGE 4 — ANALYTICS & BUSINESS INTELLIGENCE
## RUHVI AI CO-FOUNDER

---

## OBJECTIVE

Build and integrate the Analytics & Business Intelligence layer of the Ruhvi AI Co-Founder.

The goal is to enable the Co-Founder to understand Ruhvi's actual business data and answer questions such as:

- How is the business performing?
- What changed recently?
- What are the important trends?
- Which products/services are performing well or poorly?
- What customer behavior is changing?
- What areas require attention?
- Are there unusual or unexpected changes?
- What business insights can be derived from multiple data sources?
- What actions or decisions may be worth considering?

The Co-Founder must use REAL Ruhvi data whenever available.

Do NOT create fake/demo business data to make the system appear functional.

First inspect the existing system and reuse existing analytics, database queries, dashboards, APIs, services, and business data pipelines wherever possible.

Do NOT create duplicate analytics systems unnecessarily.

---

# CRITICAL EXECUTION RULE

This is STAGE 4 ONLY.

Complete only the work defined in this stage.

Do NOT automatically continue to Stage 5.

After completing this stage:

1. Verify the implementation.
2. Generate the Stage 4 final report.
3. Clearly list completed work, modified files, tests, issues, risks, and remaining work.
4. STOP.
5. Wait for explicit approval before starting Stage 5.

---

# PHASE 1 — REVIEW STAGE 3 OUTPUT

Before making changes:

1. Read the final Stage 3 report.
2. Review all relevant Stage 3 implementation changes.
3. Understand:
   - Co-Founder Brain
   - Business Context Layer
   - Session Context
   - Long-Term Memory
   - Memory Retrieval
   - Memory Write Policy
   - Tool Integration
   - Approval Boundaries
   - Authentication
   - Authorization
4. Identify which parts are already capable of consuming business analytics data.
5. Reuse existing interfaces wherever possible.

Do not duplicate functionality already implemented in Stage 3.

---

# PHASE 2 — EXISTING ANALYTICS AUDIT

Inspect the entire codebase for existing analytics functionality.

Search for:

- Analytics dashboards
- Business dashboards
- KPI calculations
- Reports
- Metrics
- Statistics
- Charts
- Revenue calculations
- Sales calculations
- Customer analytics
- Product analytics
- Order analytics
- Support analytics
- Marketing analytics
- Traffic analytics
- Conversion metrics
- Database aggregation queries
- Reporting APIs
- Admin analytics APIs
- Existing analytics services
- Existing scheduled reports
- Existing data aggregation jobs
- Existing third-party analytics integrations

Determine:

A. Existing and reusable

B. Existing but needs modification

C. Missing and must be implemented

D. Optional/future functionality

Do not rebuild existing analytics unnecessarily.

---

# PHASE 3 — BUSINESS DATA SOURCE MAPPING

Identify all available business data sources.

Inspect the actual database schema, APIs, services, and existing application logic.

Map relevant sources such as:

- Users
- Customers
- Orders
- Products
- Transactions
- Payments
- Revenue
- Subscriptions
- Leads
- Support tickets
- Conversations
- Usage
- Marketing data
- Website activity
- Product performance
- Inventory data
- Other business-specific entities discovered in the system

Do not assume that any of these exist.

Only use data sources that actually exist.

For every important source, document:

- Source
- Database table/API/service
- Important fields
- Relationships
- Data freshness
- Access permissions
- Existing queries/services
- Whether it can safely be exposed to the Co-Founder

---

# PHASE 4 — DATA NORMALIZATION

Review whether analytics data from different sources uses consistent definitions.

Identify issues such as:

- Different naming conventions
- Different date formats
- Duplicate metrics
- Different revenue definitions
- Different customer identifiers
- Different product identifiers
- Missing relationships
- Inconsistent status values
- Timezone inconsistencies
- Currency inconsistencies
- Duplicate aggregation logic

Create shared metric definitions where necessary.

Avoid creating multiple conflicting definitions of the same business metric.

For example:

If "revenue" already has an official definition in Ruhvi, reuse it instead of creating another independent calculation.

---

# PHASE 5 — CORE KPI LAYER

Implement or improve a reusable KPI layer based on actual available Ruhvi data.

Potential KPI categories include:

### Business

- Revenue
- Orders
- Customers
- Active users
- Growth
- Conversion
- Retention
- Churn
- Average order value
- Customer lifetime value

### Product

- Product performance
- Product usage
- Product adoption
- Product conversion
- Product-level revenue

### Customer

- New customers
- Returning customers
- Customer activity
- Customer segments
- Customer retention

### Support

- Support volume
- Ticket status
- Resolution time
- Common issues
- Escalations

### Marketing

- Traffic
- Leads
- Conversion
- Campaign performance
- Acquisition sources

Only implement metrics for which reliable underlying data actually exists.

Do not create meaningless KPIs simply to increase the number of metrics.

---

# PHASE 6 — TIME-BASED ANALYTICS

Enable the Co-Founder to analyze metrics across time.

Support relevant periods such as:

- Today
- Yesterday
- Last 7 days
- Last 30 days
- Current month
- Previous month
- Current quarter
- Previous quarter
- Custom date ranges

Where appropriate, support comparisons such as:

- Current vs previous period
- Current vs historical average
- Current vs previous month
- Current vs previous year

Do not claim a comparison is statistically meaningful if insufficient historical data exists.

---

# PHASE 7 — TREND DETECTION

Implement reusable trend analysis.

The system should be able to identify meaningful changes such as:

- Increasing metrics
- Decreasing metrics
- Stable metrics
- Sudden changes
- Persistent changes
- Short-term spikes
- Short-term drops

The Co-Founder should be able to explain:

1. What changed?
2. By how much?
3. Over what period?
4. Compared with what baseline?
5. Which data supports the observation?

Do not invent explanations for why a metric changed.

If the cause cannot be established from available data, explicitly state that the cause is unknown or requires investigation.

---

# PHASE 8 — ANOMALY DETECTION

Implement anomaly detection where appropriate and where sufficient historical data exists.

Potential anomalies:

- Unexpected revenue drop
- Unexpected revenue spike
- Unusual order volume
- Unusual customer activity
- Unusual support volume
- Unexpected conversion change
- Abnormal product behavior
- Unexpected system/business metric changes

The system must distinguish between:

- Confirmed anomaly
- Possible anomaly
- Normal variation

Do not generate false certainty.

If insufficient historical data exists, report that anomaly detection is not yet reliable for that metric.

---

# PHASE 9 — CROSS-DATASET ANALYSIS

Allow the Co-Founder to correlate multiple business data sources where relationships actually exist.

Examples:

- Revenue + orders
- Orders + customers
- Product usage + revenue
- Customer activity + retention
- Support tickets + product usage
- Marketing leads + conversions
- Traffic + conversions

The system should identify correlations or relationships supported by the available data.

Do NOT claim causation merely because two metrics move together.

For example:

Do not say:

"Marketing campaign X caused revenue to increase."

unless the system has reliable evidence establishing that relationship.

Instead, distinguish:

- Observed relationship
- Correlation
- Supported causal evidence
- Unknown cause

---

# PHASE 10 — BUSINESS INSIGHT GENERATION

Integrate analytics with the Co-Founder Brain.

The Co-Founder should be able to transform raw metrics into understandable business insights.

For example:

User:

"How is Ruhvi doing this month?"

The system should be capable of retrieving relevant actual metrics and presenting:

- Current performance
- Important changes
- Relevant trends
- Potential concerns
- Supporting data
- Areas worth investigating

Do not overwhelm the user with unnecessary metrics.

Prioritize information based on:

- User question
- Business context
- Importance
- Recency
- Data confidence

---

# PHASE 11 — EXPLANATION & EVIDENCE

Every important generated insight should have traceable supporting data.

The system should be able to determine:

- Which metric produced the insight
- Which data source was used
- Date/time range
- Comparison baseline
- Calculation performed
- Confidence/limitations where relevant

The Co-Founder should not present unsupported assumptions as facts.

---

# PHASE 12 — ANALYTICS TOOL / MCP INTEGRATION

Review the existing MCP and tool architecture.

If analytics tools already exist:

- Reuse them.
- Improve them only where required.
- Connect them to the Co-Founder Brain.

If analytics capabilities are missing:

Implement only the minimum required tools.

Possible tool categories:

- Query KPI
- Query metric
- Query historical metric
- Compare periods
- Get trends
- Detect anomalies
- Analyze product performance
- Analyze customer performance
- Analyze support performance
- Generate business report

Every tool must:

- Respect authentication.
- Respect authorization.
- Validate inputs.
- Limit query scope.
- Prevent unauthorized data access.
- Return structured results.
- Handle errors safely.

---

# PHASE 13 — REAL-TIME / FRESHNESS HANDLING

Analytics must respect data freshness.

Determine whether each metric is:

- Real-time
- Near-real-time
- Periodically updated
- Historical/static

The Co-Founder must not present stale data as current.

Where appropriate, include:

- Last updated timestamp
- Data freshness status
- Query timestamp

If live data cannot be retrieved, clearly communicate the limitation.

---

# PHASE 14 — VOICE CO-FOUNDER INTEGRATION

Integrate the Analytics layer with the Stage 2 realtime voice system.

The voice Co-Founder should be able to answer analytics questions naturally.

Examples:

"How much revenue did we make this month?"

"What's changed compared to last month?"

"Which product is performing the best?"

"Why did sales drop?"

"Are there any unusual changes?"

For voice responses:

- Keep answers concise by default.
- Speak important numbers clearly.
- Offer deeper details when requested.
- Avoid reading large tables aloud.
- Ask clarification when the requested metric or timeframe is ambiguous.

---

# PHASE 15 — TEXT / NON-VOICE INTEGRATION

Ensure the same analytics intelligence works through existing text/chat interfaces where applicable.

Analytics logic must NOT be duplicated separately for voice and text.

Use a shared analytics/business intelligence layer.

Voice and text should consume the same underlying data and business intelligence services.

---

# PHASE 16 — PERMISSION & DATA SECURITY

Perform a complete analytics security review.

Ensure:

- Users only access authorized business data.
- Admin-only information remains protected.
- Sensitive customer information is not unnecessarily exposed.
- Database Row Level Security is respected where applicable.
- Existing authentication is reused.
- Existing authorization is reused.
- MCP/tool authorization cannot be bypassed.
- Analytics APIs cannot expose unrestricted database queries.
- User input cannot manipulate protected queries.
- Secrets are never exposed to the client.

Do NOT weaken existing security controls for analytics convenience.

---

# PHASE 17 — PERFORMANCE & QUERY EFFICIENCY

Review analytics query performance.

Look for:

- Expensive queries
- Unnecessary full-table scans
- Repeated calculations
- Duplicate aggregation logic
- Excessive database requests
- Large response payloads
- Slow dashboard/API requests

Where necessary, use appropriate:

- Query optimization
- Indexes
- Aggregation
- Caching
- Pagination
- Materialized/summary data

Do not introduce unnecessary infrastructure.

Any optimization must preserve correctness.

---

# PHASE 18 — FAILURE & DATA QUALITY HANDLING

Handle situations such as:

- Missing data
- Partial data
- Database errors
- API failures
- Timeout
- Empty results
- Insufficient historical data
- Conflicting data
- Stale data
- Invalid date ranges

The Co-Founder must respond honestly.

Examples:

Instead of:

"Revenue dropped because customers stopped buying."

Use:

"The available data shows revenue decreased 18% compared with the previous period. I don't have enough evidence to determine the exact cause."

---

# PHASE 19 — TESTING

Create and execute appropriate tests for the analytics layer.

Test:

### Data correctness

- KPI calculations
- Aggregations
- Date ranges
- Period comparisons
- Historical calculations

### Business logic

- Trend detection
- Anomaly detection
- Cross-dataset analysis
- Insight generation

### Security

- Authorization
- Unauthorized data access
- API validation
- MCP/tool permissions

### Integration

- Brain → Analytics
- Analytics → MCP/tools
- Analytics → Supabase
- Analytics → Voice
- Analytics → Text

### Failure handling

- Missing data
- Database failures
- API failures
- Empty results
- Insufficient history

Do not mark tests as passed without actually running them.

---

# PHASE 20 — END-TO-END VERIFICATION

Perform a real end-to-end verification.

Verify that a user can:

1. Authenticate.
2. Start the Co-Founder.
3. Ask a business analytics question.
4. Co-Founder identifies the required metric/data.
5. Correct analytics tool/service is called.
6. Authorized real data is retrieved.
7. Analytics are calculated correctly.
8. Brain interprets the result.
9. Co-Founder provides an understandable answer.
10. Voice and/or text interface receives the answer correctly.

Verify multiple analytics scenarios.

Do not use fake success responses.

---

# PHASE 21 — REGRESSION CHECK

Before finishing Stage 4, verify that existing Ruhvi functionality has not been broken.

Pay special attention to:

- Existing authentication
- Existing chatbot
- Existing AI providers
- Existing fallback system
- Existing rate limits
- Existing support-ticket system
- Existing MCP tools
- Existing database functionality
- Existing dashboards
- Existing APIs
- Existing frontend functionality
- Existing realtime voice functionality from Stage 2
- Existing Brain and memory functionality from Stage 3

Do not perform unrelated refactoring.

---

# PHASE 22 — FINAL STAGE 4 REPORT

Create a detailed Stage 4 report containing:

## 1. Executive Summary

What was implemented.

## 2. Existing Analytics Reused

List existing systems that were reused.

## 3. New Analytics Capabilities

List only newly implemented capabilities.

## 4. Data Sources

List actual data sources used.

## 5. KPI Definitions

Document important metrics and their definitions.

## 6. Business Intelligence Layer

Explain how analytics are connected to the Co-Founder Brain.

## 7. MCP / Tool Integration

Document analytics tools and their permissions.

## 8. Voice Integration

Document how analytics work through realtime voice.

## 9. Security

Document authentication, authorization, and data protection.

## 10. Performance

Document query/performance optimizations.

## 11. Tests

Report:

- Tests executed
- Passed
- Failed
- Known limitations

## 12. Files Changed

List every modified/created file and why.

## 13. Existing Functionality Verification

Confirm what was checked for regressions.

## 14. Known Issues

Clearly list unresolved issues.

## 15. Risks

List remaining technical/business risks.

## 16. Stage 5 Dependencies

Clearly identify what Stage 5 will depend on.

---

# CRITICAL RULES

1. Do NOT create fake business data.
2. Do NOT invent metrics.
3. Do NOT assume database tables exist.
4. Search the codebase before declaring something missing.
5. Reuse existing analytics/data services wherever possible.
6. Do NOT create duplicate analytics pipelines unnecessarily.
7. Reuse the existing Co-Founder Brain.
8. Reuse existing Supabase infrastructure.
9. Reuse existing MCP/tool architecture.
10. Respect existing authentication and authorization.
11. Never expose secrets.
12. Never bypass Row Level Security or equivalent controls.
13. Do not confuse correlation with causation.
14. Do not invent explanations for unexplained business changes.
15. Do not present stale data as current.
16. Do not claim an anomaly when there is insufficient historical evidence.
17. Do not modify unrelated features.
18. Do not perform unnecessary refactoring.
19. Do not replace working architecture without a documented reason.
20. Do not create a new infrastructure/VM unless absolutely required and justified.
21. Verify every important change through actual testing.
22. Never claim something works if it was not tested.
23. Preserve all existing working functionality.
24. Follow the existing project's coding conventions and architecture.
25. Complete ONLY Stage 4.
26. STOP after the Stage 4 report.
27. WAIT for explicit approval before starting Stage 5.

---

# FINAL INSTRUCTION

Execute STAGE 4 only.

First inspect the existing system and Stage 3 output.

Then implement the Analytics & Business Intelligence layer using real Ruhvi data and existing infrastructure wherever possible.

Do not guess.

Do not invent.

Do not unnecessarily rebuild existing systems.

Do not continue to Stage 5 automatically.

After implementation, testing, regression verification, and the final Stage 4 report are complete, STOP and wait for explicit approval.

# STAGE 5 — PROACTIVE INTELLIGENCE
## RUHVI AI CO-FOUNDER

---

## OBJECTIVE

Build the Proactive Intelligence layer of the Ruhvi AI Co-Founder.

The goal is to allow the Co-Founder to proactively identify important business events, changes, risks, opportunities, anomalies, pending items, and follow-ups from REAL Ruhvi data and context.

The Co-Founder should not behave like a passive chatbot that only responds when the user asks a question.

Where appropriate, it should be able to say things such as:

- "There has been a significant change in this metric."
- "This issue may need your attention."
- "A follow-up appears to be pending."
- "This business area has changed compared with the previous period."
- "There may be an opportunity worth reviewing."
- "This task appears to require attention."

However, proactive intelligence must be evidence-based.

It must NOT generate unnecessary alerts, fabricate business problems, or make high-impact decisions automatically.

---

# CRITICAL EXECUTION RULE

This is STAGE 5 ONLY.

Complete only the work defined in this stage.

Do NOT automatically continue to Stage 6.

After completing this stage:

1. Verify the implementation.
2. Run all relevant tests.
3. Perform regression verification.
4. Generate the Stage 5 final report.
5. STOP.
6. Wait for explicit approval before starting Stage 6.

---

# PHASE 1 — REVIEW PREVIOUS STAGES

Before making changes:

1. Read the final reports from:
   - Stage 1
   - Stage 2
   - Stage 3
   - Stage 4
2. Review the current implementation.
3. Understand:
   - Existing architecture
   - Realtime voice system
   - Co-Founder Brain
   - Memory
   - Business Context
   - Analytics
   - MCP/tools
   - Authentication
   - Authorization
   - Existing notification systems
4. Identify reusable components.

Do not duplicate functionality that already exists.

---

# PHASE 2 — EXISTING PROACTIVE / NOTIFICATION SYSTEM AUDIT

Search the codebase for existing:

- Notifications
- Alerts
- Scheduled jobs
- Cron jobs
- Background workers
- Webhooks
- Event listeners
- Email notifications
- Push notifications
- In-app notifications
- WhatsApp/SMS integrations
- Reminder systems
- Task reminders
- Scheduled reports
- Monitoring systems
- Business alerts
- Analytics alerts
- Automation workflows

Determine:

A. Existing and reusable

B. Existing but needs modification

C. Missing and must be implemented

D. Optional/future functionality

Do not replace an existing notification or automation system without a clear technical reason.

---

# PHASE 3 — PROACTIVE INTELLIGENCE EVENT SOURCES

Identify actual events/data that could trigger proactive intelligence.

Potential sources include:

- Analytics changes
- Revenue changes
- Order changes
- Customer activity
- Product performance
- Support tickets
- Failed operations
- Pending tasks
- Deadlines
- User activity
- System events
- Business milestones
- Data anomalies
- Existing application events
- MCP/tool events

Only use event sources that actually exist.

Do not invent events that the application cannot reliably observe.

---

# PHASE 4 — PROACTIVE SIGNAL ENGINE

Create or improve a reusable signal detection layer.

The system should transform raw events/data into meaningful signals.

Each signal should have structured information such as:

- Signal type
- Source
- Timestamp
- Relevant entity
- Metric/value
- Previous value where applicable
- Threshold/baseline
- Severity
- Confidence
- Evidence
- Expiration/relevance period

Possible signal categories:

### BUSINESS

- Significant revenue change
- Significant order change
- Customer activity change
- Product performance change

### RISK

- Potential business issue
- Repeated failure
- Growing support problem
- Unresolved operational issue

### OPPORTUNITY

- Positive trend
- Increased demand
- Product growth
- Customer behavior opportunity

### FOLLOW-UP

- Pending item
- Required review
- Missed follow-up
- Upcoming deadline

### SYSTEM

- Important system failure
- Integration failure
- Repeated tool failure
- Data pipeline issue

Only implement signals supported by reliable data.

---

# PHASE 5 — THRESHOLDS & BASELINES

Define how proactive signals are evaluated.

Possible methods:

- Fixed thresholds
- Historical baseline
- Previous-period comparison
- Moving average
- Percentage change
- Frequency-based detection
- Existing business rules

Do not use arbitrary thresholds without documenting why they exist.

Where historical data is available, prefer meaningful baselines over arbitrary values.

Document:

- Threshold
- Baseline
- Time window
- Data source
- Reason for triggering

---

# PHASE 6 — SIGNAL CONFIDENCE

Every proactive signal should have a confidence/reliability concept where appropriate.

Distinguish between:

- Confirmed
- Strong signal
- Possible signal
- Insufficient evidence

The Co-Founder must not present uncertain signals as confirmed facts.

Example:

Bad:

"Your sales problem is caused by product X."

Better:

"Product X sales have declined 22% over the last 14 days. The available data does not establish why."

---

# PHASE 7 — PRIORITY ENGINE

Create a mechanism for determining which proactive signals deserve user attention.

Priority should consider actual factors such as:

- Business impact
- Urgency
- Recency
- Confidence
- Severity
- User role
- User permissions
- Whether the issue is already known
- Whether the user has already acknowledged it

Do NOT create an overall ranking of political or other unrelated content.

This system is strictly for Ruhvi business intelligence.

The system must avoid treating every event as important.

---

# PHASE 8 — NOISE REDUCTION

Prevent alert fatigue.

Implement mechanisms such as:

- Deduplication
- Cooldown periods
- Alert grouping
- Repeated-event suppression
- Already-acknowledged suppression
- Expiration
- Minimum significance thresholds

Example:

If the same issue occurs 100 times within a short period, the system should not generate 100 identical proactive messages.

Instead, group or summarize the event where appropriate.

---

# PHASE 9 — CONTEXT-AWARE PROACTIVITY

Connect proactive signals to the Co-Founder Brain and business context.

The Co-Founder should understand:

- What the signal relates to
- Why it may matter
- Relevant business context
- Previous related events
- Existing memory
- Current user/session context
- Available supporting analytics

Do not treat a signal in isolation when relevant context already exists.

---

# PHASE 10 — MEMORY-AWARE PROACTIVITY

Integrate with the existing memory system.

The Co-Founder should be able to remember relevant proactive events where appropriate.

Examples:

- Previously reported issue
- User acknowledgment
- User decision
- Follow-up commitment
- Previous investigation
- Previously dismissed signal

Do NOT store every event in long-term memory.

Only store information that has meaningful future value according to the existing Stage 3 memory policy.

---

# PHASE 11 — PROACTIVE FOLLOW-UP

Support follow-up intelligence.

If the Co-Founder previously identified an important issue or the user committed to an action, the system should be able to determine whether follow-up is appropriate.

Examples:

- "You wanted to review this issue later."
- "The issue we discussed earlier is still present."
- "The task you mentioned is still pending."

Follow-up must be based on actual stored context/data.

Do not fabricate previous conversations or commitments.

---

# PHASE 12 — USER PREFERENCES

Inspect whether the application already has user preferences for:

- Notifications
- Alert frequency
- Quiet hours
- Channels
- Categories
- Severity
- Business areas

Reuse existing preference systems.

If missing, implement only the minimum required preference controls.

Users must be able to control proactive behavior where appropriate.

---

# PHASE 13 — NOTIFICATION DELIVERY

Integrate proactive intelligence with available notification channels.

First inspect existing systems.

Potential channels:

- In-app notification
- Chat
- Realtime voice
- Email
- Push
- Other existing integrations

Do not add external services unnecessarily.

The same proactive signal should have one canonical representation and be delivered through the appropriate channel.

---

# PHASE 14 — VOICE PROACTIVE EXPERIENCE

Integrate with the realtime Co-Founder.

When a proactive insight is important enough to surface through voice, it should be communicated naturally.

Example:

"I noticed something important with this month's sales. Revenue is down 18% compared with the previous period."

The voice system should:

- Avoid unnecessary interruptions
- Respect session state
- Respect user preferences
- Respect quiet/silent states where applicable
- Allow the user to interrupt
- Continue naturally after interruption

Do not allow proactive voice behavior to become disruptive.

---

# PHASE 15 — TEXT / CHAT PROACTIVE EXPERIENCE

Ensure proactive insights can appear through the existing text/chat interface.

Messages should contain enough context to understand:

- What happened
- Why it matters
- Supporting data
- Relevant timeframe
- What is known
- What is unknown

Avoid unnecessarily long alerts.

---

# PHASE 16 — ACTION BOUNDARIES

Proactive intelligence must NOT automatically perform high-impact business actions.

Examples of actions requiring explicit approval may include:

- Sending customer messages
- Changing pricing
- Changing product configuration
- Issuing refunds
- Deleting data
- Modifying important business settings
- Publishing content
- Making financial commitments

The proactive system may identify the action that could be considered.

The actual action should go through the appropriate approval/action system.

Do not bypass future Stage 6 approval architecture.

---

# PHASE 17 — SCHEDULING & BACKGROUND EXECUTION

Inspect existing infrastructure for scheduled/background execution.

Use existing mechanisms where possible.

Potential mechanisms:

- Vercel Cron
- Existing scheduled jobs
- Existing worker
- Existing automation
- Database-triggered events
- Webhooks
- Existing queue system

Do not introduce a dedicated server/VM unless absolutely necessary.

Ensure scheduled execution is:

- Idempotent
- Retry-safe
- Secure
- Observable
- Resource-efficient

---

# PHASE 18 — EVENT DEDUPLICATION & IDEMPOTENCY

Ensure the same underlying event cannot repeatedly generate duplicate proactive actions because of:

- Retry
- Refresh
- Multiple workers
- Repeated webhook
- Scheduled execution
- Network failure

Use stable event/signal identifiers where appropriate.

Verify that processing the same event more than once does not create duplicate user-facing notifications.

---

# PHASE 19 — SECURITY & AUTHORIZATION

Perform a complete security review.

Ensure:

- Proactive signals only use authorized data.
- User-specific information is protected.
- Admin information cannot leak to normal users.
- Notification channels cannot expose protected data.
- Background jobs are authenticated.
- Webhooks are verified where applicable.
- Internal tools cannot be triggered by unauthorized users.
- Secrets remain server-side.
- Existing RLS/auth/authorization remains intact.

Do not weaken existing security controls.

---

# PHASE 20 — FAILURE HANDLING

Handle:

- Analytics failure
- Database failure
- Tool failure
- Notification failure
- Background job failure
- Duplicate events
- Missing data
- Stale data
- Partial processing
- Timeout
- Retry

A failed proactive notification must not corrupt business data.

Where appropriate:

- Retry safely
- Log failure
- Record processing state
- Avoid duplicates
- Surface operational errors for investigation

---

# PHASE 21 — OBSERVABILITY

Implement or reuse monitoring for proactive intelligence.

Track appropriate internal information such as:

- Signals generated
- Signals suppressed
- Signals delivered
- Signals acknowledged
- Processing failures
- Delivery failures
- Processing latency
- Duplicate suppression
- Trigger source

Do not collect unnecessary personal data.

---

# PHASE 22 — TESTING

Create and execute tests for:

### Signal detection

- Valid signal
- No signal
- Threshold detection
- Historical comparison
- Insufficient data

### Priority

- Severity
- Recency
- Confidence
- User permissions
- Duplicate signals

### Noise reduction

- Deduplication
- Cooldown
- Grouping
- Suppression
- Expiration

### Memory

- Relevant event storage
- User acknowledgment
- Follow-up context
- No unnecessary memory writes

### Notifications

- In-app
- Chat
- Voice
- Existing notification channels

### Security

- Authorization
- User isolation
- Admin isolation
- Secret protection

### Reliability

- Retry
- Idempotency
- Duplicate events
- Background failures

Do not mark tests as passed unless they actually run successfully.

---

# PHASE 23 — END-TO-END VERIFICATION

Perform real end-to-end scenarios.

At minimum verify scenarios such as:

### Scenario 1 — Business Change

1. Real business data changes.
2. Analytics detects the change.
3. Proactive signal engine evaluates it.
4. Signal meets required criteria.
5. Co-Founder receives the signal.
6. User receives an appropriate notification.
7. Supporting data is available.
8. User can ask follow-up questions.

### Scenario 2 — Insignificant Change

1. Small normal variation occurs.
2. Signal engine evaluates it.
3. No unnecessary alert is generated.

### Scenario 3 — Duplicate Event

1. Same event is processed multiple times.
2. Duplicate protection activates.
3. User does not receive repeated identical notifications.

### Scenario 4 — Unknown Cause

1. Significant metric change is detected.
2. Available data does not establish the cause.
3. Co-Founder reports the change.
4. Co-Founder does NOT invent a cause.

### Scenario 5 — Follow-Up

1. Important issue is identified.
2. User acknowledges/discusses it.
3. Relevant context is stored according to memory policy.
4. Later system evaluation determines whether follow-up is appropriate.

---

# PHASE 24 — REGRESSION CHECK

Verify that Stage 5 has not broken:

- Authentication
- Authorization
- Existing chatbot
- Existing AI providers
- Existing fallback logic
- Existing rate limits
- Existing support-ticket system
- Existing MCP tools
- Existing Supabase functionality
- Existing analytics
- Existing Brain
- Existing memory
- Existing realtime voice
- Existing frontend functionality
- Existing APIs
- Existing scheduled workflows

Do not perform unrelated refactoring.

---

# PHASE 25 — FINAL STAGE 5 REPORT

Create a detailed final report containing:

## 1. Executive Summary

What was implemented.

## 2. Existing Systems Reused

List existing systems reused.

## 3. Proactive Intelligence Architecture

Explain the signal → priority → context → notification flow.

## 4. Signal Types

List implemented signal types.

## 5. Trigger Rules

Document thresholds/baselines and data sources.

## 6. Priority Logic

Explain how important signals are identified.

## 7. Noise Reduction

Document deduplication, cooldowns, grouping, and suppression.

## 8. Memory Integration

Explain what proactive information is stored and why.

## 9. Notification Integration

Document available delivery channels.

## 10. Voice Integration

Document realtime voice behavior.

## 11. Security

Document authentication, authorization, and data protection.

## 12. Background Processing

Document scheduled/event-driven execution.

## 13. Observability

Document monitoring and internal tracking.

## 14. Testing

Report:

- Tests executed
- Passed
- Failed
- Known limitations

## 15. Files Changed

List every modified/created file and why.

## 16. Regression Verification

Document existing functionality checked.

## 17. Known Issues

Clearly list unresolved issues.

## 18. Risks

List remaining technical/business risks.

## 19. Stage 6 Dependencies

Clearly document what Stage 6 will depend on.

---

# CRITICAL RULES

1. Do NOT create fake business events.
2. Do NOT invent business insights.
3. Do NOT generate unnecessary notifications.
4. Do NOT treat uncertain signals as facts.
5. Do NOT invent causes for observed changes.
6. Do NOT create duplicate analytics systems.
7. Reuse Stage 4 Analytics wherever possible.
8. Reuse Stage 3 Brain and Memory.
9. Reuse Stage 2 realtime infrastructure.
10. Respect existing authentication and authorization.
11. Never expose secrets.
12. Never bypass RLS or equivalent controls.
13. Do not automatically execute high-impact business actions.
14. Do not bypass approval boundaries.
15. Prevent duplicate notifications.
16. Make background processing idempotent.
17. Respect user notification preferences where available.
18. Avoid disruptive voice interruptions.
19. Do not introduce unnecessary infrastructure.
20. Do not perform unrelated refactoring.
21. Preserve all existing working functionality.
22. Verify all important changes through actual tests.
23. Never claim functionality works if it was not tested.
24. Complete ONLY Stage 5.
25. STOP after the final Stage 5 report.
26. WAIT for explicit approval before starting Stage 6.

---

# FINAL INSTRUCTION

Execute STAGE 5 only.

First inspect the existing system and all previous stage outputs.

Then implement the Proactive Intelligence layer using real Ruhvi data, existing Analytics, existing Brain, existing Memory, existing MCP/tools, and existing infrastructure wherever possible.

The Co-Founder should proactively surface meaningful information without becoming noisy, speculative, or disruptive.

Do not guess.

Do not invent.

Do not unnecessarily rebuild existing systems.

Do not continue to Stage 6 automatically.

After implementation, testing, regression verification, and the final Stage 5 report are complete, STOP and wait for explicit approval.

# STAGE 6 — RECOMMENDATION & APPROVAL SYSTEM
## RUHVI AI CO-FOUNDER

---

## OBJECTIVE

Build and integrate the Recommendation & Approval layer of the Ruhvi AI Co-Founder.

The goal is to allow the Co-Founder to:

1. Understand a business situation.
2. Analyze available evidence.
3. Identify possible actions.
4. Generate relevant recommendations.
5. Explain why a recommendation is being proposed.
6. Distinguish facts from assumptions.
7. Identify risks and expected effects where evidence allows.
8. Ask for explicit user approval before executing high-impact actions.
9. Preserve a clear approval history.
10. Pass approved actions to the appropriate Business Action Layer.

The Co-Founder must NOT automatically perform high-impact business actions merely because it generated a recommendation.

Recommendations and actions must remain separate.

---

# CRITICAL EXECUTION RULE

This is STAGE 6 ONLY.

Complete only the work defined in this stage.

Do NOT automatically continue to Stage 7.

After completing this stage:

1. Verify the implementation.
2. Run all relevant tests.
3. Perform regression verification.
4. Generate the Stage 6 final report.
5. STOP.
6. Wait for explicit approval before starting Stage 7.

---

# PHASE 1 — REVIEW PREVIOUS STAGES

Before making changes:

1. Read the final reports from:
   - Stage 1
   - Stage 2
   - Stage 3
   - Stage 4
   - Stage 5

2. Review the current implementation of:
   - Co-Founder Brain
   - Memory
   - Business Context
   - Analytics
   - Proactive Intelligence
   - MCP/tools
   - Authentication
   - Authorization
   - Realtime Voice
   - Existing action/automation functionality

3. Identify which components can already support recommendations and approvals.

Do not duplicate existing functionality.

---

# PHASE 2 — EXISTING ACTION / APPROVAL AUDIT

Search the codebase for existing:

- Approval systems
- Confirmation dialogs
- Admin approvals
- Task approval workflows
- Action queues
- Automation systems
- Workflow systems
- Tool execution permissions
- Role-based permissions
- Audit logs
- User confirmation mechanisms
- Pending actions
- Scheduled actions
- Transaction confirmations

Determine:

A. Existing and reusable

B. Existing but needs modification

C. Missing and must be implemented

D. Optional/future functionality

Do not create a second approval system if one already exists and can safely be extended.

---

# PHASE 3 — RECOMMENDATION MODEL

Create a structured recommendation object.

A recommendation should contain, where applicable:

- Recommendation ID
- Title
- Description
- Context
- Supporting evidence
- Related metric/data
- Reason
- Expected benefit
- Potential risks
- Confidence
- Alternatives
- Required action
- Required permission
- Approval requirement
- Expiration
- Status
- Created timestamp

Do not force fields that cannot be supported by actual data.

---

# PHASE 4 — FACT VS RECOMMENDATION

Ensure the Co-Founder clearly separates:

### FACT

What the available data directly shows.

### INTERPRETATION

What the data may indicate.

### RECOMMENDATION

What the Co-Founder suggests considering.

### ACTION

What the system can actually execute.

For example:

FACT:
"Support tickets increased 31% this month."

INTERPRETATION:
"This may indicate an increase in customer-facing issues."

RECOMMENDATION:
"Review the most common ticket categories before making product changes."

ACTION:
"Generate a support analysis report."

Do not present a recommendation as an established fact.

---

# PHASE 5 — RECOMMENDATION GENERATION

Integrate Recommendations with:

- Stage 3 Co-Founder Brain
- Stage 4 Analytics
- Stage 5 Proactive Intelligence
- Existing business context
- Existing memory
- MCP/tools

Recommendations should be generated when meaningful.

Possible categories:

### BUSINESS

- Review a business metric
- Investigate a performance change
- Analyze customer behavior

### PRODUCT

- Review underperforming product
- Investigate product usage
- Consider product improvement

### CUSTOMER

- Follow up with customers
- Review customer segment
- Investigate retention issue

### SUPPORT

- Investigate repeated support issue
- Review unresolved tickets
- Improve support workflow

### OPERATIONS

- Review pending work
- Investigate repeated failures
- Optimize an existing process

Only generate recommendations supported by actual Ruhvi context and data.

---

# PHASE 6 — ALTERNATIVE OPTIONS

When multiple reasonable approaches exist, the Co-Founder should be able to present alternatives.

For example:

Option A:
"Investigate the issue further."

Option B:
"Run a targeted customer analysis."

Option C:
"Review the affected product workflow."

Do not artificially generate alternatives when only one meaningful path exists.

Do not rank options as "best" unless the system has an explicit, defensible decision rule and the user has asked for that type of comparison.

---

# PHASE 7 — RECOMMENDATION CONFIDENCE

Every recommendation should distinguish between:

- High confidence
- Moderate confidence
- Low confidence
- Insufficient evidence

Confidence must reflect evidence quality.

Do not use confidence as a cosmetic label.

If the evidence is insufficient, the Co-Founder should recommend gathering more information rather than pretending certainty.

---

# PHASE 8 — IMPACT & RISK ANALYSIS

Where sufficient information exists, identify:

- Expected benefit
- Potential downside
- Operational risk
- Financial impact
- Customer impact
- Technical impact
- Reversibility
- Dependencies

Do not invent numerical impact estimates.

If an impact cannot be reliably calculated, state that it is unknown.

---

# PHASE 9 — ACTION CLASSIFICATION

Classify potential actions according to risk.

### LOW-RISK ACTIONS

Actions that can safely occur within already-authorized low-impact boundaries.

### CONFIRMATION REQUIRED

Actions that require explicit user confirmation.

### HIGH-IMPACT ACTION

Actions that must never execute without explicit approval.

Potential high-impact actions may include:

- Financial operations
- Refunds
- Pricing changes
- Product configuration changes
- Deleting data
- Publishing content
- Sending external communications
- Changing important business settings
- Changing user permissions
- Irreversible operations

Do not assume an action is low-risk without inspecting its actual effect.

---

# PHASE 10 — APPROVAL OBJECT

Create a structured approval request where required.

It should contain:

- Approval ID
- Action ID
- Recommendation ID
- Requested action
- Why the action is proposed
- Supporting evidence
- Expected effect
- Risks
- Scope
- Target
- User who requested approval
- Required permission
- Created time
- Expiration
- Current status

Possible states:

- Pending
- Approved
- Rejected
- Expired
- Cancelled
- Executed
- Failed

Use the existing project's conventions where available.

---

# PHASE 11 — EXPLICIT USER CONSENT

Approval must be explicit.

Do not interpret vague messages such as:

- "okay"
- "fine"
- "sounds good"
- "maybe"
- "let's see"

as approval for a high-impact action unless the application has a clearly defined confirmation mechanism.

For high-impact actions, require a clear confirmation tied to the specific action.

Example:

"Approve sending this message to 50 customers?"

The system should record the user's explicit approval.

---

# PHASE 12 — APPROVAL SCOPE

Approval must apply only to the action that was actually presented.

Do not allow:

"Approve this recommendation"

to silently authorize unrelated actions.

If the action changes materially, request approval again.

Example:

Approved:

"Send this message to 20 customers."

Not automatically approved:

"Send a different message to 500 customers."

---

# PHASE 13 — EXPIRATION & STALE APPROVAL

Approvals should not remain valid indefinitely when context may change.

Where appropriate:

- Add expiration.
- Revalidate relevant data.
- Detect material changes.
- Request fresh approval when necessary.

Example:

If a recommendation was based on yesterday's data and the business state has materially changed, do not blindly execute the old approval.

---

# PHASE 14 — APPROVAL REVOCATION

Where technically appropriate, allow pending approvals to be:

- Cancelled
- Revoked
- Expired

An already executed action must not be represented as merely "cancelled."

Maintain accurate state transitions.

---

# PHASE 15 — ROLE & PERMISSION CHECK

Integrate approvals with existing:

- Authentication
- Authorization
- RBAC
- User roles
- Organization/workspace permissions
- Admin permissions

Verify:

- Who can request an action.
- Who can approve it.
- Who can execute it.
- Whether the same user can perform both.
- Whether elevated permission is required.

Do not bypass existing permission boundaries.

---

# PHASE 16 — APPROVAL UI

Inspect the existing UI architecture.

Implement approval interfaces using existing design patterns.

Where applicable, show:

- Recommendation
- Evidence
- Proposed action
- Expected result
- Risks
- Scope
- Approval status
- Approve
- Reject
- Cancel
- Expiration

Do not build a completely separate UI framework.

Reuse existing components and styling conventions.

---

# PHASE 17 — VOICE APPROVAL

Integrate approvals with the realtime voice Co-Founder.

The Co-Founder should be able to explain:

"What I recommend is..."

and, when approval is required:

"This action will send the message to 25 customers. Would you like me to proceed?"

The system must clearly identify:

- What will happen
- Scope
- Important consequences

Only explicit confirmation should authorize the action.

The user must be able to interrupt or cancel.

---

# PHASE 18 — TEXT / CHAT APPROVAL

Implement the same approval semantics for text/chat.

The approval system must behave consistently across:

- Voice
- Chat
- UI

Do not create separate approval logic for each interface.

Use one canonical approval system.

---

# PHASE 19 — ACTION PREVIEW

Before executing an important approved action, generate a final action preview where appropriate.

The preview should identify:

- Exact action
- Target
- Scope
- Relevant parameters
- Important consequences

This is especially important for:

- External communications
- Financial operations
- Bulk operations
- Destructive operations
- Irreversible operations

---

# PHASE 20 — AUDIT LOGGING

Record important recommendation and approval events.

Log appropriate information such as:

- Recommendation generated
- Recommendation viewed
- Approval requested
- Approval granted
- Approval rejected
- Approval cancelled
- Approval expired
- Action executed
- Action failed

Include:

- Timestamp
- User
- Action
- Status
- Relevant IDs
- Result

Do not log secrets or unnecessary sensitive information.

---

# PHASE 21 — SECURITY

Perform a complete security review.

Ensure:

- Users cannot approve actions outside their permissions.
- Users cannot modify approval IDs to approve another action.
- Approval state cannot be forged client-side.
- Approval cannot be replayed incorrectly.
- Expired approvals cannot be executed.
- Rejected approvals cannot be executed.
- Cancelled approvals cannot be executed.
- Secrets remain server-side.
- Existing RLS/auth/authorization remains intact.

Never trust approval state supplied only by the client.

---

# PHASE 22 — IDEMPOTENCY & DUPLICATE EXECUTION PROTECTION

Ensure an approved action cannot accidentally execute multiple times because of:

- Double click
- Network retry
- Page refresh
- Voice retry
- Background retry
- Duplicate webhook
- Duplicate tool invocation

Use appropriate idempotency mechanisms.

Verify that:

ONE approved action

does not become

MULTIPLE real-world executions.

---

# PHASE 23 — FAILURE HANDLING

Handle:

- Approval failure
- Permission failure
- Tool failure
- Database failure
- Action failure
- Timeout
- Expired approval
- Cancelled approval
- Partial execution

The system must accurately report the result.

Never report:

"Action completed"

unless the action actually completed successfully.

---

# PHASE 24 — MEMORY INTEGRATION

Integrate with Stage 3 memory policies.

Store relevant information such as:

- User preference
- Approved/rejected recommendation where useful
- Important decision
- Business decision context
- Follow-up requirement

Do not store every approval event as long-term memory.

Follow the existing memory write policy.

---

# PHASE 25 — PROACTIVE INTELLIGENCE INTEGRATION

Connect Stage 5 proactive signals to the recommendation system.

Expected flow:

REAL BUSINESS DATA

↓

ANALYTICS

↓

SIGNAL DETECTION

↓

PROACTIVE INSIGHT

↓

RECOMMENDATION

↓

USER REVIEW

↓

APPROVAL IF REQUIRED

↓

ACTION SYSTEM

Do not skip the approval layer for actions that require approval.

---

# PHASE 26 — TESTING

Create and execute tests for:

### Recommendation

- Correct context
- Correct evidence
- Correct recommendation
- No recommendation when evidence is insufficient
- Confidence handling

### Approval

- Approval creation
- Approval state transitions
- Explicit confirmation
- Rejection
- Cancellation
- Expiration
- Revocation

### Permissions

- Authorized approval
- Unauthorized approval
- Role restrictions
- Organization/workspace isolation

### Security

- Client-side tampering
- Approval replay
- Forged approval
- Expired approval execution
- Duplicate execution

### Integration

- Brain
- Memory
- Analytics
- Proactive Intelligence
- MCP/tools
- Voice
- Chat
- UI

Do not mark tests as passed unless actually executed.

---

# PHASE 27 — END-TO-END VERIFICATION

Perform real end-to-end scenarios.

### Scenario 1 — Recommendation Only

1. Business data produces a meaningful insight.
2. Co-Founder generates a recommendation.
3. User sees the recommendation.
4. No action is executed automatically.

### Scenario 2 — Approval Required

1. Co-Founder identifies a potential action.
2. Action requires approval.
3. Approval request is created.
4. User reviews the scope.
5. User explicitly approves.
6. Approval is validated server-side.
7. Action becomes eligible for Stage 7 execution.

### Scenario 3 — Rejection

1. Recommendation generated.
2. Approval requested.
3. User rejects.
4. Action does not execute.

### Scenario 4 — Expired Approval

1. Approval created.
2. Approval expires.
3. Execution attempt occurs.
4. System rejects execution.

### Scenario 5 — Duplicate Request

1. Same approved action is submitted twice.
2. Idempotency protection activates.
3. Action executes only once.

### Scenario 6 — Permission Failure

1. Unauthorized user attempts approval.
2. Permission check fails.
3. Action remains unapproved.

---

# PHASE 28 — REGRESSION CHECK

Verify that Stage 6 has not broken:

- Authentication
- Authorization
- Existing chatbot
- Existing AI providers
- Existing fallback logic
- Existing rate limits
- Existing support-ticket system
- Existing MCP tools
- Existing Supabase functionality
- Existing analytics
- Existing Brain
- Existing memory
- Existing proactive intelligence
- Existing realtime voice
- Existing frontend
- Existing APIs
- Existing scheduled workflows

Do not perform unrelated refactoring.

---

# PHASE 29 — FINAL STAGE 6 REPORT

Create a detailed final report containing:

## 1. Executive Summary

What was implemented.

## 2. Existing Systems Reused

List systems reused.

## 3. Recommendation Architecture

Explain how recommendations are generated.

## 4. Recommendation Types

List implemented recommendation categories.

## 5. Evidence & Confidence

Explain how evidence and confidence are handled.

## 6. Action Classification

Document low-risk, confirmation-required, and high-impact actions.

## 7. Approval System

Document approval lifecycle and state transitions.

## 8. Permission Model

Document who can request, approve, and execute actions.

## 9. Voice Integration

Document voice approval behavior.

## 10. UI Integration

Document approval UI.

## 11. Security

Document security controls.

## 12. Idempotency

Document duplicate-execution protection.

## 13. Memory Integration

Document what is stored and why.

## 14. Testing

Report:

- Tests executed
- Passed
- Failed
- Known limitations

## 15. Files Changed

List every modified/created file and why.

## 16. Regression Verification

Document existing functionality checked.

## 17. Known Issues

Clearly list unresolved issues.

## 18. Risks

List remaining technical/business risks.

## 19. Stage 7 Dependencies

Clearly document what Stage 7 will depend on.

---

# CRITICAL RULES

1. Recommendations and actions must remain separate.
2. Do NOT automatically execute high-impact actions.
3. Require explicit approval where necessary.
4. Never treat vague conversation as approval for a high-impact action.
5. Approval must be tied to a specific action and scope.
6. Do not allow approval reuse for materially different actions.
7. Expired approvals must not execute.
8. Rejected approvals must not execute.
9. Cancelled approvals must not execute.
10. Never trust client-side approval state.
11. Validate permissions server-side.
12. Prevent duplicate execution.
13. Do not invent evidence.
14. Do not invent impact estimates.
15. Do not present recommendations as facts.
16. Do not confuse correlation with causation.
17. Reuse Stage 3 Brain and Memory.
18. Reuse Stage 4 Analytics.
19. Reuse Stage 5 Proactive Intelligence.
20. Reuse existing MCP/tool architecture.
21. Reuse existing authentication and authorization.
22. Never expose secrets.
23. Do not introduce unnecessary infrastructure.
24. Do not perform unrelated refactoring.
25. Preserve all existing working functionality.
26. Verify every important change through actual testing.
27. Never claim functionality works if it was not tested.
28. Complete ONLY Stage 6.
29. STOP after the final Stage 6 report.
30. WAIT for explicit approval before starting Stage 7.

---

# FINAL INSTRUCTION

Execute STAGE 6 only.

First inspect all previous stage outputs and the existing Ruhvi codebase.

Then implement the Recommendation & Approval System using the existing Brain, Analytics, Proactive Intelligence, Memory, MCP/tools, authentication, authorization, and infrastructure wherever possible.

The Co-Founder should be able to recommend actions intelligently while keeping the user in control of important decisions and actions.

Do not guess.

Do not invent.

Do not unnecessarily rebuild existing systems.

Do not continue to Stage 7 automatically.

After implementation, testing, regression verification, and the final Stage 6 report are complete, STOP and wait for explicit approval.

# STAGE 7 — BUSINESS ACTION LAYER
## RUHVI AI CO-FOUNDER

---

## OBJECTIVE

Build and integrate the Business Action Layer of the Ruhvi AI Co-Founder.

The goal is to allow the Co-Founder to safely execute approved business actions through existing Ruhvi systems, APIs, MCP tools, services, workflows, and integrations.

The action layer must sit AFTER:

- Co-Founder Brain
- Analytics
- Proactive Intelligence
- Recommendation System
- Approval System

Expected flow:

REAL BUSINESS DATA
        ↓
ANALYTICS
        ↓
INTELLIGENCE
        ↓
RECOMMENDATION
        ↓
USER APPROVAL
        ↓
BUSINESS ACTION LAYER
        ↓
REAL EXECUTION
        ↓
RESULT
        ↓
MEMORY / AUDIT / ANALYTICS

The system must never bypass the approval requirements established in Stage 6.

Only actions that are actually supported by the existing Ruhvi system should be implemented.

Do NOT create fake integrations or simulated execution.

---

# CRITICAL EXECUTION RULE

This is STAGE 7 ONLY.

Complete only the work defined in this stage.

Do NOT automatically continue to Stage 8.

After completing this stage:

1. Verify the implementation.
2. Run all relevant tests.
3. Perform regression verification.
4. Generate the Stage 7 final report.
5. STOP.
6. Wait for explicit approval before starting Stage 8.

---

# PHASE 1 — REVIEW PREVIOUS STAGES

Before making changes:

1. Read the final reports from:
   - Stage 1
   - Stage 2
   - Stage 3
   - Stage 4
   - Stage 5
   - Stage 6

2. Review the current implementation of:
   - Co-Founder Brain
   - Memory
   - Analytics
   - Proactive Intelligence
   - Recommendation System
   - Approval System
   - MCP/tools
   - Authentication
   - Authorization
   - Realtime Voice
   - Existing business APIs
   - Existing workflows

3. Identify existing action capabilities.

Do not duplicate existing functionality.

---

# PHASE 2 — EXISTING ACTION SYSTEM AUDIT

Search the entire codebase for existing mechanisms that can perform business actions.

Inspect:

- MCP tools
- API routes
- Server actions
- Backend services
- Database functions
- Webhooks
- Automation workflows
- Scheduled jobs
- Third-party integrations
- Admin operations
- Customer operations
- Content operations
- Communication systems
- Payment-related services
- Support systems
- Product management systems
- Task management systems

Determine:

A. Existing and directly reusable

B. Existing but needs modification

C. Missing and required

D. Optional/future functionality

Do not create a new action mechanism when a secure existing mechanism can be reused.

---

# PHASE 3 — ACTION INVENTORY

Create a clear inventory of executable actions actually supported by the system.

For every action document:

- Action name
- Purpose
- Existing implementation
- Required parameters
- Target entity
- Required permissions
- Risk level
- Approval requirement
- Reversibility
- External side effects
- Existing API/tool
- Expected response
- Failure behavior

Do not invent actions that are not supported by the codebase.

---

# PHASE 4 — ACTION CONTRACT

Create a consistent action contract.

Every executable action should have structured information such as:

- Action ID
- Action type
- User
- Organization/workspace
- Target
- Parameters
- Approval ID
- Recommendation ID
- Required permissions
- Execution status
- Idempotency key
- Created timestamp
- Execution timestamp
- Result
- Error
- Audit information

Follow existing project conventions wherever possible.

---

# PHASE 5 — APPROVAL VALIDATION

Every action that requires approval must validate the approval server-side BEFORE execution.

Verify:

1. Approval exists.
2. Approval belongs to the correct user/context.
3. Approval is for the exact action.
4. Target matches.
5. Parameters match the approved scope.
6. Approval has not expired.
7. Approval has not been rejected.
8. Approval has not been cancelled.
9. User still has the required permission.
10. Relevant business conditions have not materially changed.

If validation fails:

DO NOT EXECUTE.

Return a clear error state.

---

# PHASE 6 — ACTION PERMISSION ENGINE

Integrate the action layer with existing:

- Authentication
- Authorization
- RBAC
- Organization permissions
- Workspace permissions
- Admin permissions
- Tool permissions

Determine permissions based on actual application rules.

Never assume that authentication alone is sufficient.

A logged-in user must not automatically gain permission to perform every business action.

---

# PHASE 7 — ACTION EXECUTION ENGINE

Create or improve a reusable action execution layer.

Responsibilities:

1. Validate request.
2. Validate authentication.
3. Validate authorization.
4. Validate approval.
5. Validate parameters.
6. Validate target.
7. Check idempotency.
8. Execute the underlying existing service/tool/API.
9. Capture result.
10. Record execution state.
11. Return structured result.

Do not put business logic directly inside the voice UI or chat UI.

The action layer must be backend-controlled.

---

# PHASE 8 — MCP / TOOL EXECUTION

Where existing MCP tools are the correct execution mechanism:

- Reuse them.
- Ensure they have proper authorization.
- Ensure parameters are validated.
- Ensure tool results are structured.
- Ensure errors are handled.
- Ensure actions cannot bypass approval.

Do not create duplicate tools unnecessarily.

---

# PHASE 9 — ACTION PARAMETER VALIDATION

Validate every action parameter.

Protect against:

- Missing values
- Invalid IDs
- Wrong entity type
- Invalid formats
- Invalid amounts
- Invalid dates
- Invalid quantities
- Unexpected values
- Excessively large requests
- Unauthorized targets

Never trust parameters supplied by the client or AI model.

The AI should propose parameters.

The server must validate them.

---

# PHASE 10 — TARGET VALIDATION

Before executing an action, verify that the target still exists and is valid.

Examples:

- Customer still exists.
- Product still exists.
- Task still exists.
- Content still exists.
- Order still exists.
- Requested record still belongs to the correct organization/workspace.

Prevent stale recommendations from modifying the wrong entity.

---

# PHASE 11 — IDEMPOTENCY

Implement strong duplicate-execution protection.

Potential duplicate sources:

- Double click
- Voice retry
- Network retry
- Browser refresh
- API retry
- Background retry
- Webhook retry
- MCP retry
- Agent retry

The same approved action must not execute twice unintentionally.

Use a stable idempotency mechanism.

Test it with real execution paths.

---

# PHASE 12 — TRANSACTION SAFETY

Where actions modify multiple pieces of data:

- Use appropriate database transactions.
- Maintain data consistency.
- Avoid partial updates where possible.
- Roll back when appropriate.
- Clearly report partial failure when rollback is impossible.

Do not claim an operation succeeded if only part of it succeeded.

---

# PHASE 13 — EXTERNAL SIDE EFFECTS

Identify actions that affect systems outside Ruhvi.

Examples:

- Sending email
- Sending customer messages
- Publishing content
- Calling external APIs
- Payment operations
- Updating third-party systems
- Creating external records

For each external side effect:

- Validate destination.
- Validate payload.
- Validate permission.
- Validate approval.
- Handle timeout.
- Handle retry.
- Prevent duplicates.
- Record result.

Never blindly retry an external action if it could cause duplicate side effects.

---

# PHASE 14 — ACTION RESULT SYSTEM

Create a standardized execution result.

Possible states:

- Pending
- Validating
- Executing
- Completed
- Failed
- Partially completed
- Cancelled
- Rejected
- Expired

A result should contain, where applicable:

- Action ID
- Status
- Timestamp
- Result summary
- Affected entities
- External reference
- Error information
- Retry information

Never expose internal secrets or sensitive system details unnecessarily.

---

# PHASE 15 — ERROR HANDLING

Handle:

- Permission errors
- Validation errors
- Approval errors
- Database errors
- API errors
- Tool errors
- Timeout
- External service failure
- Partial execution
- Duplicate request
- Stale target

Return user-friendly messages while keeping detailed technical information in secure logs.

---

# PHASE 16 — ACTION RETRY POLICY

Implement safe retry behavior.

Differentiate between:

### SAFE TO RETRY

Operations that are idempotent and have no duplicate side effects.

### REQUIRES REVALIDATION

Operations where business state may have changed.

### MUST NOT AUTOMATICALLY RETRY

Operations where retry could create duplicate external effects.

Do not create a universal automatic retry mechanism for every action.

---

# PHASE 17 — ACTION CANCELLATION

Where technically possible, support cancellation of pending actions.

Examples:

- Pending scheduled action
- Queued action
- Delayed action

Do not claim an already-completed external operation can be cancelled unless the underlying system actually supports cancellation.

---

# PHASE 18 — SCHEDULED ACTIONS

If Ruhvi already supports scheduling:

- Reuse the existing scheduler.
- Integrate approved actions safely.
- Store execution state.
- Validate approval before execution.
- Revalidate permissions.
- Revalidate target/state when appropriate.
- Prevent duplicate execution.

If scheduling does not exist, implement it only if required by actual Co-Founder requirements.

Do not introduce unnecessary infrastructure.

---

# PHASE 19 — VOICE ACTION EXECUTION

Integrate the Business Action Layer with the realtime Co-Founder.

Example flow:

User:
"Send this update to the customer."

Co-Founder:

1. Understand request.
2. Identify action.
3. Determine whether approval is required.
4. Request approval if required.
5. Receive explicit approval.
6. Execute through the Business Action Layer.
7. Report the actual result.

The voice interface must never directly execute privileged backend operations.

---

# PHASE 20 — TEXT / CHAT ACTION EXECUTION

Implement the same canonical action system for text/chat.

Voice and text must use the same:

- Action contracts
- Permission checks
- Approval validation
- Execution engine
- Idempotency
- Audit logging
- Error handling

Do not duplicate business action logic between interfaces.

---

# PHASE 21 — ACTION AUDIT LOG

Record important action lifecycle events.

Examples:

- Action requested
- Validation started
- Validation failed
- Approval verified
- Execution started
- Execution completed
- Execution failed
- Action cancelled
- Retry attempted
- External operation completed

Include appropriate:

- User
- Organization/workspace
- Action ID
- Approval ID
- Target
- Timestamp
- Status
- Result reference

Do not log:

- API secrets
- Access tokens
- Passwords
- Unnecessary sensitive customer data

---

# PHASE 22 — SECURITY REVIEW

Perform a complete security review of the action layer.

Test for:

- Client-side privilege escalation
- Approval bypass
- Authorization bypass
- IDOR
- Parameter tampering
- Action replay
- Duplicate execution
- Cross-user access
- Cross-organization access
- Tool abuse
- API abuse
- Secret exposure
- Unauthorized external actions

The AI model must never be treated as a trusted security boundary.

All security-critical checks must happen server-side.

---

# PHASE 23 — RATE LIMITING & ABUSE PROTECTION

Reuse existing rate-limit infrastructure.

Where necessary, apply appropriate limits to:

- Action requests
- Expensive operations
- External API calls
- Bulk actions
- Repeated failures

Do not bypass existing rate limits because an action came from the Co-Founder.

---

# PHASE 24 — OBSERVABILITY

Track appropriate operational information:

- Action count
- Success/failure rate
- Execution latency
- Tool failures
- External integration failures
- Retry count
- Duplicate prevention
- Permission failures
- Approval validation failures

Use existing monitoring infrastructure where available.

Avoid unnecessary data collection.

---

# PHASE 25 — MEMORY & CONTEXT UPDATE

After successful actions, integrate results with the existing Brain and Memory policies.

Examples:

- Important completed decision
- User preference discovered through action
- Business state change
- Relevant follow-up
- Action outcome

Do not store every technical execution event as long-term memory.

Only store information that has future value according to Stage 3 memory policy.

---

# PHASE 26 — ANALYTICS UPDATE

Where an action changes business state, ensure the existing Analytics layer can eventually observe the resulting change.

Examples:

Action
→ Customer update
→ Business data changes
→ Analytics reflects change

Do not create a separate analytics pipeline.

Reuse Stage 4.

---

# PHASE 27 — PROACTIVE INTELLIGENCE UPDATE

Where an action resolves or changes an existing proactive signal:

- Update the signal state where appropriate.
- Prevent stale alerts.
- Record resolution.
- Allow follow-up monitoring if needed.

Reuse Stage 5.

---

# PHASE 28 — TESTING

Create and execute tests for:

### Action validation

- Valid action
- Invalid action
- Missing parameter
- Invalid target
- Stale target

### Approval

- Valid approval
- Expired approval
- Rejected approval
- Cancelled approval
- Modified parameters
- Modified target

### Permissions

- Authorized user
- Unauthorized user
- Cross-user access
- Cross-organization access

### Idempotency

- Duplicate request
- Retry
- Refresh
- Concurrent execution

### Database

- Transaction success
- Transaction rollback
- Partial failure

### External systems

- Success
- Timeout
- Failure
- Retry behavior
- Duplicate protection

### Voice

- Voice request
- Approval
- Execution
- Result

### Chat

- Chat request
- Approval
- Execution
- Result

Do not mark tests as passed unless actually executed.

---

# PHASE 29 — END-TO-END VERIFICATION

Perform real end-to-end scenarios.

## Scenario 1 — Low-Risk Action

1. User requests an action.
2. Permission is checked.
3. Action is executed.
4. Result is returned.
5. Audit event is created.

## Scenario 2 — Approval-Required Action

1. User requests action.
2. Recommendation/approval layer determines approval is required.
3. Approval is requested.
4. User explicitly approves.
5. Server validates approval.
6. Action executes.
7. Actual result is returned.

## Scenario 3 — Unauthorized Action

1. User requests restricted action.
2. Permission check fails.
3. Action does not execute.

## Scenario 4 — Expired Approval

1. Approval expires.
2. Execution is attempted.
3. Server rejects it.
4. No business action occurs.

## Scenario 5 — Duplicate Execution

1. Same approved action is submitted twice.
2. Idempotency protection activates.
3. Real-world action occurs only once.

## Scenario 6 — External Failure

1. Valid action begins.
2. External service fails.
3. System records failure.
4. User receives accurate status.
5. No false success is reported.

## Scenario 7 — Stale State

1. Recommendation is generated.
2. Business state changes.
3. User approves old recommendation.
4. Server detects material state mismatch where applicable.
5. Action is blocked or revalidated.

---

# PHASE 30 — REGRESSION CHECK

Verify that Stage 7 has not broken:

- Authentication
- Authorization
- Existing chatbot
- Existing AI providers
- Existing fallback logic
- Existing rate limits
- Existing support-ticket system
- Existing MCP tools
- Existing Supabase functionality
- Existing analytics
- Existing Brain
- Existing memory
- Existing proactive intelligence
- Existing recommendation system
- Existing approval system
- Existing realtime voice
- Existing frontend
- Existing APIs
- Existing scheduled workflows

Do not perform unrelated refactoring.

---

# PHASE 31 — FINAL STAGE 7 REPORT

Create a detailed final report containing:

## 1. Executive Summary

What was implemented.

## 2. Existing Action Systems Reused

List existing systems reused.

## 3. Action Inventory

List actual executable actions.

## 4. Action Architecture

Explain the complete execution flow.

## 5. Approval Integration

Explain how approval is validated before execution.

## 6. Permission Model

Document authorization requirements.

## 7. Idempotency

Document duplicate-execution protection.

## 8. Transaction Safety

Document database consistency mechanisms.

## 9. External Integrations

Document actual external side effects and safeguards.

## 10. Voice Integration

Document realtime voice action execution.

## 11. Chat Integration

Document text/chat action execution.

## 12. Audit Logging

Document action lifecycle logging.

## 13. Security

Document security controls and verification.

## 14. Analytics / Memory Integration

Document how action results flow back into intelligence systems.

## 15. Testing

Report:

- Tests executed
- Passed
- Failed
- Known limitations

## 16. Files Changed

List every modified/created file and why.

## 17. Regression Verification

Document existing functionality checked.

## 18. Known Issues

Clearly list unresolved issues.

## 19. Risks

List remaining technical/business risks.

## 20. Stage 8 Dependencies

Clearly document what Stage 8 will depend on.

---

# CRITICAL RULES

1. The AI model is NOT a security boundary.
2. All security-critical validation must happen server-side.
3. Never execute an action without required approval.
4. Never bypass existing authorization.
5. Never trust client-supplied approval state.
6. Never trust AI-generated parameters without server-side validation.
7. Validate the target before execution.
8. Prevent duplicate execution.
9. Use idempotency for retry-sensitive operations.
10. Use transactions where appropriate.
11. Never blindly retry external side effects.
12. Never claim success unless execution actually succeeded.
13. Clearly distinguish failed, partial, pending, and completed actions.
14. Do not execute stale approvals when business state has materially changed.
15. Do not create fake integrations.
16. Do not create duplicate MCP tools unnecessarily.
17. Reuse Stage 3 Brain and Memory.
18. Reuse Stage 4 Analytics.
19. Reuse Stage 5 Proactive Intelligence.
20. Reuse Stage 6 Recommendation and Approval.
21. Reuse existing authentication and authorization.
22. Reuse existing rate limits.
23. Never expose secrets.
24. Do not introduce unnecessary infrastructure.
25. Do not perform unrelated refactoring.
26. Preserve all existing working functionality.
27. Verify every important change through actual testing.
28. Never claim functionality works if it was not tested.
29. Complete ONLY Stage 7.
30. STOP after the final Stage 7 report.
31. WAIT for explicit approval before starting Stage 8.

---

# FINAL INSTRUCTION

Execute STAGE 7 only.

First inspect all previous stage outputs and the existing Ruhvi codebase.

Then implement the Business Action Layer using existing APIs, services, MCP tools, workflows, authentication, authorization, approval mechanisms, and infrastructure wherever possible.

The Co-Founder should be able to safely turn an approved recommendation into a real business action while maintaining strict security, permission, approval, audit, and duplicate-execution controls.

Do not guess.

Do not invent.

Do not unnecessarily rebuild existing systems.

Do not continue to Stage 8 automatically.

After implementation, testing, regression verification, and the final Stage 7 report are complete, STOP and wait for explicit approval.

# STAGE 8 — ENGINEERING / CODING CO-FOUNDER
## RUHVI AI CO-FOUNDER

---

## OBJECTIVE

Build and integrate the Engineering / Coding capability of the Ruhvi AI Co-Founder.

The goal is to allow the Co-Founder to understand, inspect, debug, modify, test, and improve the Ruhvi codebase when explicitly requested and when the required permissions are available.

The Engineering Co-Founder should be capable of:

- Understanding the existing codebase
- Locating relevant files
- Understanding architecture and dependencies
- Investigating bugs
- Analyzing errors
- Explaining technical problems
- Proposing fixes
- Writing code
- Modifying code when authorized
- Running tests
- Reviewing implementation
- Detecting regressions
- Reviewing security issues
- Explaining implementation decisions
- Working with existing MCP/tools
- Tracking engineering tasks
- Maintaining context across engineering work

The system must NOT blindly modify production code.

Code changes must respect the existing Recommendation, Approval, and Business Action architecture.

---

# CRITICAL EXECUTION RULE

This is STAGE 8 ONLY.

Complete only the work defined in this stage.

Do NOT automatically continue to Stage 9.

After completing this stage:

1. Verify the implementation.
2. Run all relevant tests.
3. Perform regression verification.
4. Generate the Stage 8 final report.
5. STOP.
6. Wait for explicit approval before starting Stage 9.

---

# PHASE 1 — REVIEW PREVIOUS STAGES

Before making changes:

1. Read the final reports from:
   - Stage 1
   - Stage 2
   - Stage 3
   - Stage 4
   - Stage 5
   - Stage 6
   - Stage 7

2. Review the current implementation of:
   - Co-Founder Brain
   - Memory
   - Analytics
   - Proactive Intelligence
   - Recommendation
   - Approval
   - Business Actions
   - MCP/tools
   - Authentication
   - Authorization
   - Realtime Voice
   - Existing development tooling

3. Identify existing coding/engineering capabilities.

Do not duplicate existing systems unnecessarily.

---

# PHASE 2 — EXISTING ENGINEERING SYSTEM AUDIT

Search the codebase for existing:

- Code editors
- Code generation
- AI coding tools
- Repository access
- File management tools
- Git integration
- GitHub integration
- Pull request systems
- Issue tracking
- Error monitoring
- Logs
- Build systems
- Test runners
- CI/CD
- Deployment systems
- Code review systems
- Static analysis
- Linting
- Type checking
- Security scanners
- Development MCP tools

Determine:

A. Existing and reusable

B. Existing but needs modification

C. Missing and required

D. Optional/future functionality

Do not replace existing engineering infrastructure without a documented reason.

---

# PHASE 3 — CODEBASE ACCESS ARCHITECTURE

Define how the Co-Founder accesses code.

Determine whether access is through:

- Existing repository integration
- Git provider
- MCP tools
- File APIs
- Development environment
- Existing IDE integration
- Other existing mechanism

The Co-Founder must only access repositories/projects the authenticated user is authorized to access.

Do not expose unrelated repositories or files.

---

# PHASE 4 — CODEBASE UNDERSTANDING

Implement or improve structured codebase understanding.

The Co-Founder should be able to identify:

- Project structure
- Framework
- Runtime
- Package manager
- Dependencies
- Entry points
- API routes
- Components
- Services
- Database layer
- Authentication
- AI layer
- MCP/tools
- Tests
- Configuration
- Environment variables
- Deployment configuration

Use actual codebase information.

Do not guess architecture.

---

# PHASE 5 — REPOSITORY CONTEXT

Create reusable repository context.

Where appropriate, understand:

- Git branch
- Commit history
- Recent changes
- Changed files
- Open issues
- Existing pull requests
- Current working state
- Uncommitted changes

Do not overwrite or discard user changes.

Never assume the working tree is clean.

---

# PHASE 6 — FILE & SYMBOL DISCOVERY

Provide reliable mechanisms for finding relevant code.

Support searches for:

- Files
- Functions
- Classes
- Components
- API routes
- Database queries
- Types
- Interfaces
- Configuration
- Error messages
- Dependencies
- References

The Co-Founder should inspect the relevant context before proposing changes.

Avoid unnecessary full-codebase manipulation for simple tasks.

---

# PHASE 7 — BUG INVESTIGATION

Implement a structured debugging workflow.

Expected process:

1. Understand user-reported problem.
2. Identify symptoms.
3. Locate relevant code.
4. Inspect related dependencies.
5. Reproduce where possible.
6. Inspect logs/errors.
7. Identify likely cause.
8. Verify the cause.
9. Propose fix.
10. Implement only when authorized.
11. Run relevant tests.
12. Verify regression impact.

Do not immediately modify code based on an unverified assumption.

---

# PHASE 8 — ERROR & LOG ANALYSIS

Integrate with existing error/logging systems.

Where available, analyze:

- Runtime errors
- Server logs
- Client errors
- API failures
- Database errors
- AI provider errors
- MCP/tool errors
- Build failures
- Deployment failures
- Test failures

The Co-Founder should distinguish:

- Observed error
- Likely cause
- Confirmed cause
- Unknown cause

Do not present an unverified hypothesis as the root cause.

---

# PHASE 9 — CODE GENERATION

Allow the Co-Founder to generate code consistent with the existing project.

Generated code must:

- Follow existing conventions
- Follow existing architecture
- Reuse existing utilities
- Reuse existing components
- Reuse existing types
- Respect security patterns
- Respect error handling
- Respect validation
- Respect authentication
- Respect authorization

Do not introduce a new framework/library when an existing project solution is sufficient.

---

# PHASE 10 — CODE MODIFICATION

When the user explicitly requests an implementation:

1. Identify required files.
2. Read relevant existing code.
3. Understand dependencies.
4. Make the smallest safe change.
5. Preserve existing behavior.
6. Run relevant tests.
7. Inspect the diff.
8. Report what changed.

Do not perform broad refactoring unless explicitly required.

---

# PHASE 11 — CHANGE SCOPE CONTROL

Every coding task should have a defined scope.

Before modification, determine:

- Requested change
- Files likely affected
- Related dependencies
- Potential side effects
- Tests required

Do not modify unrelated files.

If additional changes become necessary, explain why before expanding the scope where approval is required.

---

# PHASE 12 — GIT SAFETY

If Git integration exists, preserve Git safety.

The system must:

- Never silently delete user changes.
- Never force-reset a branch without explicit authorization.
- Never overwrite unrelated changes.
- Never rewrite history without explicit authorization.
- Show meaningful diffs.
- Identify modified files.
- Preserve branch context.

Where supported, prefer reversible changes.

---

# PHASE 13 — BRANCH / WORKFLOW SUPPORT

Where repository workflows support branches:

- Inspect current branch.
- Respect existing branch conventions.
- Avoid committing directly to protected branches when project policy prohibits it.
- Use appropriate development branches where available.

Do not create unnecessary branches for trivial operations unless existing workflow requires them.

---

# PHASE 14 — TEST GENERATION

When implementing code changes, determine appropriate tests.

Potential tests:

- Unit tests
- Integration tests
- API tests
- Component tests
- End-to-end tests
- Regression tests
- Security tests

Reuse existing testing frameworks.

Do not introduce a new testing framework unnecessarily.

---

# PHASE 15 — TEST EXECUTION

After code changes:

1. Run the smallest relevant tests first.
2. Run broader tests where necessary.
3. Run type checking.
4. Run linting where applicable.
5. Run build verification where appropriate.

Record actual results.

Do not claim a test passed unless it actually executed successfully.

---

# PHASE 16 — CODE REVIEW CAPABILITY

Implement or improve a structured code review capability.

The Co-Founder should be able to review:

- Correctness
- Architecture
- Maintainability
- Security
- Performance
- Error handling
- Edge cases
- Test coverage
- Regression risk

Review findings should be evidence-based.

Do not invent vulnerabilities.

---

# PHASE 17 — SECURITY ENGINEERING

Integrate engineering workflows with secure development practices.

Review for:

- Authentication bypass
- Authorization bypass
- Injection
- XSS
- CSRF where relevant
- SSRF where relevant
- IDOR
- Secret exposure
- Unsafe file operations
- Unsafe command execution
- Dependency vulnerabilities
- Insecure API endpoints
- Client-side trust issues

Do not expose exploit secrets or sensitive credentials.

When a security issue is identified, explain:

- Location
- Evidence
- Impact
- Recommended remediation
- Verification method

---

# PHASE 18 — DEPENDENCY MANAGEMENT

Inspect dependency changes carefully.

Before adding a dependency:

1. Check whether an existing dependency can solve the requirement.
2. Check compatibility.
3. Check project conventions.
4. Check security implications.
5. Check maintenance considerations.
6. Check bundle/runtime impact.

Do not add unnecessary packages.

Do not upgrade unrelated dependencies simply because newer versions exist.

---

# PHASE 19 — DATABASE / SUPABASE ENGINEERING

Where engineering tasks involve the database:

- Inspect existing schema.
- Inspect migrations.
- Respect existing relationships.
- Respect RLS.
- Respect existing API/data access patterns.
- Validate migrations before applying.
- Avoid destructive schema changes without explicit approval.
- Preserve production data.

Never assume database state.

---

# PHASE 20 — AI / MODEL ENGINEERING

Integrate coding intelligence with the existing AI architecture.

The Co-Founder should understand:

- Existing model providers
- Provider fallback
- Rate limits
- AI prompts
- Tool calling
- MCP
- Context management
- Memory
- Streaming
- Voice architecture

Do not replace working AI providers or fallback systems without explicit requirements.

---

# PHASE 21 — MCP ENGINEERING TOOLS

Review existing MCP architecture.

Where engineering tools are implemented through MCP:

- Reuse existing MCP tools.
- Validate permissions.
- Validate inputs.
- Restrict repository scope.
- Prevent arbitrary privileged execution.
- Log important operations.
- Apply approval requirements to high-impact operations.

Potential tools may include:

- Repository search
- File read
- File write
- Diff
- Git status
- Test execution
- Build execution
- Log inspection
- Issue lookup
- Pull request inspection

Only implement tools actually required.

---

# PHASE 22 — COMMAND EXECUTION SAFETY

If the engineering system can execute development commands:

Treat command execution as privileged.

Implement:

- Command validation
- Working-directory restrictions
- Repository restrictions
- Permission checks
- Timeout
- Resource limits
- Output limits
- Dangerous-command protection
- Audit logging

Never allow unrestricted arbitrary command execution through an AI-generated string.

Do not expose production credentials to development commands.

---

# PHASE 23 — ENVIRONMENT & SECRET SAFETY

The Co-Founder must never expose:

- API keys
- Access tokens
- Passwords
- Private keys
- Database credentials
- LiveKit secrets
- Gemini credentials
- Service-role credentials

When code requires environment variables:

- Reference variable names.
- Never reveal their values.
- Keep secrets server-side.
- Respect existing secret-management patterns.

---

# PHASE 24 — DEPLOYMENT SAFETY

Engineering actions that could affect deployment must respect Stage 6 approval rules.

Examples:

- Deploying production
- Changing environment variables
- Running production migrations
- Changing domain configuration
- Changing critical infrastructure
- Rolling back production

These must not execute automatically unless explicitly authorized according to the established approval/action system.

---

# PHASE 25 — ROLLBACK / RECOVERY

Where code changes are applied:

Ensure there is a clear recovery path.

Depending on the existing Git/deployment system:

- Preserve diffs.
- Use commits/branches where appropriate.
- Record changed files.
- Preserve previous state.
- Provide rollback instructions.
- Avoid destructive operations.

Do not silently revert user changes.

---

# PHASE 26 — ENGINEERING MEMORY

Integrate with Stage 3 Memory.

Where useful, remember:

- Important architecture decisions
- User coding preferences
- Approved engineering decisions
- Important recurring issues
- Known project constraints
- Important implementation context

Do not store every coding conversation.

Follow the existing memory policy.

---

# PHASE 27 — ENGINEERING TASK MANAGEMENT

If an existing task/issue system exists, integrate with it.

The Co-Founder should be able to:

- Understand tasks
- Investigate task-related code
- Track implementation
- Report status
- Identify blockers
- Suggest next steps

Do not create a duplicate task manager if an existing one is available.

---

# PHASE 28 — VOICE ENGINEERING EXPERIENCE

The realtime Co-Founder should support engineering conversations naturally.

Examples:

"Why is this API failing?"

"Find where the authentication logic is."

"Explain this error."

"Fix this bug."

"Review this component."

"Run the tests."

"Show me what changed."

The voice system should:

- Confirm important operations.
- Keep technical explanations understandable.
- Allow interruption.
- Avoid reading large diffs aloud.
- Summarize results and offer details when requested.

---

# PHASE 29 — TEXT / CHAT ENGINEERING EXPERIENCE

Ensure engineering capabilities work through the existing text/chat interface.

Use the same underlying engineering tools and execution layer.

Do not implement separate engineering logic for voice and text.

---

# PHASE 30 — OBSERVABILITY

Track appropriate engineering operations:

- Tool usage
- Code changes
- Test execution
- Build execution
- Command failures
- Permission failures
- Approval events
- Repository operations
- Deployment operations

Do not log secrets.

Do not unnecessarily store source-code content in analytics.

---

# PHASE 31 — TESTING

Create and execute tests for:

### Code understanding

- Repository discovery
- File discovery
- Symbol discovery
- Dependency discovery

### Debugging

- Error identification
- Log retrieval
- Root-cause workflow
- Unknown-cause handling

### Code changes

- Correct modification
- Scope control
- Diff generation
- Existing functionality preservation

### Testing

- Test execution
- Type checking
- Linting
- Build verification

### Security

- Authorization
- Repository isolation
- Command restrictions
- Secret protection
- Privileged operation protection

### Git safety

- Uncommitted changes
- Branch safety
- Diff correctness
- No accidental deletion

### AI integration

- Brain
- Memory
- MCP
- Voice
- Chat

Do not mark tests as passed unless actually executed.

---

# PHASE 32 — END-TO-END VERIFICATION

Perform real engineering workflows.

## Scenario 1 — Code Investigation

1. User reports a bug.
2. Co-Founder identifies relevant code.
3. Relevant logs/errors are inspected.
4. Cause is investigated.
5. Evidence is presented.

## Scenario 2 — Safe Code Fix

1. User requests a fix.
2. Relevant files are identified.
3. Existing code is inspected.
4. Minimal change is implemented.
5. Diff is reviewed.
6. Tests are executed.
7. Result is reported.

## Scenario 3 — Test Failure

1. Test is executed.
2. Test fails.
3. Failure is reported accurately.
4. Co-Founder investigates.
5. No false success is reported.

## Scenario 4 — Unauthorized Repository

1. User requests access to unauthorized repository.
2. Permission check fails.
3. Repository is not accessed.

## Scenario 5 — Dangerous Operation

1. User/AI requests privileged destructive operation.
2. System identifies elevated risk.
3. Approval is required.
4. Operation does not execute without valid approval.

## Scenario 6 — Production Change

1. Production-impacting change is requested.
2. Action is classified as high impact.
3. Approval is required.
4. Server validates approval.
5. Only then can the action proceed through the Business Action Layer.

---

# PHASE 33 — REGRESSION CHECK

Verify that Stage 8 has not broken:

- Authentication
- Authorization
- Existing chatbot
- Existing AI providers
- Existing fallback logic
- Existing rate limits
- Existing support-ticket system
- Existing MCP tools
- Existing Supabase functionality
- Existing analytics
- Existing Brain
- Existing memory
- Existing proactive intelligence
- Existing recommendation system
- Existing approval system
- Existing business action layer
- Existing realtime voice
- Existing frontend
- Existing APIs
- Existing scheduled workflows

Do not perform unrelated refactoring.

---

# PHASE 34 — FINAL STAGE 8 REPORT

Create a detailed final report containing:

## 1. Executive Summary

What was implemented.

## 2. Existing Engineering Systems Reused

List systems reused.

## 3. Codebase Access

Explain repository/file access architecture.

## 4. Engineering Tools

List implemented/reused tools.

## 5. Debugging Capability

Explain debugging workflow.

## 6. Code Generation & Modification

Explain implementation workflow and scope controls.

## 7. Testing

Document test execution and verification.

## 8. Git Safety

Document branch, diff, and change protection.

## 9. Security

Document security controls.

## 10. Command Execution

Document restrictions and safeguards.

## 11. Deployment Safety

Document approval boundaries.

## 12. Memory Integration

Document engineering context stored.

## 13. Voice Integration

Document realtime engineering experience.

## 14. Chat Integration

Document text/chat engineering experience.

## 15. MCP Integration

Document engineering tools.

## 16. Observability

Document tracked operations.

## 17. Testing Results

Report:

- Tests executed
- Passed
- Failed
- Known limitations

## 18. Files Changed

List every modified/created file and why.

## 19. Regression Verification

Document existing functionality checked.

## 20. Known Issues

Clearly list unresolved issues.

## 21. Risks

List remaining technical/security risks.

## 22. Stage 9 Dependencies

Clearly document what Stage 9 will depend on.

---

# CRITICAL RULES

1. Do not blindly modify code.
2. Inspect existing code before changing it.
3. Make the smallest safe change.
4. Do not modify unrelated files.
5. Do not delete user changes.
6. Do not reset repositories without explicit authorization.
7. Do not rewrite Git history without explicit authorization.
8. Never expose secrets.
9. Never expose production credentials.
10. Never trust AI-generated commands without validation.
11. Restrict privileged command execution.
12. Respect repository permissions.
13. Respect authentication and authorization.
14. Respect RLS.
15. Do not bypass MCP security.
16. Do not bypass Stage 6 approval requirements.
17. Do not automatically deploy production changes.
18. Do not perform destructive production operations automatically.
19. Do not invent root causes.
20. Distinguish observed facts from hypotheses.
21. Never claim tests passed unless actually executed.
22. Reuse existing engineering infrastructure.
23. Reuse Stage 3 Brain and Memory.
24. Reuse Stage 4 Analytics.
25. Reuse Stage 5 Proactive Intelligence.
26. Reuse Stage 6 Recommendation and Approval.
27. Reuse Stage 7 Business Action Layer.
28. Do not introduce unnecessary infrastructure.
29. Do not perform unrelated refactoring.
30. Preserve all existing working functionality.
31. Complete ONLY Stage 8.
32. STOP after the final Stage 8 report.
33. WAIT for explicit approval before starting Stage 9.

---

# FINAL INSTRUCTION

Execute STAGE 8 only.

First inspect all previous stage outputs and the existing Ruhvi codebase.

Then implement the Engineering / Coding Co-Founder capability using existing repository access, MCP tools, development tooling, Brain, Memory, authentication, authorization, approval, and Business Action infrastructure wherever possible.

The Co-Founder should be capable of understanding and working with the Ruhvi codebase while maintaining strict controls around code changes, privileged commands, secrets, Git operations, production changes, and destructive actions.

Do not guess.

Do not invent.

Do not unnecessarily rebuild existing systems.

Do not continue to Stage 9 automatically.

After implementation, testing, regression verification, and the final Stage 8 report are complete, STOP and wait for explicit approval.

# STAGE 9 — BROWSER TESTING & DEPLOYMENT VERIFICATION

## OBJECTIVE

Perform a comprehensive browser-level, integration, performance, security, and deployment verification of the complete Ruhvi AI Co-Founder system built in Stages 1–8.

This stage is for TESTING and VERIFICATION.

Do not redesign or unnecessarily modify the application.

The goal is to verify that the complete system works correctly in the real deployed environment while preserving all existing functionality.

---

# CRITICAL EXECUTION RULE

DO NOT RUN ALL TESTS AT ONCE.

Follow this exact sequence:

1. First analyze the complete codebase and existing testing/deployment setup.
2. Create the complete test plan and test matrix.
3. Run tests ONE TEST CATEGORY AT A TIME.
4. After each category:
   - record what was tested
   - record passed tests
   - record failed tests
   - record warnings
   - record evidence
   - record affected components
5. Continue to the next category only after the current category is completed.
6. Merge all category reports into the final Stage 9 report.

Do not skip directly to the final report.

Do not claim a test passed unless it was actually executed and verified.

---

# PHASE 1 — REVIEW PREVIOUS STAGES

Review the outputs and implementation from:

- Stage 1 — Existing Ruhvi System Audit & Architecture
- Stage 2 — Realtime Voice Co-Founder
- Stage 3 — Co-Founder Brain, Memory & Business Context
- Stage 4 — Analytics & Business Intelligence
- Stage 5 — Proactive Intelligence
- Stage 6 — Recommendation & Approval System
- Stage 7 — Business Action Layer
- Stage 8 — Engineering / Coding Co-Founder

Identify:

- implemented capabilities
- expected user flows
- APIs
- MCP tools
- authentication requirements
- database dependencies
- realtime dependencies
- external integrations
- background jobs
- deployment dependencies
- known risks
- previously identified issues

Use the actual current codebase as the source of truth.

---

# PHASE 2 — EXISTING TESTING INFRASTRUCTURE AUDIT

Before installing or creating anything, inspect the existing testing infrastructure.

Check for:

- Playwright
- Cypress
- Jest
- Vitest
- React Testing Library
- K6
- existing integration tests
- existing E2E tests
- existing browser automation
- API test suites
- security testing tools
- CI/CD test workflows
- Vercel deployment checks
- existing test scripts
- package.json scripts
- test configuration files

Reuse existing testing infrastructure whenever practical.

Do not introduce duplicate testing frameworks unnecessarily.

If a required tool is missing, document:

MISSING — REQUIRES IMPLEMENTATION

Do not automatically install large or unnecessary tooling without first determining whether it is required.

---

# PHASE 3 — ENVIRONMENT & DEPLOYMENT INVENTORY

Identify the actual environments being tested.

Document:

- local environment
- preview environment
- production environment
- Vercel deployment
- Supabase project
- LiveKit Cloud
- Gemini Live API
- relevant external APIs
- MCP services
- background workers/jobs
- environment variables
- required secrets
- authentication configuration

Never expose secret values.

Only verify whether required configuration exists and functions correctly.

---

# PHASE 4 — TEST ENVIRONMENT SAFETY

Before executing tests, establish test-safety rules.

Use:

- test accounts where available
- test data
- disposable data
- isolated records where possible
- safe API endpoints
- non-destructive actions

NEVER perform destructive production actions such as:

- deleting real customer data
- sending real customer communications
- issuing real refunds
- initiating real payments
- changing important production configuration
- deleting production records
- modifying production authentication settings
- performing irreversible business actions

If a production action cannot safely be tested, mark it:

NOT SAFE TO TEST DIRECTLY — REQUIRES CONTROLLED TEST ENVIRONMENT

Do not fake a successful result.

---

# PHASE 5 — BROWSER COVERAGE MATRIX

Determine the actual browser/device coverage required by the application.

Test appropriate combinations of:

- desktop Chrome/Chromium
- desktop Firefox
- desktop Safari/WebKit where available
- mobile viewport
- tablet viewport
- desktop viewport

Prioritize the browsers actually supported by the existing application.

Do not create an unnecessarily large browser matrix.

Record:

- browser
- viewport
- operating environment
- result
- issues

---

# PHASE 6 — CORE UI & FUNCTIONAL TESTING

Verify the primary Co-Founder application UI.

Test:

- application loading
- routing
- navigation
- page rendering
- buttons
- forms
- inputs
- loading states
- empty states
- success states
- error states
- retry behavior
- modals
- dialogs
- notifications
- responsive layouts
- session persistence
- logout behavior

Verify that existing website functionality remains intact.

Do not redesign UI during this stage.

---

# PHASE 7 — REALTIME VOICE BROWSER TESTING

Test the complete realtime voice flow implemented in Stage 2.

Verify:

- user opens Co-Founder
- microphone permission flow
- LiveKit connection
- secure token generation
- room/session creation
- LiveKit Agent connection
- Gemini Live API connection
- microphone input
- audio streaming
- AI audio output
- realtime response
- transcript behavior where implemented
- session state
- reconnect behavior
- connection failure handling

---

# PHASE 8 — BARGE-IN / INTERRUPTION TESTING

Explicitly test conversational interruption.

Verify:

1. AI begins speaking.
2. User starts speaking while AI is responding.
3. AI stops or appropriately yields according to the implemented behavior.
4. User speech is captured.
5. New user input is processed.
6. AI continues from the correct conversational state.

Test multiple interruption timings where practical.

Record:

- latency
- interruption behavior
- audio artifacts
- duplicate responses
- lost user speech
- incorrect session state

Do not claim barge-in works simply because the connection works.

---

# PHASE 9 — AUTHENTICATION & SESSION TESTING

Verify:

- unauthenticated access
- authenticated access
- login
- logout
- session expiration
- session refresh
- protected routes
- protected APIs
- user identity propagation
- LiveKit token authorization
- session isolation

Verify that one user's session cannot access another user's private context or data.

---

# PHASE 10 — TEXT / CHAT TESTING

If text/chat interaction exists alongside voice, test:

- text input
- AI response
- streaming response where applicable
- conversation history
- context retention
- Brain integration
- Memory retrieval
- tool invocation
- error handling
- fallback behavior
- rate-limit behavior

Verify that voice and text interactions use the intended shared Co-Founder context where designed.

---

# PHASE 11 — BRAIN & MEMORY FLOW TESTING

Verify the browser-visible behavior of:

- business context retrieval
- session context
- long-term memory retrieval
- memory updates
- context prioritization
- current data overriding stale memory
- user corrections
- tool-aware responses

Use controlled test scenarios.

Verify that the system does not invent unavailable business information.

---

# PHASE 12 — ANALYTICS & BUSINESS INTELLIGENCE TESTING

Test browser-accessible analytics functionality.

Verify:

- KPI display
- current metrics
- historical metrics
- trend information
- anomaly information
- business insights
- filtering
- date ranges
- loading states
- stale-data handling
- error handling

Where possible, compare displayed values against the underlying trusted data source.

Do not use fabricated metrics.

---

# PHASE 13 — PROACTIVE INTELLIGENCE TESTING

Test:

- proactive signals
- notifications
- alerts
- priority handling
- signal confidence
- noise reduction
- duplicate prevention
- user preferences
- follow-up behavior
- scheduling/background events where applicable

Verify that:

- uncertain signals are not presented as confirmed facts
- duplicate notifications are not generated
- user preferences are respected
- high-impact actions are not silently executed

---

# PHASE 14 — RECOMMENDATION & APPROVAL TESTING

Test complete recommendation flows.

Verify:

- recommendation generation
- evidence/context display
- fact vs recommendation separation
- alternatives
- impact information
- risk information
- confidence information
- approval request
- approval UI
- rejection
- cancellation
- expiration
- revocation
- approval scope
- permission validation

Explicitly verify that conversational statements such as:

- "okay"
- "sounds good"
- "maybe"
- "do that later"

cannot accidentally authorize a high-impact action unless the implemented approval rules explicitly define them as valid approval.

---

# PHASE 15 — BUSINESS ACTION FLOW TESTING

Test safe, approved action flows.

Verify:

- action preview
- approval validation
- parameter validation
- target validation
- permission validation
- execution
- success state
- failure state
- retry behavior
- cancellation
- idempotency
- audit logging
- result reporting

Use safe test actions only.

Do not trigger irreversible real-world actions merely to obtain a passing test.

---

# PHASE 16 — ENGINEERING / CODING CO-FOUNDER TESTING

Test the browser-facing engineering capabilities implemented in Stage 8.

Verify:

- codebase questions
- file discovery
- code understanding
- bug investigation
- error analysis
- code generation
- proposed changes
- authorized modifications
- test generation
- test execution
- code review
- security review
- Git-aware workflows
- engineering task handling

Verify safety boundaries:

- no unauthorized production modification
- no secret exposure
- no destructive command execution
- no uncontrolled deployment
- no unsafe database reset
- no repository history destruction

---

# PHASE 17 — RESPONSIVE & ACCESSIBILITY TESTING

Verify the application across supported viewport sizes.

Check:

- mobile layout
- tablet layout
- desktop layout
- text wrapping
- buttons
- dialogs
- navigation
- voice controls
- keyboard interaction
- focus states
- labels
- form accessibility
- screen-reader-relevant semantics where applicable
- contrast and readability
- touch targets

Fix only issues that are actually identified during this stage.

Do not perform unrelated UI redesign.

---

# PHASE 18 — NETWORK & API ERROR TESTING

Test realistic failure conditions.

Verify behavior when:

- API request fails
- API request times out
- LiveKit connection fails
- Gemini connection fails
- Supabase request fails
- MCP tool fails
- authentication expires
- network disconnects
- network reconnects
- streaming is interrupted
- backend returns invalid/unexpected data

Verify that the UI provides an understandable recovery path.

Ensure errors do not expose:

- API keys
- tokens
- credentials
- internal secrets
- sensitive database details
- stack traces to normal users

---

# PHASE 19 — SECURITY BROWSER TESTING

Perform browser-level security verification.

Check for:

- unauthorized route access
- unauthorized API access
- session isolation
- token exposure
- secret exposure
- insecure client-side credentials
- unsafe URL parameters
- XSS risks
- unsafe HTML rendering
- CSRF-related issues where applicable
- insecure redirects
- permission bypass
- approval bypass
- action bypass
- sensitive information appearing in browser storage
- sensitive information appearing in client logs

Do not perform destructive security testing against production.

If a deeper security test requires a dedicated security environment, document that requirement.

---

# PHASE 20 — PERFORMANCE & LOAD TESTING

Inspect existing performance tooling first.

If K6 is already available or approved for this project, use it for controlled load testing.

Test only realistic and safe scenarios such as:

- normal API traffic
- chat requests
- selected Co-Founder endpoints
- authentication endpoints where appropriate
- safe read-heavy workflows

For realtime voice, do not generate large uncontrolled simulated traffic unless the environment and provider limits explicitly support it.

IMPORTANT:

The project uses Vercel and Supabase free-tier resources where applicable.

Therefore:

- keep load tests controlled
- start with low concurrency
- use short test durations
- monitor response times
- monitor error rates
- monitor Vercel usage
- monitor Supabase usage
- stop if resource usage becomes unsafe
- never intentionally exhaust quotas

Do not claim that the system supports a specific user count unless actual testing provides evidence.

Record actual measured results instead.

---

# PHASE 21 — DEPLOYMENT VERIFICATION

Verify the deployed application.

Check:

- Vercel deployment status
- production URL
- preview deployment if applicable
- environment variables
- build success
- runtime errors
- server/API functionality
- Supabase connectivity
- LiveKit connectivity
- Gemini connectivity
- authentication
- realtime voice
- MCP/tool connectivity
- frontend/backend communication

Verify that production configuration matches the intended architecture.

Do not expose environment variable values.

---

# PHASE 22 — PRODUCTION SMOKE TEST

Perform a minimal safe end-to-end production smoke test.

Verify the essential path:

User
  ↓
Ruhvi Co-Founder UI
  ↓
Authentication
  ↓
Secure Session / LiveKit Token
  ↓
LiveKit Cloud
  ↓
LiveKit Agent
  ↓
Gemini Live API
  ↓
Co-Founder Brain
  ↓
Memory / Business Context
  ↓
MCP / Tools where applicable
  ↓
Response
  ↓
User

Also verify the equivalent text/chat path where applicable.

Use only safe operations.

---

# PHASE 23 — FAILURE & RECOVERY TESTING

Test controlled recovery from:

- browser refresh
- temporary network loss
- LiveKit disconnect
- backend timeout
- AI provider failure
- expired session
- failed tool call
- failed recommendation
- rejected approval
- failed action

Verify:

- system does not enter inconsistent state
- duplicate actions are not executed
- user receives an understandable status
- session can recover where designed
- retry behavior is safe
- failed operations are accurately recorded

---

# PHASE 24 — REGRESSION TESTING

Run regression tests against existing Ruhvi functionality.

Specifically verify that Stages 2–8 did not break:

- existing authentication
- existing chatbot
- existing AI providers
- fallback logic
- rate limiting
- support-ticket functionality
- existing MCP tools
- existing business functionality
- existing database behavior
- existing frontend routes
- existing APIs
- existing automation
- existing deployment behavior

Any regression must be clearly documented.

Do not silently modify unrelated functionality to hide a regression.

---

# PHASE 25 — FINAL VERIFICATION

Before completing Stage 9, verify that:

- all planned test categories were executed
- tests were executed sequentially
- actual evidence was collected
- failures were recorded
- warnings were recorded
- skipped tests were explained
- production safety was maintained
- no destructive production testing occurred
- no secrets were exposed
- no fake test results were created
- no unsupported claims were made

---

# FINAL STAGE 9 REPORT

Create:

STAGE_9_BROWSER_TESTING_DEPLOYMENT_REPORT.md

The report must contain:

## 1. Executive Summary

## 2. Environment Tested

## 3. Browser / Device Matrix

## 4. Test Categories Executed

## 5. Passed Tests

## 6. Failed Tests

For each failure include:

- test
- expected result
- actual result
- affected component
- severity
- reproducibility
- evidence
- likely cause if known
- required fix

## 7. Warnings

## 8. Skipped / Unsafe Tests

## 9. Realtime Voice Results

## 10. Barge-In Results

## 11. Authentication & Security Results

## 12. Brain & Memory Results

## 13. Analytics Results

## 14. Proactive Intelligence Results

## 15. Recommendation & Approval Results

## 16. Business Action Results

## 17. Engineering Co-Founder Results

## 18. Performance / Load Results

Include actual measured values where available.

## 19. Deployment Verification

## 20. Regression Results

## 21. Known Issues

## 22. Required Fixes

Separate:

- Critical
- High
- Medium
- Low
- Optional

## 23. Production Readiness Findings

Do not provide an overall subjective score or ranking.

State only the verified facts and remaining issues.

## 24. Stage 10 Dependencies

Clearly list anything Stage 10 requires from Stage 9.

---

# STRICT RULES

1. Do not run all tests simultaneously.
2. Analyze first, test second.
3. Execute test categories sequentially.
4. Do not fabricate test results.
5. Do not claim success without actual verification.
6. Do not use fake business data as proof of production functionality.
7. Do not perform destructive production testing.
8. Do not send real customer communications during testing.
9. Do not perform real financial/payment actions during testing.
10. Do not expose credentials or secrets.
11. Do not bypass authentication or authorization merely to make a test pass.
12. Do not bypass approval requirements.
13. Do not modify production data unnecessarily.
14. Keep K6/load tests controlled to protect Vercel/Supabase free-tier resources.
15. Reuse existing testing infrastructure where possible.
16. Do not install unnecessary tooling.
17. Do not create duplicate systems.
18. Do not rewrite working functionality.
19. Do not perform unrelated refactoring.
20. Preserve all existing Ruhvi functionality.
21. Record every failure honestly.
22. Distinguish verified facts from assumptions.
23. If something cannot safely be tested, mark it clearly instead of pretending it passed.
24. Never expose internal secrets in reports.
25. Do not automatically proceed to Stage 10.

---

# COMPLETION CRITERIA

Stage 9 is complete only when:

- the full application has been analyzed
- existing testing infrastructure has been audited
- test environments have been identified
- browser coverage has been defined
- core UI has been tested
- realtime voice has been tested
- streaming has been tested
- barge-in has been tested
- authentication has been tested
- text/chat has been tested
- Brain and Memory flows have been tested
- Analytics has been tested
- Proactive Intelligence has been tested
- Recommendation and Approval flows have been tested
- Business Actions have been safely tested
- Engineering Co-Founder flows have been tested
- responsive/accessibility behavior has been checked
- API/network failures have been tested
- browser-level security has been checked
- controlled performance/load testing has been performed where appropriate
- deployment has been verified
- production smoke testing has been completed safely
- regression testing has been completed
- all failures and warnings have been documented
- STAGE_9_BROWSER_TESTING_DEPLOYMENT_REPORT.md has been created

After completing Stage 9, STOP.

Do not begin Stage 10 automatically.

Wait for explicit approval before starting the next stage.

# STAGE 10 — OUTCOME TRACKING & LEARNING LOOP

## OBJECTIVE

Implement the final Outcome Tracking & Learning Loop for the complete Ruhvi AI Co-Founder system.

The purpose of this stage is to make the Co-Founder capable of tracking what happened after:

- recommendations
- approved decisions
- business actions
- proactive suggestions
- engineering tasks
- important decisions
- user corrections
- AI-generated suggestions
- tool executions

The system should learn from verified outcomes, user feedback, corrections, and measurable results in a controlled and auditable way.

This stage must NOT create uncontrolled self-learning, autonomous model retraining, autonomous production changes, or unrestricted AI behavior.

The system must remain human-controlled, auditable, secure, and reversible.

---

# CRITICAL EXECUTION RULE

DO NOT implement the entire stage at once.

First review and understand everything implemented in Stages 1–9.

Then:

1. Audit the existing system.
2. Identify what already exists and can be reused.
3. Identify missing capabilities.
4. Create an implementation plan.
5. Execute ONE PHASE at a time.
6. Verify each phase before moving to the next phase.
7. Record what was implemented.
8. Record what was verified.
9. Record failures, warnings, and limitations.
10. Continue only after the current phase is verified.

Do NOT automatically start the next stage after completing this stage.

STAGE 10 IS THE FINAL STAGE OF THIS IMPLEMENTATION PLAN.

---

# GLOBAL RULES

## 1. PRESERVE EXISTING FUNCTIONALITY

Do not break or unnecessarily rewrite:

- existing authentication
- existing authorization
- existing Co-Founder Brain
- existing AI provider architecture
- existing model selection
- existing fallback logic
- existing rate limiting
- existing memory
- existing Supabase structure
- existing MCP tools
- existing support-ticket system
- existing chatbot
- existing realtime voice system
- existing LiveKit integration
- existing Gemini Live integration
- existing analytics
- existing proactive intelligence
- existing recommendation system
- existing approval system
- existing business action system
- existing engineering/coding capabilities
- existing UI
- existing deployment configuration

Reuse existing systems whenever technically appropriate.

Do not create duplicate systems merely because a new stage needs similar functionality.

---

# 2. INSPECT BEFORE MODIFYING

Before changing anything:

- inspect the repository
- inspect architecture
- inspect relevant files
- inspect existing database schema
- inspect existing API routes
- inspect server actions
- inspect services
- inspect MCP tools
- inspect memory implementation
- inspect analytics
- inspect event tracking
- inspect recommendation records
- inspect action records
- inspect approval records
- inspect proactive intelligence
- inspect engineering task tracking
- inspect model/provider tracking
- inspect logs
- inspect testing infrastructure

Never assume a capability is missing before searching the codebase.

If something cannot be verified, explicitly mark:

`UNKNOWN — REQUIRES VERIFICATION`

Do not invent implementation details.

---

# 3. REUSE EXISTING DATA

If an existing system already stores:

- events
- recommendations
- actions
- approvals
- tasks
- outcomes
- feedback
- analytics
- conversations
- memory
- model usage
- tool executions

reuse it whenever possible.

Do not create duplicate tables or duplicate tracking pipelines without a documented technical reason.

---

# 4. NO FABRICATED OUTCOMES

Never generate fake:

- revenue
- conversion
- customer growth
- cost savings
- task success
- business results
- recommendation success
- action success
- user satisfaction
- operational metrics

If an outcome is unknown, store it as unknown.

Do not assume that an action succeeded simply because the API returned success.

---

# 5. EXPECTED OUTCOME ≠ ACTUAL OUTCOME

The system must distinguish between:

- expected outcome
- actual outcome
- measured outcome
- reported outcome
- verified outcome
- unknown outcome

Example:

A recommendation may expect:

`Increase conversion by 10%`

That does NOT mean the system can later claim:

`Conversion increased by 10%`

unless actual evidence supports it.

---

# 6. EXECUTION SUCCESS ≠ BUSINESS SUCCESS

A successful API/tool execution does not automatically mean the business outcome was successful.

Example:

An email was successfully sent.

That means:

`Email delivery/execution succeeded`

It does NOT automatically mean:

`Customer converted`

The system must keep these concepts separate.

---

# 7. USER FEEDBACK IS NOT AUTOMATICALLY VERIFIED FACT

If the user says:

`This recommendation worked very well.`

record it as user feedback unless independent evidence verifies it.

Do not automatically convert subjective feedback into verified business data.

---

# 8. CURRENT AUTHORITATIVE DATA WINS

When memory, historical information, user feedback, and current authoritative data conflict:

- current authoritative data should take precedence
- stale memory should not override current data
- uncertain information should remain uncertain
- conflicts should be recorded where useful

---

# 9. NO UNCONTROLLED SELF-MODIFICATION

The Co-Founder must NOT:

- automatically modify its own model weights
- retrain itself without explicit controlled infrastructure
- change security rules autonomously
- change approval requirements autonomously
- remove human approval boundaries
- modify production architecture autonomously
- deploy arbitrary production code autonomously
- change system prompts without controlled review
- create unrestricted autonomous behavior

Learning must occur through controlled, explainable, auditable mechanisms.

---

# 10. SECURITY

Never expose:

- API keys
- access tokens
- service-role credentials
- database secrets
- private user information
- internal credentials
- environment secrets

Never bypass:

- authentication
- authorization
- approval requirements
- role restrictions
- rate limits
- security boundaries

---

# 11. SAFE EXPERIMENTATION

Any experimentation must:

- be controlled
- have a defined scope
- have measurable criteria
- avoid destructive behavior
- avoid unnecessary production mutations
- support rollback
- preserve auditability

Do not perform uncontrolled experiments on real customers or production systems.

---

# PHASE 1 — REVIEW PREVIOUS STAGES

Review all previous stage reports and implementation.

Inspect:

- Stage 1 architecture
- Stage 2 realtime voice
- Stage 3 Co-Founder Brain and memory
- Stage 4 analytics
- Stage 5 proactive intelligence
- Stage 6 recommendation and approval
- Stage 7 business actions
- Stage 8 engineering/coding capabilities
- Stage 9 browser/testing/deployment verification

Identify:

- implemented systems
- reusable systems
- existing event models
- existing analytics
- existing memory
- existing action tracking
- existing feedback
- existing logs
- known issues
- unresolved dependencies

Do not implement anything yet.

---

# PHASE 2 — EXISTING FEEDBACK & OUTCOME SYSTEM AUDIT

Audit whether the current system already tracks:

- user feedback
- recommendation outcomes
- action outcomes
- task completion
- business results
- errors
- corrections
- user overrides
- approval decisions
- tool execution results
- model/provider results

Determine:

- what exists
- where it is stored
- how it is linked
- what is missing
- what can be reused

Do not duplicate existing infrastructure.

---

# PHASE 3 — OUTCOME EVENT MODEL

Design or extend an outcome event model.

The system should be capable of representing events such as:

- recommendation_created
- recommendation_accepted
- recommendation_rejected
- recommendation_modified
- action_approved
- action_executed
- action_failed
- task_completed
- task_failed
- proactive_suggestion_accepted
- proactive_suggestion_rejected
- user_correction
- user_feedback
- measurable_business_result
- outcome_verified

Each event should support appropriate metadata such as:

- event ID
- entity ID
- entity type
- timestamp
- source
- actor
- expected outcome
- actual outcome
- evidence
- confidence
- verification state
- related recommendation
- related action
- related task
- related conversation/session

Do not store unnecessary sensitive information.

---

# PHASE 4 — RECOMMENDATION → OUTCOME LINKING

Connect recommendations to their eventual outcomes.

Track:

- recommendation creation
- recommendation presentation
- user response
- approval/rejection
- execution if applicable
- expected outcome
- actual outcome
- evidence
- verification status

Ensure a recommendation can be traced from:

`Recommendation → Decision → Action → Result → Outcome`

without breaking existing recommendation functionality.

---

# PHASE 5 — ACTION → OUTCOME TRACKING

Connect executed actions to their outcomes.

Track separately:

- action requested
- action approved
- action executed
- execution result
- downstream result
- business outcome

Example:

`Send customer message`

should not automatically become:

`Customer converted`

The system must preserve the distinction.

---

# PHASE 6 — DELAYED OUTCOMES

Support outcomes that occur later.

Examples:

- customer conversion after several days
- revenue generated later
- subscription renewal
- task completion later
- customer response later
- campaign performance after a period
- engineering bug resolution after deployment

Support:

- outcome observation time
- measurement window
- pending outcome state
- final outcome state

Do not mark delayed outcomes as failures simply because they have not happened yet.

---

# PHASE 7 — EXPECTED VS ACTUAL OUTCOME

Implement a clear distinction between:

### Expected

What the Co-Founder predicted or intended.

### Actual

What actually happened.

### Verified

What has been independently or systemically confirmed.

### Reported

What a user or external source reported.

### Unknown

What cannot currently be established.

Where useful, support comparison such as:

`Expected → Actual → Difference`

without presenting unsupported causation.

---

# PHASE 8 — OUTCOME EVIDENCE & ATTRIBUTION

Track evidence supporting an outcome.

Possible evidence sources:

- database records
- analytics
- transaction data
- tool execution results
- task records
- user feedback
- external integrations
- system logs

Distinguish:

- direct evidence
- user-reported evidence
- inferred evidence
- uncertain evidence

Do NOT claim causation merely because two events occurred together.

Example:

If sales increased after a recommendation, do not automatically claim the recommendation caused the increase.

---

# PHASE 9 — USER FEEDBACK & CORRECTION

Allow users to provide:

- positive feedback
- negative feedback
- correction
- clarification
- outcome confirmation
- outcome rejection
- explanation

The system should record:

- what the user said
- what entity it refers to
- when it was provided
- whether it is verified
- whether it should update memory
- whether it should affect future recommendations

Do not automatically treat every user statement as verified business truth.

---

# PHASE 10 — SUCCESS / FAILURE MEASUREMENT

Define measurable states for:

- recommendation success
- recommendation failure
- action execution success
- action execution failure
- task success
- task failure
- outcome success
- outcome failure
- unresolved outcome

Avoid simplistic assumptions.

A recommendation can be:

`accepted`

but later:

`business outcome unknown`

An action can be:

`executed successfully`

while the final business outcome is:

`unsuccessful`

Preserve these distinctions.

---

# PHASE 11 — LEARNING SIGNAL ENGINE

Create a controlled learning-signal layer.

Learning signals may include:

- verified successful outcomes
- verified failures
- repeated user corrections
- repeated user overrides
- consistent recommendation rejection
- consistent recommendation acceptance
- tool failure patterns
- model/provider failure patterns
- task completion patterns

Learning signals must be:

- traceable
- explainable
- auditable
- bounded

Do not directly modify model weights.

---

# PHASE 12 — MEMORY UPDATE POLICY

Integrate verified outcome information with the existing memory system.

Determine what should become:

- short-term context
- long-term memory
- preference
- business fact
- operational knowledge
- historical outcome

Do not store every event as permanent memory.

Memory updates should consider:

- relevance
- confidence
- verification
- freshness
- importance
- privacy
- future usefulness

Current authoritative information must override stale historical memory.

---

# PHASE 13 — RECOMMENDATION IMPROVEMENT

Use verified outcome signals to improve future recommendations.

Possible mechanisms:

- preference adjustment
- context weighting
- recommendation filtering
- confidence calibration
- strategy selection
- ranking logic
- historical outcome retrieval

Do not create an uncontrolled self-learning loop.

Any improvement mechanism must be explainable.

---

# PHASE 14 — PROACTIVE INTELLIGENCE IMPROVEMENT

Use verified historical signals to improve proactive intelligence.

Consider:

- which alerts were useful
- which alerts were ignored
- which suggestions were repeatedly rejected
- which proactive signals led to useful outcomes
- timing effectiveness
- noise patterns

Do not make proactive behavior increasingly aggressive without evidence.

Avoid notification spam.

---

# PHASE 15 — TOOL & ACTION PERFORMANCE TRACKING

Track operational performance of tools and actions.

Metrics may include:

- invocation count
- success count
- failure count
- latency
- retry count
- cancellation count
- approval rate
- execution rate
- failure reasons
- downstream outcome where available

Do not interpret tool success as business success.

---

# PHASE 16 — MODEL & PROVIDER PERFORMANCE TRACKING

Track operational performance across AI providers/models already supported by Ruhvi.

Possible metrics:

- request count
- latency
- failure rate
- timeout rate
- token usage where available
- fallback frequency
- user correction rate
- recommendation acceptance
- task completion
- outcome quality where measurable

Do not expose secrets.

Do not automatically switch providers solely based on insufficient evidence.

Respect the existing provider/fallback architecture.

---

# PHASE 17 — HUMAN OVERRIDE & FEEDBACK

Ensure humans remain able to:

- reject recommendations
- modify recommendations
- override AI suggestions
- correct AI information
- cancel actions
- provide feedback
- correct outcomes

Track overrides as learning signals where appropriate.

Human override must not be treated automatically as proof that the AI was wrong; context should be preserved.

---

# PHASE 18 — SAFE EXPERIMENTATION

If experimentation is useful, implement controlled mechanisms such as:

- feature flags
- limited experiments
- controlled strategy variants
- A/B testing where appropriate
- explicit measurement windows

Every experiment should have:

- scope
- hypothesis
- success criteria
- safety limits
- start time
- end time
- rollback mechanism
- audit trail

Do not perform uncontrolled experiments on production users.

---

# PHASE 19 — GUARDRAILS AGAINST SELF-MODIFICATION

Implement explicit boundaries preventing the Co-Founder from autonomously:

- changing its own system instructions
- changing security policies
- changing approval requirements
- changing authentication
- modifying critical architecture
- modifying model weights
- disabling safeguards
- removing audit logs
- deploying arbitrary production code
- granting itself permissions

Any such change must go through controlled human-approved engineering workflows.

---

# PHASE 20 — OUTCOME ANALYTICS

Extend existing analytics where appropriate.

Support analysis such as:

- recommendation acceptance rate
- recommendation rejection rate
- action execution success
- action failure
- outcome completion
- verified success
- verified failure
- unresolved outcomes
- user correction patterns
- human override patterns
- tool performance
- model/provider operational performance

Do not fabricate metrics.

Use actual available data.

Clearly distinguish:

- sample size
- observed data
- estimated data
- unknown data

---

# PHASE 21 — CO-FOUNDER VOICE INTEGRATION

Integrate outcome tracking into the realtime voice Co-Founder.

The voice agent should be able to understand requests such as:

- "That recommendation worked."
- "That didn't work."
- "The customer converted."
- "The customer didn't convert."
- "Remember this for next time."
- "Don't suggest this again."
- "That action failed."
- "Change the expected outcome."
- "Mark this as successful."

The system must correctly identify the relevant:

- recommendation
- action
- task
- conversation
- outcome

Do not infer an entity when ambiguity could cause incorrect updates.

For ambiguous cases, request clarification.

Voice interactions must respect the same:

- authorization
- approval
- memory
- security
- audit
- outcome rules

as text interactions.

---

# PHASE 22 — TEXT / CHAT INTEGRATION

Integrate the same outcome system into existing text/chat functionality.

Ensure voice and text use the same underlying:

- outcome model
- memory rules
- verification rules
- audit rules
- recommendation tracking
- action tracking

Do not create separate learning systems for voice and text.

---

# PHASE 23 — SECURITY & PRIVACY

Review the complete outcome-learning implementation for:

- authorization
- row-level security
- tenant isolation
- sensitive data handling
- PII exposure
- audit access
- API security
- service-role usage
- logging
- retention
- deletion
- user data controls

Ensure users cannot:

- access another user's outcomes
- modify another user's records
- bypass approval
- falsify privileged verification
- access internal model/provider secrets

Do not store sensitive information unnecessarily.

---

# PHASE 24 — TESTING

Test the complete outcome system.

Include:

### Recommendation Tests

- recommendation created
- accepted
- rejected
- modified
- outcome recorded
- outcome corrected

### Action Tests

- approved
- executed
- failed
- cancelled
- downstream outcome recorded

### Feedback Tests

- positive feedback
- negative feedback
- correction
- clarification
- conflicting feedback

### Delayed Outcome Tests

- pending
- later success
- later failure
- unresolved

### Memory Tests

- verified outcome stored
- stale information does not override current data
- irrelevant events are not permanently stored

### Security Tests

- unauthorized access blocked
- cross-user access blocked
- privileged operations protected

### Voice Tests

- voice feedback
- voice correction
- ambiguous reference
- outcome confirmation

### Text Tests

- same behavior as voice
- same underlying outcome records

---

# PHASE 25 — END-TO-END VERIFICATION

Perform complete end-to-end flows.

Example:

## FLOW A

Recommendation

↓

User approval

↓

Business action

↓

Execution result

↓

Delayed business result

↓

Outcome verification

↓

Analytics

↓

Learning signal

↓

Future recommendation context

Verify every transition.

---

## FLOW B

Recommendation

↓

User rejects

↓

Rejection recorded

↓

Reason captured if provided

↓

Learning signal generated

↓

Future recommendation behavior updated within approved boundaries

---

## FLOW C

Action

↓

Execution succeeds

↓

Business outcome unknown

↓

System does NOT mark business outcome successful

---

## FLOW D

User reports success

↓

System records user-reported outcome

↓

Independent evidence later confirms it

↓

Outcome becomes verified

---

## FLOW E

User reports success

↓

Evidence conflicts

↓

System preserves conflict

↓

Current authoritative data remains authoritative

---

# PHASE 26 — REGRESSION CHECK

Verify that Stage 10 has not broken:

- authentication
- authorization
- chatbot
- realtime voice
- LiveKit
- Gemini Live
- Brain
- memory
- MCP tools
- analytics
- proactive intelligence
- recommendations
- approvals
- business actions
- engineering capabilities
- support tickets
- existing provider/fallback logic
- rate limiting
- existing UI
- deployment

Run relevant existing tests.

Compare behavior before and after implementation.

Document any regression honestly.

---

# PHASE 27 — FINAL STAGE 10 REPORT

Create:

`STAGE_10_OUTCOME_LEARNING_REPORT.md`

The report must contain:

## 1. Executive Summary

Summarize:

- what already existed
- what was reused
- what was implemented
- what was verified
- remaining issues

---

## 2. Existing Systems Reused

Document:

- memory
- analytics
- recommendation system
- approval system
- action system
- feedback
- event tracking
- logging
- model/provider tracking

---

## 3. New Capabilities

Document newly implemented capabilities.

---

## 4. Outcome Model

Document:

- event types
- states
- relationships
- verification states
- expected vs actual outcome

---

## 5. Recommendation Outcome Flow

Document:

`Recommendation → Decision → Action → Result → Outcome`

---

## 6. Action Outcome Flow

Document:

`Approval → Execution → Execution Result → Business Outcome`

---

## 7. Delayed Outcome System

Document:

- pending outcomes
- measurement windows
- delayed verification
- final states

---

## 8. Feedback & Correction

Document:

- user feedback
- corrections
- overrides
- verification

---

## 9. Learning Signals

Document:

- what generates learning signals
- how signals are used
- what boundaries exist

---

## 10. Memory Integration

Document:

- what becomes memory
- what does not
- verification rules
- freshness rules

---

## 11. Recommendation Improvement

Document how verified outcomes affect future recommendations.

---

## 12. Proactive Intelligence Improvement

Document how verified signals affect proactive behavior.

---

## 13. Tool & Action Performance

Document operational tracking.

---

## 14. Model & Provider Performance

Document operational metrics and fallback-related observations.

---

## 15. Human Override

Document:

- approval
- rejection
- modification
- cancellation
- correction
- override

---

## 16. Safe Experimentation

Document:

- experiments
- controls
- measurement
- rollback

---

## 17. Self-Modification Guardrails

Document exactly what the Co-Founder cannot change autonomously.

---

## 18. Analytics

Document available outcome analytics and their data sources.

---

## 19. Voice Integration

Document voice outcome tracking and verification.

---

## 20. Text / Chat Integration

Document text/chat outcome tracking.

---

## 21. Security & Privacy

Document:

- access control
- tenant isolation
- sensitive data handling
- auditability
- retention/deletion considerations

---

## 22. Testing Results

For every test category document:

- test name
- expected result
- actual result
- status
- evidence
- affected component

---

## 23. Failures

For every failure document:

- test
- expected
- actual
- affected component
- severity
- reproducibility
- likely cause
- required fix

Do not hide failures.

---

## 24. Known Issues

Document all remaining issues.

---

## 25. Required Fixes

Categorize:

- Critical
- High
- Medium
- Low
- Optional

Do not create subjective scores or rankings.

---

## 26. Final Architecture Impact

Document how the outcome-learning layer affects the overall Ruhvi AI Co-Founder architecture.

Include:

- data flow
- event flow
- memory flow
- recommendation flow
- action flow
- analytics flow
- learning-signal flow

---

## 27. Remaining Future Work

List capabilities that were intentionally not implemented.

Do not silently add new scope.

---

# STRICT SAFETY RULES

The implementation MUST NOT:

- fabricate outcomes
- fabricate business metrics
- claim unsupported causation
- treat execution success as business success
- treat user feedback as automatically verified truth
- overwrite authoritative current data with stale memory
- bypass authentication
- bypass authorization
- bypass approval requirements
- expose secrets
- expose private user data
- create uncontrolled self-learning
- modify model weights autonomously
- modify security boundaries autonomously
- modify approval boundaries autonomously
- deploy arbitrary production code autonomously
- perform destructive experiments
- create unnecessary duplicate systems
- perform unrelated refactoring
- rewrite working functionality without necessity
- silently change existing business logic
- invent missing data
- mark unknown outcomes as successful or failed without evidence

---

# VERIFICATION REQUIREMENTS

Before declaring Stage 10 complete, verify that:

- Previous stages were reviewed.
- Existing feedback/outcome systems were audited.
- Outcome events are traceable.
- Recommendations can be linked to outcomes.
- Actions can be linked to outcomes.
- Delayed outcomes are supported.
- Expected and actual outcomes are separated.
- Evidence and verification states are supported.
- User feedback and corrections are tracked.
- Learning signals are controlled and auditable.
- Memory updates follow verification and freshness rules.
- Recommendation improvement uses controlled signals.
- Proactive intelligence can use verified signals.
- Tool/action performance is tracked.
- Model/provider operational performance is tracked.
- Human overrides are preserved.
- Experimentation is controlled.
- Self-modification boundaries are enforced.
- Outcome analytics use real data.
- Voice integration works.
- Text/chat integration works.
- Security/privacy controls are verified.
- Tests have been executed.
- End-to-end flows have been verified.
- Regression testing has been completed.
- Failures and warnings are documented.
- `STAGE_10_OUTCOME_LEARNING_REPORT.md` has been created.

---

# FINAL STOP CONDITION

After completing Stage 10:

1. Generate the final report.
2. Do not automatically start any new implementation stage.
3. Do not invent additional stages.
4. Do not perform unrelated improvements.
5. Do not silently continue modifying the system.

Stage 10 is the FINAL STAGE of this implementation plan.

Stop after the final report and clearly state:

`STAGE 10 COMPLETE — FINAL OUTCOME & LEARNING LOOP REPORT GENERATED`

If anything remains unresolved, clearly list it under:

`REMAINING ISSUES / FUTURE WORK`

Do not claim completion if critical verification is missing.