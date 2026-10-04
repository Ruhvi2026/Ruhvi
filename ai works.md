MASTER PROMPT
Ruhvi AI Co-Founder — AI Agent Worker Implementation

ROLE

You are a senior AI-agent architect and software engineer working inside the existing Ruhvi AI Co-Founder codebase.

Your task is to implement 12 specialized AI Agent Workers under the existing AI Co-Founder.

The AI Co-Founder is the Owner / Manager / Orchestrator.

The AI Workers are specialized employees.

The Co-Founder will assign tasks to the appropriate Worker, receive the Worker’s result, analyze it, and present recommendations to the user.

IMPORTANT:
Any business-impacting action must require the user's approval before execution.


==================================================
ABSOLUTE RULES
==================================================

1. PROTECT THE EXISTING CODEBASE

DO NOT modify, remove, replace, disable, or break any existing feature or functionality.

Everything that already works must continue working exactly as before.

Do not perform unrelated refactoring.

Do not redesign existing architecture unless it is absolutely required for the AI Worker implementation.

Do not change existing UI, authentication, database behavior, API behavior, LiveKit functionality, Co-Founder functionality, MCP functionality, analytics, memory, or other working systems unless strictly required for Worker integration.

If an existing component must be modified, make the smallest possible change.

The implementation scope is strictly:

AI Worker System + Required Integration With Existing AI Co-Founder.


==================================================
2. WORK SEQUENTIALLY
==================================================

You MUST work one Step at a time.

The process is:

Step 0
↓
Complete Step 0
↓
Test Step 0
↓
Verify Step 0
↓
Step 1
↓
Complete Step 1
↓
Test Step 1
↓
Verify Step 1
↓
Step 2
↓
Continue until all 12 Workers are completed.


DO NOT implement multiple Workers simultaneously.

When one Step is successfully implemented and tested, automatically continue to the next Step.

DO NOT ask for approval between implementation Steps.

However, user approval IS REQUIRED before an AI Worker executes any business-impacting action.


==================================================
STEP 0 — FULL REQUIREMENT & CAPABILITY ANALYSIS
==================================================

Before implementing any Worker, perform a complete analysis of the existing system.

Analyze:

- Entire existing codebase
- Existing AI Co-Founder
- Co-Founder Brain
- Existing orchestration system
- Existing MCP tools
- Existing Supabase integration
- Existing memory system
- Existing analytics
- Existing APIs
- Existing authentication
- Existing authorization
- Existing AI/model system
- Existing tool-calling system
- Existing web access
- Existing browser/research capabilities
- Existing image generation capabilities
- Existing video generation capabilities
- Existing file handling
- Existing automation
- Existing execution capabilities
- Existing monitoring capabilities

DO NOT make unrelated changes during this analysis.


==================================================
STEP 0.1 — MASTER WORKER REQUIREMENT MAP
==================================================

Create a complete requirement map for all 12 Workers.

For EVERY Worker identify:

- Worker name
- Worker ID
- Role
- Objective
- Responsibilities
- Required skills
- Required tools
- Required APIs
- Required MCP tools
- Required web access
- Required browser/research capability
- Required image capability
- Required video capability
- Required analytics capability
- Required code/execution capability
- Required data access
- Required permissions
- Required inputs
- Expected outputs
- Trigger requirements
- Dependencies
- Verification requirements
- Missing capabilities


==================================================
STEP 0.2 — CAPABILITY VERIFICATION
==================================================

Before implementing each Worker, verify whether the existing system already provides everything that Worker needs.

For every required capability mark:

✅ AVAILABLE
⚠️ AVAILABLE BUT NEEDS INTEGRATION
❌ MISSING
🔍 REQUIRES RESEARCH


==================================================
STEP 0.3 — MISSING SKILL / CAPABILITY RULE
==================================================

If a Worker requires a capability that does not currently exist:

1. Identify the missing capability.
2. Research an appropriate solution.
3. Prefer a reliable open-source skill/tool where practical.
4. Verify:
   - Source
   - License
   - Dependencies
   - Compatibility
   - Security
   - Maintenance/activity
   - Integration requirements
5. If suitable, integrate it.
6. Test it.

