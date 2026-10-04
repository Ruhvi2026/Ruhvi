# MASTER IMPLEMENTATION PROMPT
# Marketing Worker + Marketing Co-Workers — Complete Development Implementation

You are working on the Ruhvi AI codebase.

Your task is to FULLY IMPLEMENT and COMPLETE the Marketing Worker ecosystem and all required Marketing Co-Workers described below.

IMPORTANT:
This is a DEVELOPMENT-PHASE implementation.
Do NOT leave core functionality as "future work".
Implement all required capabilities, interfaces, routing, permissions, UI, MCP contracts, integrations, state management, error handling, and tests now.

Only the explicitly marked PRODUCTION-ONLY co-workers should remain DISABLED.
They must still be fully created and ready to enable later.

============================================================
1. FIRST: ANALYZE THE EXISTING CODEBASE
============================================================

Before changing anything:

1. Analyze the complete existing AI/Co-Founder architecture.
2. Inspect:
   - Co-Founder Brain
   - Worker registry
   - Worker dispatcher
   - Worker types/interfaces
   - Worker orchestration
   - MCP authentication/permissions
   - Tool bridge
   - AI provider abstraction
   - Gemini provider
   - Supabase integrations
   - Cloudinary integrations
   - existing Marketing Worker
   - existing tests
   - existing UI/component architecture
   - approval system
   - task/job/status systems
   - existing analytics
   - existing competitor research functionality
   - existing Ads-related integrations if any
3. Reuse existing infrastructure wherever possible.
4. Do NOT duplicate existing systems.
5. Do NOT replace working architecture unnecessarily.
6. Do NOT break existing workers or existing functionality.

IMPORTANT:
Do not start implementation until the existing architecture is understood.

============================================================
2. FINAL MARKETING ARCHITECTURE
============================================================

The architecture must become:

Co-Founder
    ↓
Marketing Worker
    ↓
    ├── Strategy Co-worker                 ENABLED
    ├── Creative Media Co-worker           ENABLED
    ├── Ads Execution Co-worker            ENABLED
    │
    ├── Social Media Co-worker              DISABLED
    ├── Email Marketing Co-worker           DISABLED
    └── Influencer Marketing Co-worker      DISABLED

Marketing Worker is the DOMAIN MANAGER.

The Marketing Worker must NOT blindly perform every specialized task itself.

Its responsibility is to:

- understand the marketing request
- break the task into appropriate sub-tasks
- select the correct co-worker
- provide complete context to the co-worker
- receive the co-worker's result
- combine/synthesize results
- decide what needs to happen next
- delegate to another co-worker when required
- return a final structured result to Co-Founder

Architecture:

Co-Founder
    ↓
Marketing Worker
    ↓
Specialized Co-worker
    ↓
Marketing Worker
    ↓
Next Co-worker if required
    ↓
Marketing Worker
    ↓
Co-Founder

============================================================
3. MARKETING WORKER — MANAGER RESPONSIBILITIES
============================================================

The Marketing Worker must understand:

- business marketing goals
- campaign objectives
- product context
- customer segments
- target audience
- geography
- language
- offer
- budget constraints
- funnel stage
- acquisition goals
- conversion goals
- campaign type
- creative requirements
- advertising platform
- campaign timing
- competitor context
- existing campaign performance
- previous campaign outcomes

It must be able to determine:

"What does the business need right now?"

Examples:

"Create a Facebook ad campaign for product X."

Marketing Worker should determine:

1. Strategy analysis required?
2. Creative required?
3. Video required?
4. Image required?
5. Copy required?
6. Ads campaign setup required?
7. Competitor research required?
8. Approval required?
9. Execution required?

Then delegate accordingly.

============================================================
4. NATURAL-LANGUAGE DYNAMIC ROUTING
============================================================

Do NOT require rigid commands such as:

"run_strategy_worker"

The Co-Founder/Marketing Worker must understand natural language.

Examples:

"Create an ad for our new product."

→ Strategy + Creative + Ads Execution

"Make a video ad."

→ Strategy context + Creative Media

"Analyze our competitors and suggest an ad."

→ Strategy + Competitor research capability

"Set up this campaign."

→ Ads Execution

"Improve this ad creative."

→ Creative Media

"Run this campaign."

→ Ads Execution + approval gate

Routing must remain deterministic enough for safety but flexible enough for natural-language requests.

Do NOT route to disabled co-workers.