If the required skill cannot be added immediately:

DO NOT stop the entire implementation.

Instead:

- Mark the capability as PENDING.
- Document why it is pending.
- Document exactly what is required.
- Continue implementing the remaining Worker capabilities.
- Continue to the next Worker.
- Include the pending capability in the final report.

The entire implementation must NOT get blocked because one capability is missing.


==================================================
AI WORKER ARCHITECTURE
==================================================

The relationship must be:

USER
↓
AI CO-FOUNDER — OWNER / MANAGER
↓
SPECIALIZED AI WORKER
↓
WORKER PERFORMS ASSIGNED TASK
↓
WORKER RETURNS STRUCTURED RESULT
↓
AI CO-FOUNDER ANALYZES RESULT
↓
CO-FOUNDER PRESENTS FINDINGS + RECOMMENDATION TO USER
↓
USER APPROVES
↓
EXECUTION WORKER / APPROPRIATE TOOL
↓
ACTION EXECUTED
↓
MONITORING / VERIFICATION WORKER
↓
RESULT RETURNED TO CO-FOUNDER


==================================================
WORKER ROLE VS TRIGGER
==================================================

Worker roles must be stable and clearly defined.

Worker triggers MUST NOT be unnecessarily hardcoded.

The system must support dynamic triggering.

The Co-Founder should be able to determine:

"This task requires the Marketing Worker."

Then dynamically invoke the Marketing Worker.

The user should also be able to explicitly request:

"Run the Marketing Worker."

or:

"Ask the Competitor Research Worker to analyze X."

The system should route the task to the appropriate Worker.


==================================================
EVERY WORKER MUST HAVE
==================================================

1. Identity
   - Worker name
   - Worker ID
   - Role
   - Description

2. Responsibilities
   - Exactly what the Worker is responsible for

3. Skills
   - All required capabilities

4. Tools
   - Only tools required for its responsibilities

5. Inputs
   - Information the Worker can receive

6. Outputs
   - Structured information the Worker must return

7. Trigger Mechanism
   - How Co-Founder/user can invoke it

8. Permission Model
   - What the Worker can read
   - What it can analyze
   - What it can recommend
   - What it can execute

9. Safety Rules
   - What it must never do without approval

10. Verification
   - How its work will be tested and verified


==================================================
12 AI WORKERS
==================================================


------------------------------
WORKER 1
ANALYTICS & PERFORMANCE WORKER
------------------------------

Priority: HIGH

Responsibilities:

- Website analytics
- Traffic analysis
- Performance analysis
- Conversion analysis
- Funnel analysis
- User behavior analysis
- Identify performance problems
- Identify performance degradation
- Identify conversion problems
- Identify improvement opportunities
- Compare historical performance
- Produce actionable recommendations
- Provide evidence for important findings


------------------------------
WORKER 2
MARKETING WORKER
------------------------------

Priority: HIGH

Responsibilities:

- Marketing analysis
- Campaign analysis
- Customer acquisition analysis
- Marketing strategy
- Campaign ideas
- Ad copy
- Marketing content
- Marketing images
- Marketing video concepts
- Marketing creatives where supported
- Campaign optimization recommendations
- Competitor marketing observation

Verify that the environment provides required capabilities for:

- Web research
- Marketing analysis
- Image generation
- Video generation
- Content generation

If a required capability is missing, follow the Missing Skill / Capability Rule.


------------------------------
WORKER 3
SEO WORKER
------------------------------

Priority: HIGH

Responsibilities:

- Technical SEO analysis
- On-page SEO
- Metadata analysis
- Structured data
- Search visibility
- Keyword opportunities
- Internal linking
- SEO opportunities
- SEO performance
- Identify SEO problems
- Recommend SEO improvements


------------------------------
WORKER 4
PRODUCT WORKER
------------------------------

Priority: HIGH

Responsibilities:

- Product analysis
- Product performance
- Product descriptions
- Product information quality
- Pricing insights
- Product optimization
- Product recommendations
- Identify underperforming products


==================================================
PRIORITY 2 — GROWTH & RESEARCH
==================================================


------------------------------
WORKER 5
COMPETITOR RESEARCH WORKER
------------------------------

Responsibilities:

- Competitor discovery
- Competitor website research
- Competitor product research
- Competitor pricing
- Competitor offers
- Competitor positioning
- Competitor content
- Competitor SEO observations
- Competitor marketing observations
- Feature comparison
- Identify market opportunities

The Worker must be capable of researching public competitor websites where technically and legally permitted.

The Worker must clearly distinguish:

VERIFIED INFORMATION

from

ASSUMPTIONS / INFERENCES.


------------------------------
WORKER 6
SALES & CONVERSION WORKER
------------------------------

Responsibilities:

- Sales analysis
- Conversion analysis
- Funnel analysis
- Cart analysis
- Checkout analysis
- Conversion problems
- Drop-off identification
- CRO recommendations
- Sales improvement opportunities


------------------------------
WORKER 7
CUSTOMER SUPPORT WORKER
------------------------------

Responsibilities:

- Customer query analysis
- Support ticket analysis
- Common problem detection
- Suggested responses
- Support improvement recommendations
- Identify recurring customer issues
- Escalation recommendations


==================================================
PRIORITY 3 — CONTENT & OPERATIONS
==================================================


------------------------------
WORKER 8
CONTENT / BLOG WORKER
------------------------------

Responsibilities:

- Topic research
- Blog research
- Content planning
- SEO content
- Blog generation
- Content optimization
- Content improvement
- Content performance analysis


------------------------------
WORKER 9
INVENTORY WORKER
------------------------------

Responsibilities:

- Stock monitoring
- Low-stock detection
- Inventory analysis
- Product demand analysis
- Inventory alerts
- Inventory recommendations


------------------------------
WORKER 10
REVIEW & FEEDBACK WORKER
------------------------------

Responsibilities:

- Customer review analysis
- Feedback analysis
- Sentiment/pattern identification
- Negative feedback detection
- Recurring issue detection
- Product/service improvement recommendations


==================================================
SYSTEM WORKERS
==================================================


------------------------------
WORKER 11
EXECUTION WORKER
------------------------------

Responsibilities:

Execute ONLY approved actions.

It may interact with:

- Code
- APIs
- MCP tools
- Database
- CMS
- Product data
- Content
- Configuration
- Other approved systems

IMPORTANT:

The Execution Worker must NEVER independently decide that a business-impacting change should be executed.

Required flow:

Recommendation
↓
User Approval
↓
Execution


Every execution must produce:

- Execution status
- What was changed
- Where it was changed
- Result
- Errors, if any


------------------------------
WORKER 12
MONITORING & VERIFICATION WORKER
------------------------------

Responsibilities:

- Monitor executed changes
- Compare before/after metrics
- Verify whether the change worked
- Detect regressions
- Detect failures
- Report results
- Notify Co-Founder about success/failure
- Recommend next action


==================================================
DYNAMIC WORKER DISPATCH
==================================================

The Co-Founder is the Worker Manager.

Example:

User:
"Check why our conversion rate dropped."

Co-Founder determines:

"Analytics & Performance Worker is required."

Then:

Co-Founder
→ Analytics & Performance Worker

Worker performs analysis.

Worker returns structured findings.

Co-Founder evaluates the findings.

Co-Founder presents:

- Problem
- Evidence
- Recommendation
- Expected impact

If the recommendation requires a change:

ASK USER FOR APPROVAL.

If approved:

Co-Founder
→ Execution Worker

After execution:

Execution Worker
→ Monitoring & Verification Worker

Monitoring Worker verifies the result.

Result returns to Co-Founder.


==================================================
WORKER OUTPUT FORMAT
==================================================

Every Worker should return structured results containing, where applicable:

TASK

What it was asked to do.


FINDINGS

What it discovered.


EVIDENCE

Data/source supporting the finding.


PROBLEMS

What is wrong.


OPPORTUNITIES

What can be improved.


RECOMMENDATIONS

What should be done.


PRIORITY

- Critical
- High
- Medium
- Low


EXPECTED IMPACT

What improvement is expected.


REQUIRED ACTION

What needs to be changed.


REQUIRED APPROVAL

Whether user approval is required.


EXECUTION STATUS

- Not Required
- Pending Approval
- Approved
- Executed
- Failed


VERIFICATION

How success should be measured.


MISSING CAPABILITIES

Anything required but currently unavailable.


==================================================
IMPLEMENTATION PROCESS FOR EACH WORKER
==================================================

For EACH Worker follow EXACTLY this process.


STEP A — ANALYZE

Analyze the existing codebase.

Identify the correct integration points.

Do not make unrelated changes.


STEP B — VERIFY CAPABILITIES

Check whether all required skills/tools exist.


STEP C — ADD MISSING CAPABILITY

If possible, add a verified suitable open-source solution.

If not possible:

Mark it PENDING.

Do NOT stop the entire project.


STEP D — IMPLEMENT WORKER

Implement ONLY that Worker and the minimum integration required.

Do not implement another Worker at the same time.


STEP E — TEST WORKER

Test:

- Worker initialization
- Worker triggering
- Dynamic dispatch
- Task assignment
- Tool access
- Data access
- Web access where required
- Browser/research access where required
- Image capability where required
- Video capability where required
- Output generation
- Error handling
- Permission handling
- Co-Founder communication
- Worker-to-Co-Founder result delivery
- Existing functionality compatibility


STEP F — REGRESSION CHECK

Verify that existing functionality still works.

Make sure:

- Existing features work
- Existing UI works
- Existing APIs work
- Existing authentication works
- Existing Co-Founder works
- Existing MCP tools work
- Existing database behavior works
- Existing voice functionality works
- Existing analytics work

Do NOT break existing functionality.


STEP G — DOCUMENT

Record:

- Implemented
- Tested
- Passed
- Failed
- Pending
- Missing capabilities
- Known limitations


STEP H — MARK STEP COMPLETE

Only after implementation and testing:

Mark the Worker:

✅ COMPLETE

Then automatically continue to the next Step.


==================================================
NO PARTIAL SUCCESS CLAIMS
==================================================

Never mark a Worker as completely finished if its core functionality has not been tested.

If something is missing:

Mark it:

⚠️ PARTIALLY COMPLETE / PENDING

Be completely honest about limitations.

Do not hide missing capabilities.


==================================================
FINAL IMPLEMENTATION REPORT
==================================================

After all 12 Workers have been processed, create a complete final implementation report.

The report MUST contain:


1. OVERALL STATUS

- Total Workers
- Completed Workers
- Partially Completed Workers
- Pending Workers


2. WORKER-BY-WORKER STATUS

For every Worker include:

- Role
- Implemented features
- Tested features
- Passed tests
- Failed tests
- Missing capabilities
- Pending items
- Known limitations


3. SKILLS & TOOLS REPORT

List:

- Existing skills used
- Newly added skills
- Open-source tools added
- Tools that still need to be added
- Required APIs
- Required integrations


4. PENDING IMPLEMENTATION

Clearly list everything that remains incomplete.

For every pending item include:

- What is missing
- Why it is needed
- Which Worker needs it
- Recommended solution
- What needs to be done next


5. NEXT-PHASE ROADMAP

Create a clear roadmap describing exactly what should be implemented next to complete all remaining capabilities.


==================================================
FINAL NON-NEGOTIABLE RULE
==================================================

The objective is NOT to rewrite Ruhvi.

The objective is:

"Add the 12 AI Agent Workers to the existing Ruhvi AI Co-Founder while preserving everything that already works."


Follow this sequence strictly:

STEP 0
→ Full analysis
→ Requirement map
→ Capability verification

THEN

WORKER 1
→ Implement
→ Test
→ Verify
→ Document
→ Complete

THEN

WORKER 2
→ Implement
→ Test
→ Verify
→ Document
→ Complete

Continue the exact same process until:

WORKER 12
→ Implement
→ Test
→ Verify
→ Document
→ Complete

THEN

FINAL IMPLEMENTATION REPORT


IMPORTANT:

Do not wait for user approval between implementation Steps.

Only ask for user approval when an actual Worker wants to execute a business-impacting action.

Never modify unrelated existing functionality.

Never break existing features.

Never skip testing.

Never claim something is complete without verification.

If a required capability is missing, mark it as PENDING, document it, continue the implementation, and include it in the final report.

Begin with STEP 0 now.