If a disabled worker is requested:

- report that the capability exists
- identify that the worker is currently disabled
- do not execute it
- provide an enable option/state if the UI supports it.

============================================================
5. CO-WORKER #1 — STRATEGY CO-WORKER
============================================================

ID:
marketing_strategy

STATUS:
ENABLED

PRIMARY ROLE:
Marketing strategy, campaign planning, market analysis, audience analysis, offer strategy and advertising copy.

------------------------------------------------------------
SKILLS
------------------------------------------------------------

Implement capabilities for:

1. Marketing strategy
2. Campaign planning
3. Campaign objective selection
4. Audience segmentation
5. Customer persona analysis
6. Funnel-stage analysis
7. Acquisition strategy
8. Conversion strategy
9. Offer strategy
10. Promotion strategy
11. Competitor marketing analysis
12. Competitor positioning
13. Ad angle generation
14. Hook generation
15. Headline generation
16. Primary text generation
17. CTA recommendations
18. Creative direction
19. Platform-specific campaign recommendations
20. Budget strategy/recommendation
21. Campaign structure recommendations
22. A/B testing strategy
23. Creative testing strategy
24. Audience testing strategy
25. Retargeting strategy
26. Product-specific advertising strategy
27. Seasonal campaign strategy
28. Performance-based optimization recommendations
29. Marketing risk detection
30. Margin-aware promotion recommendations

------------------------------------------------------------
TOOLS / MCP CAPABILITIES
------------------------------------------------------------

Reuse existing tools where available.

Required capabilities include:

- Store analytics / metrics
- Product information
- Coupon/offer information
- Competitor information
- Public website research
- Existing campaign information
- Existing marketing performance information

Existing tools should be reused where already implemented, including equivalents of:

- get_store_metrics
- get_coupons
- browse_website
- get_competitors

Do NOT duplicate tools if they already exist.

Permissions:

- Read access by default.
- Write access only where absolutely required.
- No paid campaign activation.

------------------------------------------------------------
OUTPUT
------------------------------------------------------------

The Strategy Co-worker should produce structured output including:

- objective
- business_goal
- campaign_type
- target_audience
- customer_problem
- value_proposition
- offer
- campaign_angle
- hooks
- headlines
- primary_text
- CTA
- platform
- funnel_stage
- budget_recommendation
- testing_plan
- competitor_insights
- creative_requirements
- recommended_next_workers
- risks
- evidence
- confidence
- approval_requirements

It must also be able to provide a concise human-readable summary for Co-Founder voice output.

============================================================
6. CO-WORKER #2 — CREATIVE MEDIA CO-WORKER
============================================================

ID:
marketing_creative_media

STATUS:
ENABLED

PRIMARY ROLE:

Turn Marketing Strategy into production-ready creative assets and manage the complete media-processing workflow.

This worker is responsible for:

- image creative direction
- video creative direction
- video prompts
- multi-clip video continuity
- voice-over preparation
- TTS preparation
- media processing orchestration
- Cloudinary asset management
- n8n media-processing webhook
- final media analysis

IMPORTANT:

The worker must NOT require a Veo API.

The current workflow intentionally uses:

Google Flow/Veo MANUALLY by the user.

The worker generates prompts.
The user generates the videos manually using their own Flow credits.

------------------------------------------------------------
SKILLS
------------------------------------------------------------

Implement:

1. Creative strategy interpretation
2. Ad creative concept development
3. Image creative direction
4. Video creative concept development
5. Short-form video planning
6. Social ad video planning
7. Scene design
8. Shot planning
9. Camera direction
10. Lighting direction
11. Character consistency
12. Product consistency
13. Environment consistency
14. Visual style consistency
15. Video continuity planning
16. Multi-clip continuity
17. First-video → second-video transition planning
18. Flow/Veo prompt generation
19. Negative prompt/instruction generation
20. Voice-over script generation
21. Bengali voice-over preparation
22. Hindi voice-over preparation
23. English voice-over preparation
24. TTS-ready script generation
25. Subtitle preparation
26. Audio timing planning
27. FFmpeg processing requirements
28. Media format planning
29. Aspect-ratio planning
30. Cloudinary asset management
31. Final-video quality analysis
32. Final-video marketing analysis
33. Creative compliance checks
34. Creative consistency validation
35. Ad-platform creative requirements

------------------------------------------------------------
7. TWO-VIDEO MANUAL FLOW WORKFLOW
------------------------------------------------------------

This is a CORE requirement.

When a video advertisement is requested, the Creative Media Co-worker must generate TWO related video prompts.

Example:

VIDEO 1 PROMPT

VIDEO 2 PROMPT

The two prompts must explicitly maintain continuity.

Video 2 must be designed as a continuation of Video 1.

Maintain:

- same character
- same character appearance
- same clothing
- same product
- same environment
- same location
- same lighting
- same visual style
- same camera language
- same color/look
- same time of day
- same story context
- same product positioning

The final scene/frame/action of Video 1 must provide a clear continuity anchor for the first scene of Video 2.

The worker must generate:

- Video 1 prompt
- Video 2 prompt
- continuity instructions
- shared character description
- shared environment description
- shared product description
- camera/style instructions
- negative instructions
- duration
- aspect ratio
- transition guidance

The worker must NOT generate two unrelated videos.

============================================================
8. CREATIVE MEDIA UI
============================================================

When the Creative Media Co-worker provides manual Flow prompts, the UI must clearly display:

--------------------------------
CREATIVE MEDIA CO-WORKER
--------------------------------

VIDEO 1 PROMPT

[Generated prompt]

VIDEO 2 PROMPT

[Generated prompt]

CONTINUITY INSTRUCTIONS

[Generated continuity instructions]

Then show TWO upload controls:

[ Upload Video 1 ]

[ Upload Video 2 ]

The user will manually generate the videos in Google Flow/Veo and upload the resulting files here.

Do NOT require the user to manually copy Cloudinary URLs.

============================================================
9. UPLOAD → CLOUDINARY
============================================================

When the user uploads:

Video 1
Video 2

the application must:

1. Validate file type.
2. Validate file size.
3. Upload Video 1 to Cloudinary.
4. Upload Video 2 to Cloudinary.
5. Obtain their Cloudinary delivery URLs.
6. Store asset metadata.
7. Associate both assets with the correct:
   - campaign
   - task
   - worker execution
   - media job
8. Display upload status.

Example state:

VIDEO 1
Uploaded ✓
Cloudinary URL ✓

VIDEO 2
Uploaded ✓
Cloudinary URL ✓

Only after BOTH uploads succeed should the processing job be dispatched.

============================================================
10. N8N WEBHOOK INTEGRATION
============================================================

The Creative Media Co-worker must trigger the configured n8n webhook automatically after both videos are available.

Use a configurable environment variable such as:

MEDIA_PROCESSOR_WEBHOOK_URL

Do NOT hardcode the URL.

The request should contain structured data similar to:

{
  "job_id": "...",
  "campaign_id": "...",
  "task_id": "...",
  "video_1_url": "...",
  "video_2_url": "...",
  "voiceover_requirements": "...",
  "audio_requirements": "...",
  "processing_requirements": "...",
  "output_requirements": "...",
  "callback_url": "..."
}

Use the exact existing project conventions if a job/webhook schema already exists.

============================================================
11. N8N / FFMPEG CONTRACT
============================================================

The application must NOT directly execute FFmpeg commands from Vercel/serverless functions.

Instead:

AI Application
→ n8n Webhook
→ n8n Workflow
→ FFmpeg
→ Cloudinary
→ Callback

The codebase must provide a clean integration contract.

The n8n workflow should be able to:

1. Receive webhook request.
2. Read Video 1 URL.
3. Read Video 2 URL.
4. Download/process media as required.
5. Merge the videos.
6. Process audio/TTS where required.
7. Apply timing.
8. Apply subtitles if required.
9. Apply required formatting.
10. Produce final video.
11. Upload final video to Cloudinary.
12. Return/callback the final Cloudinary URL.
13. Return job status.

The AI application must support:

- pending
- processing
- completed
- failed
- retrying
- cancelled

Do NOT tightly couple core Marketing logic to n8n implementation details.

n8n is the processing/orchestration layer.

============================================================
12. ASYNC MEDIA JOB SYSTEM
============================================================

Video processing can take significant time.

Therefore:

DO NOT hold a normal serverless request open waiting for FFmpeg.

Implement an asynchronous media job model.

Example:

MEDIA_JOB_CREATED
→ WEBHOOK_SENT
→ PROCESSING
→ FINAL_UPLOAD
→ COMPLETED

or

MEDIA_JOB_CREATED
→ WEBHOOK_SENT
→ PROCESSING
→ FAILED
→ RETRYING

Store:

- job_id
- campaign_id
- task_id
- worker_id
- status
- input assets
- output asset
- created_at
- updated_at
- error
- retry_count
- processing metadata

Reuse existing task/job infrastructure if available.

============================================================
13. FINAL VIDEO CALLBACK
============================================================

When n8n finishes processing:

The final Cloudinary URL must return to the AI application.

The application must:

1. Validate the callback.
2. Match job_id.
3. Store final video URL.
4. Mark job completed.
5. Notify Creative Media Co-worker.
6. Notify Marketing Worker.
7. Continue campaign workflow.

Do NOT rely only on frontend polling if the existing architecture supports callbacks.

Implement secure callback validation using the project's existing security conventions.

============================================================
14. FINAL VIDEO ANALYSIS
============================================================

After the final video is received:

Creative Media Co-worker must analyze the final asset as far as the available capabilities allow.

Analyze:

- duration
- format
- aspect ratio
- creative consistency
- video continuity
- messaging
- product visibility
- CTA
- branding consistency
- voice-over alignment
- audio quality where possible
- ad suitability
- obvious rendering problems
- missing content
- creative weaknesses

Return:

PASS / NEEDS_REVISION / FAILED

with reasons.

If revision is needed:

Generate specific correction instructions.

Do NOT automatically create a new paid asset.

============================================================
15. CO-WORKER #3 — ADS EXECUTION CO-WORKER
============================================================

ID:
marketing_ads_execution

STATUS:
ENABLED

PRIMARY ROLE:

Convert an approved marketing strategy + approved creative into an advertising campaign draft and, after explicit user approval, activate/publish it.

------------------------------------------------------------
SKILLS
------------------------------------------------------------

Implement:

1. Campaign creation
2. Campaign objective selection
3. Ad account selection
4. Campaign structure
5. Ad set creation
6. Audience configuration
7. Location targeting
8. Demographic targeting
9. Placement configuration
10. Budget configuration
11. Schedule configuration
12. Creative attachment
13. Primary text
14. Headline
15. Description
16. CTA
17. Tracking configuration
18. Campaign naming
19. Ad set naming
20. Ad naming
21. Draft creation
22. Campaign validation
23. Campaign preview
24. Campaign optimization
25. Campaign insights
26. Performance monitoring
27. Budget-aware recommendations
28. A/B testing setup where supported
29. Pause/resume where permitted
30. Campaign activation after approval

============================================================
16. META ADS MCP
============================================================

Use the official Meta Ads MCP/integration where appropriate.

IMPORTANT:

Before implementation, inspect the current official Meta Ads MCP capabilities and exact available tools.

Do NOT invent tool names.

Do NOT assume undocumented capabilities.

Use the official integration if it is available and compatible with the project's architecture.

Separate:

READ capabilities
from
WRITE capabilities.

Typical read capabilities may include:

- ad accounts
- campaigns
- ad sets
- ads
- creatives
- insights
- performance

Write capabilities may include:

- campaign creation
- ad set creation
- ad creation
- creative creation
- update
- pause/resume
- activation

Only implement capabilities actually supported by the current MCP/tool interface.

============================================================
17. ADS SAFETY / APPROVAL GATE
============================================================

THIS IS CRITICAL.

Creating or modifying a campaign may have business impact.

Therefore:

Default workflow:

Strategy
→ Creative
→ Ads Execution
→ CREATE DRAFT / PAUSED
→ VALIDATE
→ SHOW USER
→ USER APPROVAL
→ ACTIVATE/PUBLISH

Never automatically activate a paid campaign.

Never spend money without explicit approval.

Never increase budget automatically without approval.

Never create paid campaigns silently.

The approval must be associated with:

- campaign_id
- action
- proposed budget
- audience
- creative
- timestamp
- approval status

Support:

PENDING_APPROVAL
APPROVED
REJECTED
EXPIRED

Reuse existing approval infrastructure where possible.

============================================================
18. CAMPAIGN REVIEW UI
============================================================

Before activation, provide a clear summary:

Campaign:
[Name]

Objective:
[...]

Audience:
[...]

Location:
[...]

Budget:
[...]

Schedule:
[...]

Creative:
[Final video]

Primary Text:
[...]

Headline:
[...]

CTA:
[...]

Expected Strategy:
[...]

Risk/Warnings:
[...]

Status:
DRAFT / PAUSED

Button:

[ APPROVE & PUBLISH ]

If rejected:

[ REJECT ]

The Publish button must be approval-gated.

============================================================
19. PRODUCTION-ONLY CO-WORKER #4
============================================================

ID:
marketing_social_media

STATUS:
DISABLED

Create the complete worker architecture now.

Do NOT activate it.

Prepare capability definitions for:

- social media planning
- content calendar
- platform-specific content
- post copy
- captions
- hashtags
- creative adaptation
- posting schedule
- social analytics
- engagement analysis
- platform optimization
- social campaign planning

Possible future platforms should remain provider-agnostic.

No external production connection is required now.

It must not be routable while disabled.

============================================================
20. PRODUCTION-ONLY CO-WORKER #5
============================================================

ID:
marketing_email

STATUS:
DISABLED

Create the complete worker architecture now.

Prepare capability definitions for:

- email campaign planning
- email copywriting
- subject lines
- preview text
- segmentation
- lifecycle campaigns
- abandoned cart campaigns
- promotional emails
- product launch emails
- retention campaigns
- email A/B testing
- performance analysis
- personalization

Do NOT activate it.

Do NOT require an external email provider now.

It must not be routable while disabled.

============================================================
21. PRODUCTION-ONLY CO-WORKER #6
============================================================

ID:
marketing_influencer

STATUS:
DISABLED

Create the complete worker architecture now.

Prepare capability definitions for:

- influencer discovery
- influencer research
- audience analysis
- engagement analysis
- niche matching
- campaign planning
- influencer shortlist
- outreach preparation
- collaboration evaluation
- cost/ROI estimation
- campaign tracking

Do NOT activate it.

Do NOT connect external influencer platforms now.

It must not be routable while disabled.

============================================================
22. ENABLE / DISABLE SYSTEM
============================================================

Implement a clean configuration mechanism.

Example:

marketing_strategy = ENABLED
marketing_creative_media = ENABLED
marketing_ads_execution = ENABLED

marketing_social_media = DISABLED
marketing_email = DISABLED
marketing_influencer = DISABLED

The system must support enabling/disabling workers without code rewrites.

The UI should provide a clear enable/disable control where appropriate.

When a worker is disabled:

- dispatcher must reject routing
- worker must not execute
- user should receive a clear status
- no external API calls should occur

When enabled:

- worker becomes available to the dispatcher
- its capabilities become routable
- required permissions/integrations must be validated before execution

============================================================
23. MCP PERMISSION MODEL
============================================================

Use least privilege.

Do not give every worker every MCP permission.

Suggested:

Strategy:
- MCP read

Creative Media:
- media read/write
- Cloudinary access
- webhook execution
- media job status

Ads Execution:
- Ads read
- Ads write only where required
- activation requires approval

Disabled workers:
- no active execution permissions

Use existing MCP authorization infrastructure.

Update MCP auth only where required.

Do not weaken existing security.

============================================================
24. PROVIDER ABSTRACTIONS
============================================================

Do NOT hardcode a single media vendor into Marketing Worker.

Create/reuse appropriate provider abstractions.

Examples:

MediaProvider
TTSProvider
MediaProcessor

Possible interfaces:

generateImage()
prepareVideoPrompt()
generateTTS()
submitMediaProcessingJob()
getMediaJobStatus()
uploadAsset()
analyzeMedia()

IMPORTANT:

Manual Google Flow/Veo generation is the current video generation method.

Therefore:

The current implementation must support:

MANUAL_VIDEO_GENERATION

without requiring a video-generation API.

Future API-based generation must be possible without redesigning Marketing Worker.

============================================================
25. TTS
============================================================

TTS must remain provider-agnostic.

Support preparation for:

- Bengali
- Hindi
- English

The worker should generate clean TTS-ready scripts.

Do NOT hardcode one TTS vendor.

Do NOT require a paid TTS API for the current manual Flow workflow.

FFmpeg is responsible for media processing, NOT speech generation.

============================================================
26. CLOUDINARY
============================================================

Reuse existing Cloudinary integration.

Do NOT create a second unrelated Cloudinary system.

Support:

- upload
- asset URL
- metadata
- campaign association
- media job association
- final output
- retrieval
- validation

Store enough metadata to trace:

Campaign
→ Worker
→ Media Job
→ Input videos
→ n8n processing
→ Final video

============================================================
27. ERROR HANDLING
============================================================

Implement clear errors for:

- missing campaign context
- missing strategy
- missing creative
- invalid video
- upload failure
- Cloudinary failure
- webhook failure
- n8n processing failure
- FFmpeg failure
- callback failure
- invalid callback
- missing final video
- disabled worker
- MCP permission failure
- Meta API/MCP failure
- approval missing
- approval expired

Errors must be structured and user-readable.

Do not silently fail.

============================================================
28. COST CONTROL
============================================================

This system must be designed for minimal unnecessary cost.

Rules:

- Do not call video generation APIs automatically.
- Current video creation is manual Flow/Veo.
- Do not trigger paid ads without approval.
- Do not repeat expensive media processing unnecessarily.
- Use caching/idempotency where appropriate.
- Do not duplicate Cloudinary uploads.
- Avoid unnecessary AI calls.
- Avoid unnecessary competitor requests.
- Respect provider rate limits.

============================================================
29. OBSERVABILITY
============================================================

Every worker execution should be traceable.

Record:

- worker_id
- parent_worker
- task_id
- campaign_id
- execution_id
- status
- start time
- end time
- tool calls
- MCP calls
- media job ID
- webhook status
- approval status
- final result
- errors

Reuse existing observability infrastructure.

Do not create redundant logging systems.

============================================================
30. TESTING
============================================================

Create/update tests for:

A. Worker registration
B. Worker enable/disable
C. Dynamic routing
D. Strategy execution
E. Creative execution
F. Two-video prompt generation
G. Video continuity
H. Upload UI
I. Cloudinary upload
J. n8n webhook payload
K. Async media job
L. Callback
M. Final video handling
N. Ads draft creation
O. Approval gate
P. Publish protection
Q. Disabled worker protection
R. MCP permission enforcement
S. Error handling
T. End-to-end marketing flow

IMPORTANT:

Tests must not require real paid video generation.

Tests must not spend real ad budget.

Tests must use mocks/stubs for external services where appropriate.

============================================================
31. END-TO-END TEST SCENARIO
============================================================

Create one complete safe test scenario:

User/Co-Founder:

"Create an ad campaign for Product X."

Expected:

Co-Founder
→ Marketing Worker
→ Strategy Co-worker
→ Creative Media Co-worker
→ Generate Video 1 Prompt
→ Generate Video 2 Prompt
→ Display upload buttons
→ Upload test Video 1
→ Upload test Video 2
→ Cloudinary mock/test
→ n8n webhook mock
→ FFmpeg processing mock
→ Final Cloudinary video
→ Final video analysis
→ Marketing Worker
→ Ads Execution Co-worker
→ Campaign DRAFT
→ Approval request
→ User approval
→ Activation test/mock

No real money must be spent.

============================================================
32. IMPORTANT: PARALLEL N8N IMPLEMENTATION
============================================================

The application-side implementation must be designed so the user can independently configure:

Docker
+
n8n
+
FFmpeg
+
Cloudinary

at the same time.

Do NOT make the application wait for n8n implementation.

Instead, provide the exact integration contract required by n8n.

The n8n workflow must ultimately be able to receive:

Video 1 URL
Video 2 URL
Job ID
Campaign ID
Processing instructions
Callback information

and return:

Job ID
Status
Final Cloudinary URL
Error information if applicable

The AI application and n8n workflow must therefore be independently testable and later connect directly.

============================================================
33. DO NOT CONFIGURE DOCKER/n8n IN THIS TASK
============================================================

For this implementation task:

DO NOT modify the user's Docker environment.

DO NOT create the n8n workflow itself.

DO NOT install FFmpeg into Docker.

DO NOT modify unrelated infrastructure.

Only implement the AI/codebase side and the integration contract.

The n8n/Docker/FFmpeg setup will be configured separately.

============================================================
34. SECURITY
============================================================

Implement:

- webhook authentication
- callback validation
- authorization
- least privilege
- input validation
- file validation
- URL validation
- SSRF protection where applicable
- upload validation
- job ownership validation
- campaign ownership validation
- approval validation
- idempotency
- replay protection where appropriate

Never trust webhook payloads blindly.

Never allow arbitrary internal URL access.

Never expose secrets to frontend.

============================================================
35. PRESERVE EXISTING SYSTEM
============================================================

STRICT RULE:

DO NOT:

- rewrite unrelated workers
- remove existing features
- replace working AI provider infrastructure
- replace existing Cloudinary implementation
- remove existing MCP security
- remove existing approval system
- change unrelated UI
- change database structures unnecessarily
- introduce duplicate abstractions
- break existing tests

Reuse existing architecture whenever possible.

Only modify existing files when necessary for proper integration.

============================================================
36. IMPLEMENTATION ORDER
============================================================

Follow this order:

PHASE 1
Analyze existing architecture.

PHASE 2
Design final Marketing Worker + Co-worker architecture.

PHASE 3
Implement worker definitions/types/registry.

PHASE 4
Implement enable/disable mechanism.

PHASE 5
Implement Strategy Co-worker.

PHASE 6
Implement Creative Media Co-worker.

PHASE 7
Implement two-video continuity prompt system.

PHASE 8
Implement upload UI.

PHASE 9
Integrate existing Cloudinary system.

PHASE 10
Implement media job system.

PHASE 11
Implement n8n webhook contract.

PHASE 12
Implement callback/status system.

PHASE 13
Implement final media analysis.

PHASE 14
Implement Ads Execution Co-worker.

PHASE 15
Verify official Meta Ads MCP capabilities and integrate only supported capabilities.

PHASE 16
Implement approval-gated campaign activation.

PHASE 17
Create disabled Social Media, Email and Influencer workers.

PHASE 18
Implement MCP permissions.

PHASE 19
Implement observability/error handling.

PHASE 20
Run all tests.

PHASE 21
Run safe end-to-end integration test.

============================================================
37. FINAL ACCEPTANCE CRITERIA
============================================================

The implementation is complete only when:

[ ] Marketing Worker acts as manager/orchestrator.

[ ] Strategy Co-worker is fully implemented and ENABLED.

[ ] Creative Media Co-worker is fully implemented and ENABLED.

[ ] Ads Execution Co-worker is fully implemented and ENABLED.

[ ] Social Media Co-worker exists and is DISABLED.

[ ] Email Marketing Co-worker exists and is DISABLED.

[ ] Influencer Marketing Co-worker exists and is DISABLED.

[ ] Disabled workers cannot be routed/executed.

[ ] Workers can be enabled without rewriting architecture.

[ ] Natural-language routing works.

[ ] Strategy can provide context to Creative Media.

[ ] Creative Media generates two related Flow/Veo prompts.

[ ] Video 1 and Video 2 have explicit continuity instructions.

[ ] UI displays both prompts.

[ ] UI provides Upload Video 1.

[ ] UI provides Upload Video 2.

[ ] Uploads go to Cloudinary.

[ ] Cloudinary URLs are captured automatically.

[ ] Both URLs are sent automatically to n8n webhook.

[ ] n8n integration is asynchronous.

[ ] FFmpeg processing contract exists.

[ ] Final video can return from n8n.

[ ] Final video is stored in Cloudinary.

[ ] Final Cloudinary URL returns to Marketing system.

[ ] Creative Media can analyze final video.

[ ] Marketing Worker receives final result.

[ ] Ads Execution can create campaign DRAFT/PAUSED.

[ ] Real ad activation requires explicit user approval.

[ ] Budget-impacting actions are approval-gated.

[ ] Meta Ads MCP uses only verified supported capabilities.

[ ] MCP permissions follow least privilege.

[ ] Errors are handled clearly.

[ ] Jobs are observable.

[ ] Existing functionality remains intact.

[ ] Existing tests continue passing.

[ ] New tests cover all major functionality.

[ ] No real paid video generation is required.

[ ] No real ad spend occurs during testing.

============================================================
38. FINAL REPORT
============================================================

After implementation, provide a concise report containing:

1. What was analyzed.
2. What was implemented.
3. Files changed.
4. New files created.
5. Worker status:
   - Enabled
   - Disabled
6. Skills added.
7. MCP tools/capabilities added or reused.
8. Cloudinary integration.
9. n8n webhook contract.
10. Media job architecture.
11. Approval system.
12. Meta Ads MCP status.
13. Tests executed.
14. Test results.
15. Any genuine blockers.
16. Any external configuration still required.

IMPORTANT:

Do not report something as implemented if it is only mocked unless clearly marked as mocked.

Do not call a development-environment limitation a worker failure.

Do not leave core requirements as "future work".

Do not make unrelated changes.

The goal is a COMPLETE, modular, safe, production-capable Marketing Worker ecosystem that is already implemented during development, while production-only co-workers remain disabled until explicitly enabled.