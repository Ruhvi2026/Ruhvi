# RUHVI AI WORKER SYSTEM: REQUIREMENT & CAPABILITY MAP (STEP 0)

**Project:** Ruhvi Luxury E-Commerce AI Co-Founder & AI Agent Worker System  
**Document Version:** 1.0.0  
**Phase:** Step 0 — Full Requirement & Capability Analysis  
**Date:** 2026-10-04  
**Status:** Audit & Architecture Mapping Complete  

---

## 1. Executive Overview

Under the existing Ruhvi AI Co-Founder architecture, the Co-Founder operates as the **Owner / Manager / Orchestrator**. To elevate operational execution, a specialized workforce of **12 AI Agent Workers** is introduced. 

The structural relationship is:
```
USER (Founder / Leadership)
  ⇅
AI CO-FOUNDER (Owner / Manager / Orchestrator)
  ├── Worker 1: Analytics & Performance Worker (High Priority)
  ├── Worker 2: Marketing Worker (High Priority)
  ├── Worker 3: SEO Worker (High Priority)
  ├── Worker 4: Product Worker (High Priority)
  ├── Worker 5: Competitor Research Worker (Growth & Research)
  ├── Worker 6: Sales & Conversion Worker (Growth & Research)
  ├── Worker 7: Customer Support Worker (Growth & Research)
  ├── Worker 8: Content / Blog Worker (Content & Operations)
  ├── Worker 9: Inventory Worker (Content & Operations)
  ├── Worker 10: Review & Feedback Worker (Content & Operations)
  ├── Worker 11: Execution Worker (System Worker - Strict Human-in-the-Loop)
  └── Worker 12: Monitoring & Verification Worker (System Worker - Closed-Loop Verification)
```

---

## 2. STEP 0 — Full Requirement & Capability Analysis

A complete audit of the active Ruhvi system confirms the following capabilities across 20 foundational dimensions:

| Dimension | Existing System Capability | Status |
|---|---|:---:|
| **1. Entire Existing Codebase** | Next.js 15 App Router (TypeScript), Tailwind CSS, Lucide icons, comprehensive backend utilities, Jest + ts-jest test suite. | ✅ AVAILABLE |
| **2. Existing AI Co-Founder** | Multimodal Co-Founder operational via text portal (`co-founder.ruhvi.in`) and WebRTC voice. | ✅ AVAILABLE |
| **3. Co-Founder Brain** | `src/lib/ai/co-founder/brain.ts` with context prioritization, live DB snapshotting, memory blocks, and tool definitions. | ✅ AVAILABLE |
| **4. Existing Orchestration System** | Multi-level failover AI orchestration engine (`src/lib/ai/index.ts`) supporting Anthropic, Gemini, OpenAI, DeepSeek, OpenRouter. | ✅ AVAILABLE |
| **5. Existing MCP Tools** | `src/lib/ai/mcp-tools.ts` with 40+ read and write tools for products, orders, customers, coupons, reviews, categories. | ✅ AVAILABLE |
| **6. Supabase Integration** | `@supabase/ssr` and `@supabase/supabase-js` service clients with full RLS, audit logging, and transactional safety. | ✅ AVAILABLE |
| **7. Existing Memory System** | `co_founder_memories` table with semantic categories (`strategic_directive`, `founder_preference`, `operational_fact`). | ✅ AVAILABLE |
| **8. Existing Analytics** | `src/lib/ai/co-founder/analytics.ts` and `business-intelligence.ts` supporting normalized timeframe calculations, AOV, cancellations, trends. | ✅ AVAILABLE |
| **9. Existing APIs** | Next.js API routes under `/api/*` for checkout, orders, catalog, task manager, admin telemetry, and AI endpoints. | ✅ AVAILABLE |
| **10. Existing Authentication** | Firebase Auth + Supabase session verification with strict cryptographic JWT token handling. | ✅ AVAILABLE |
| **11. Existing Authorization** | Scope-based RBAC (`src/lib/ai/mcp-auth.ts`) enforcing `admin:full`, `mcp_tools:read`, `mcp_tools:write`. | ✅ AVAILABLE |
| **12. Existing AI/Model System** | Gemini 2.0 Flash, GPT-4o, Claude 3.5 Sonnet, DeepSeek V3 with dynamic credential rotation and health tracking. | ✅ AVAILABLE |
| **13. Existing Tool-Calling System** | Declarative tool calling via `CO_FOUNDER_TOOL_DECLARATIONS` and `tool-bridge.ts`. | ✅ AVAILABLE |
| **14. Existing Web Access** | Server-side fetch, external API integrations, HTTP client support. | ✅ AVAILABLE |
| **15. Existing Browser/Research Capabilities** | Real headless Playwright browser engine (`src/lib/ai/browser/playwright.ts`) supporting live crawling, SPA rendering, text extraction, screenshots. | ✅ AVAILABLE |
| **16. Existing Image Generation Capabilities** | Cloudinary image asset pipeline (`src/lib/imageService.ts`); structured prompt generation via LLM. Dedicated image generation models (e.g. Imagen 3 / DALL-E) can be invoked via tool calls. | ⚠️ AVAILABLE BUT NEEDS INTEGRATION |
| **17. Existing Video Generation Capabilities** | No direct video synthesis provider (e.g., Sora / Runway / Veo API key) is configured in the environment. | 🔍 REQUIRES RESEARCH / ⚠️ PENDING |
| **18. Existing File Handling** | Cloudinary asset management, filesystem read/write for local reports, template compilation via Handlebars. | ✅ AVAILABLE |
| **19. Existing Automation** | Task Manager with checklist execution (`action-planner.ts`), cron jobs (`task-scheduler.mjs`, `/api/cron/*`), proactive background scanners. | ✅ AVAILABLE |
| **20. Existing Execution & Monitoring** | Action engine with idempotency (`action-engine.ts`), approval engine (`approvals.ts`), closed-loop outcome tracking (`outcomes.ts`). | ✅ AVAILABLE |

---

## 3. STEP 0.1 — Master Worker Requirement Map (All 12 Workers)

```
================================================================================
WORKER 1: ANALYTICS & PERFORMANCE WORKER
================================================================================
- Worker Name: Analytics & Performance Worker
- Worker ID: worker_analytics_performance
- Role: Chief Analytical Officer & Store Data Scientist
- Objective: Monitor store telemetry, traffic, conversions, funnel performance, and highlight regressions and anomalies with empirical evidence.
- Responsibilities: Website analytics, traffic analysis, performance analysis, conversion rate analysis, funnel drop-off analysis, user behavior analysis, identify degradation, compare historical cohorts, produce actionable recommendations with quantitative evidence.
- Required Skills: Data aggregation, cohort comparison, anomaly detection, statistical significance testing.
- Required Tools: getStoreAnalytics, runBusinessIntelligenceScan, getHolisticBusinessContext.
- Required APIs: Supabase DB, Storefront analytics, PostHog/Google Analytics.
- Required MCP Tools: get_store_metrics, get_sales_analytics, get_orders.
- Required Web Access: Internal store analytics endpoints.
- Required Browser/Research Capability: None (internal data).
- Required Image Capability: None.
- Required Video Capability: None.
- Required Analytics Capability: Deep statistical analysis, period comparison, anomaly detection.
- Required Code/Execution Capability: Read-only data queries and calculations.
- Required Data Access: Orders, order items, page views, session events, customers.
- Required Permissions: mcp_tools:read, admin:analytics.
- Required Inputs: Timeframe ('today', 'yesterday', '7d', '30d', 'this_month'), metric focus, comparison mode.
- Expected Outputs: Structured findings, metric baseline comparisons, anomalies, drop-offs, expected revenue impact, recommendations.
- Trigger Requirements: Dynamic dispatch on analytical inquiries, proactive cron scans, explicit Co-Founder task assignment.
- Dependencies: Supabase orders & order_items tables, sales-metrics engine.
- Verification Requirements: Verified baseline calculation, non-negative totals, mathematical consistency across period-over-period deltas.
- Missing Capabilities: None (All core analytical engines exist in src/lib/ai/co-founder/analytics.ts).

================================================================================
WORKER 2: MARKETING WORKER
================================================================================
- Worker Name: Marketing Worker
- Worker ID: worker_marketing
- Role: Growth Marketing Director & Campaign Strategist
- Objective: Formulate acquisition strategies, design high-converting ad copy and marketing hooks, propose creative campaigns, and observe competitor marketing vectors.
- Responsibilities: Marketing analysis, campaign ideation, acquisition funnel analysis, marketing strategy, ad copy generation, marketing content generation, marketing image prompt crafting, marketing video concept scripts, creative campaign proposals, competitor observation.
- Required Skills: Marketing copywriting, campaign structuring, audience segmentation, creative ideation, visual prompt engineering.
- Required Tools: AI multi-provider generation (Gemini/OpenAI), Cloudinary asset service, browse_website for competitor ads/hooks.
- Required APIs: Supabase coupons/campaigns, AI model provider (OpenAI/Gemini/Anthropic).
- Required MCP Tools: get_coupons, browse_website, get_store_metrics.
- Required Web Access: Yes (Competitor marketing channels, social trend research).
- Required Browser/Research Capability: Playwright browser for landing page inspection.
- Required Image Capability: Visual creative generation & prompt synthesis.
- Required Video Capability: Video concept scripting, storyboard generation (Video rendering API marked PENDING).
- Required Analytics Capability: Campaign conversion rate and ROAS tracking.
- Required Code/Execution Capability: Generating coupon codes and campaign drafts (subject to approval).
- Required Data Access: Coupon usage, customer segments, recent orders.
- Required Permissions: mcp_tools:read, mcp_tools:write (draft only).
- Required Inputs: Campaign objective, target audience, product focus, seasonal event (e.g. Diwali, Wedding Season).
- Expected Outputs: Campaign brief, headlines, primary copy, hook variations, visual image prompts, video storyboards, coupon strategy.
- Trigger Requirements: Co-Founder marketing queries, low-sales alerts, seasonal campaign triggers.
- Dependencies: AI generation pipeline, coupons table.
- Verification Requirements: Ad copy length limits, brand voice compliance (luxury fine jewellery tone), valid discount bounds.
- Missing Capabilities: Direct video generation rendering engine (marked PENDING; storyboards/scripts provided immediately).

================================================================================
WORKER 3: SEO WORKER
================================================================================
- Worker Name: SEO Worker
- Worker ID: worker_seo
- Role: Head of Technical SEO & Search Discovery
- Objective: Maximize organic search visibility, audit technical metadata, validate schema markup, and identify high-value luxury jewellery keyword opportunities.
- Responsibilities: Technical SEO audits, on-page SEO analysis, meta title/description audits, structured data (JSON-LD) validation, search visibility assessment, keyword opportunity discovery, internal linking analysis, SEO health scoring, actionable optimization recommendations.
- Required Skills: Technical SEO auditing, schema markup generation, keyword density and search intent analysis, crawlability checking.
- Required Tools: auditCatalogSeoHealth, browse_website, search_web.
- Required APIs: Supabase products & categories tables.
- Required MCP Tools: get_products, get_product_detail, get_categories.
- Required Web Access: Yes (SERP inspection, competitor meta tags).
- Required Browser/Research Capability: Playwright browser for rendered HTML inspection.
- Required Image Capability: Alt-text audit & optimization.
- Required Video Capability: None.
- Required Analytics Capability: Search ranking estimation, organic traffic index.
- Required Code/Execution Capability: Proposing metadata updates to product and category records.
- Required Data Access: Product slugs, titles, meta descriptions, image alt tags, JSON-LD schemas.
- Required Permissions: mcp_tools:read, mcp_tools:write (metadata updates subject to approval).
- Required Inputs: Catalog slice, category, specific product ID, or sitewide audit request.
- Expected Outputs: SEO health score, missing metadata count, structured data defects, keyword recommendations, ready-to-apply title/meta tags.
- Trigger Requirements: Scheduled catalog audit, Co-Founder SEO inquiries, new product launch triggers.
- Dependencies: src/lib/ai/co-founder/seo-health.ts, products table.
- Verification Requirements: Meta length constraints (Title: 50-60 chars, Description: 140-160 chars), valid JSON-LD format.
- Missing Capabilities: None (Built on catalog SEO health module + live DOM scraping).

================================================================================
WORKER 4: PRODUCT WORKER
================================================================================
- Worker Name: Product Worker
- Worker ID: worker_product
- Role: Principal Product & Merchandising Manager
- Objective: Audit catalog presentation, enrich luxury product descriptions, analyze price points and unit economics, and identify underperforming items.
- Responsibilities: Product catalog analysis, product performance evaluation, description quality auditing, luxury copy enhancement, pricing insights and margin analysis, product optimization recommendations, flagging underperforming or dead inventory items.
- Required Skills: Merchandising strategy, luxury copywriting, margin analysis, catalog taxonomy optimization.
- Required Tools: AI structured product generation, getHolisticBusinessContext.
- Required APIs: Supabase products, categories, and order_items tables.
- Required MCP Tools: get_products, get_product_detail, update_product_stock.
- Required Web Access: None (internal catalog focus).
- Required Browser/Research Capability: None.
- Required Image Capability: Validating product image completeness and gallery standards.
- Required Video Capability: None.
- Required Analytics Capability: SKU sales velocity, revenue contribution per product.
- Required Code/Execution Capability: Generating enriched description updates (requires approval before DB write).
- Required Data Access: Product pricing, MRP, descriptions, materials, tags, images, order history.
- Required Permissions: mcp_tools:read, mcp_tools:write (draft updates).
- Required Inputs: Product ID, category ID, or underperforming SKU query.
- Expected Outputs: Catalog health report, descriptive enrichment proposals, pricing recommendations, underperforming SKU warnings.
- Trigger Requirements: New product drafts, inventory stagnation alerts, Co-Founder merchandising queries.
- Dependencies: products table, order_items table.
- Verification Requirements: Anti-tarnish & 22K gold plating brand claims accuracy, positive margin enforcement.
- Missing Capabilities: None.

================================================================================
WORKER 5: COMPETITOR RESEARCH WORKER
================================================================================
- Worker Name: Competitor Research Worker
- Worker ID: worker_competitor_research
- Role: Director of Competitive Intelligence
- Objective: Discover, track, and dissect competitor offerings, pricing, promotions, and positioning in the luxury demi-fine jewellery segment.
- Responsibilities: Competitor discovery, public website research, product catalog comparison, pricing analysis, discount/offer monitoring, positioning analysis, content & SEO strategy observation, feature matrix comparison, market opportunity identification.
- Required Skills: Competitive benchmarking, Web scraping, SERP analysis, differentiation analysis.
- Required Tools: browse_website (Playwright), getCompetitors, addCompetitor, analyzeCompetitor.
- Required APIs: Competitor DB registry, Playwright browser engine.
- Required MCP Tools: browse_website, get_competitors.
- Required Web Access: Full public web access.
- Required Browser/Research Capability: Playwright headless browser for live competitor URL inspection and screenshots.
- Required Image Capability: Screenshot analysis of competitor landing pages.
- Required Video Capability: None.
- Required Analytics Capability: Price point distribution and discount depth analysis.
- Required Code/Execution Capability: Storing competitor records in competitors table.
- Required Data Access: co_founder_competitors table, external competitor websites.
- Required Permissions: mcp_tools:read, mcp_tools:write.
- Required Inputs: Competitor URL, competitor name, category focus (e.g. 'chokers', 'bridal').
- Expected Outputs: Competitor profile, extracted pricing hooks, promotional offers, SWOT differentiation points, verified facts vs inferred assumptions.
- Trigger Requirements: Co-Founder competitor inquiry, pricing strategy review, new competitor detection.
- Dependencies: src/lib/ai/browser/playwright.ts, src/lib/ai/co-founder/competitors.ts.
- Verification Requirements: Explicit separation of VERIFIED FACTS from INFERRED ASSUMPTIONS, valid HTTP/HTTPS URLs.
- Missing Capabilities: None (Fully integrated with Playwright).

================================================================================
WORKER 6: SALES & CONVERSION WORKER
================================================================================
- Worker Name: Sales & Conversion Worker
- Worker ID: worker_sales_conversion
- Role: VP of Conversion Rate Optimization (CRO) & E-Commerce Sales
- Objective: Dissect the sales funnel from visitor to checkout, isolate friction points and abandonment causes, and formulate high-impact CRO interventions.
- Responsibilities: Sales volume and revenue trend analysis, checkout funnel drop-off analysis, cart abandonment analysis, conversion bottleneck diagnosis, identifying high-risk customer friction, formulating CRO recommendations, seasonal sales uplift strategies.
- Required Skills: Funnel conversion analysis, checkout friction auditing, unit economics, A/B test formulation.
- Required Tools: getStoreAnalytics, getHolisticBusinessContext, runBusinessIntelligenceScan.
- Required APIs: Supabase orders, order_items, customers tables.
- Required MCP Tools: get_store_metrics, get_sales_analytics, get_orders, get_order_detail.
- Required Web Access: None.
- Required Browser/Research Capability: None.
- Required Image Capability: None.
- Required Video Capability: None.
- Required Analytics Capability: Conversion funnel calculation, checkout completion rate, AOV metrics.
- Required Code/Execution Capability: Proposing checkout/cart optimizations and incentives.
- Required Data Access: Order statuses, payment statuses, cancellation reasons, coupon usages.
- Required Permissions: mcp_tools:read.
- Required Inputs: Timeframe, segment (new vs returning), channel.
- Expected Outputs: Funnel conversion rates, detected drop-off stages, estimated revenue lost to friction, prioritized CRO recommendations.
- Trigger Requirements: Conversion dip proactive signal, Co-Founder sales inquiries, monthly business reviews.
- Dependencies: orders and sales analytics modules.
- Verification Requirements: Mathematically valid percentage calculations (0% to 100%), statistical confidence check.
- Missing Capabilities: None.

================================================================================
WORKER 7: CUSTOMER SUPPORT WORKER
================================================================================
- Worker Name: Customer Support Worker
- Worker ID: worker_customer_support
- Role: Head of Customer Experience & Support Intelligence
- Objective: Audit customer inquiries, detect recurring delivery or product friction, generate empathetic executive responses, and recommend CX fixes.
- Responsibilities: Customer query analysis, support ticket backlog monitoring, root cause classification of complaints, recurring quality/delivery issue detection, generating empathetic high-touch response drafts, escalation recommendations, service policy improvements.
- Required Skills: Sentiment analysis, ticket classification, customer de-escalation, service recovery.
- Required Tools: getHolisticBusinessContext, get_support_tickets.
- Required APIs: Supabase support_tickets and customer tables, WhatsApp notification service.
- Required MCP Tools: get_support_tickets, get_customers, send_whatsapp_message.
- Required Web Access: None.
- Required Browser/Research Capability: None.
- Required Image Capability: Inspecting customer-uploaded damage photos if attached.
- Required Video Capability: None.
- Required Analytics Capability: First response time, resolution time, complaint categorization.
- Required Code/Execution Capability: Proposing ticket status transitions and response templates (requires approval).
- Required Data Access: Support tickets, customer communication history, order tracking.
- Required Permissions: mcp_tools:read, mcp_tools:write (updates gated by approval).
- Required Inputs: Ticket ID, customer ID, or support queue status filter.
- Expected Outputs: Backlog status, complaint patterns, urgent escalations, recommended response draft, preventive operational fix.
- Trigger Requirements: High-priority ticket alerts, customer dissatisfaction signals, Co-Founder support inquiries.
- Dependencies: support_tickets table, WhatsApp service.
- Verification Requirements: Empathetic luxury brand tone, accurate order context, safe data boundaries.
- Missing Capabilities: None.

================================================================================
WORKER 8: CONTENT / BLOG WORKER
================================================================================
- Worker Name: Content / Blog Worker
- Worker ID: worker_content_blog
- Role: Editor-in-Chief & Editorial Brand Strategist
- Objective: Research high-intent jewellery topics, plan editorial calendars, write engaging SEO-optimized articles, and enrich Ruhvi's brand narrative.
- Responsibilities: Topic research, luxury jewellery editorial planning, SEO article drafting, blog post optimization, internal product linking recommendations, content performance review, formatting rich markdown content.
- Required Skills: Editorial writing, jewellery craft storytelling, SEO content optimization, keyword placement.
- Required Tools: AI multi-provider generation engine, auditCatalogSeoHealth, browse_website.
- Required APIs: AI models (Claude/Gemini/OpenAI), Supabase catalog.
- Required MCP Tools: get_products, get_categories.
- Required Web Access: Trend research and keyword validation.
- Required Browser/Research Capability: Playwright for checking styling and editorial references.
- Required Image Capability: Generating header image prompts and creative layout briefs.
- Required Video Capability: Video concept summaries for social media snippets.
- Required Analytics Capability: Article readability scoring, keyword density.
- Required Code/Execution Capability: Generating complete publication-ready blog drafts in markdown.
- Required Data Access: Existing products, brand guidelines, customer styling questions.
- Required Permissions: mcp_tools:read, mcp_tools:write (draft creation).
- Required Inputs: Topic idea, target keyword, product line to feature, word count target.
- Expected Outputs: Complete structured blog post, meta description, SEO headings (H1, H2, H3), featured image prompt, product link placements.
- Trigger Requirements: Editorial schedule triggers, seasonal fashion events, Co-Founder content inquiries.
- Dependencies: AI generation engine, brand foundation knowledge.
- Verification Requirements: Minimum word count, proper heading hierarchy, inclusion of authentic craft details (22K gold plating, anti-tarnish).
- Missing Capabilities: None.

================================================================================
WORKER 9: INVENTORY WORKER
================================================================================
- Worker Name: Inventory Worker
- Worker ID: worker_inventory
- Role: Chief Supply Chain & Inventory Operations Officer
- Objective: Track catalog stock levels, forecast stockouts, identify sluggish capital, and generate precise restocking and vendor purchase recommendations.
- Responsibilities: Real-time stock monitoring, low-stock threshold detection (<= 5 units), out-of-stock emergency detection, sales velocity tracking per SKU, days-of-inventory-remaining forecasting, reorder point recommendations, dead stock identification.
- Required Skills: Demand forecasting, stock velocity calculation, safety stock modeling, supply chain alert triage.
- Required Tools: getHolisticBusinessContext, get_inventory_levels, runBusinessIntelligenceScan.
- Required APIs: Supabase products and order_items tables.
- Required MCP Tools: get_inventory, get_products, update_inventory_stock.
- Required Web Access: None.
- Required Browser/Research Capability: None.
- Required Image Capability: None.
- Required Video Capability: None.
- Required Analytics Capability: Run-rate forecasting, stock turn ratio, lead-time safety buffer.
- Required Code/Execution Capability: Generating restock orders and stock adjustment proposals (requires approval).
- Required Data Access: Product stock quantities, cost, SKU velocities, order dates.
- Required Permissions: mcp_tools:read, mcp_tools:write (execution strictly gated).
- Required Inputs: Stock threshold, category filter, SKU lookup, timeframe for velocity.
- Expected Outputs: Low-stock list, stockout risk horizon (days remaining), reorder quantities, inventory health score.
- Trigger Requirements: Proactive inventory alerts, stock exhaustion events, Co-Founder supply inquiries.
- Dependencies: products table, inventory utilities.
- Verification Requirements: Non-negative stock numbers, valid SKU mappings, realistic lead-time assumptions.
- Missing Capabilities: None.

================================================================================
WORKER 10: REVIEW & FEEDBACK WORKER
================================================================================
- Worker Name: Review & Feedback Worker
- Worker ID: worker_review_feedback
- Role: Customer Sentiment & Product Quality Analyst
- Objective: Ingest and analyze product reviews, extract recurring sentiment themes, flag craftsmanship or shipping defects, and recommend quality improvements.
- Responsibilities: Review collection and sentiment scoring, customer feedback analysis, praise vs complaint pattern extraction, defect detection (e.g. clasp issues, discoloration, packaging damage), feedback-to-product attribution, continuous product improvement recommendations.
- Required Skills: Sentiment analysis, text mining, quality defect classification, voice-of-customer synthesis.
- Required Tools: getHolisticBusinessContext, get_reviews.
- Required APIs: Supabase reviews and products tables.
- Required MCP Tools: get_reviews, get_product_detail.
- Required Web Access: None.
- Required Browser/Research Capability: None.
- Required Image Capability: Review photo analysis if customer attached pictures.
- Required Video Capability: None.
- Required Analytics Capability: Net sentiment score, rating distribution, theme frequency.
- Required Code/Execution Capability: None (analytical and advisory).
- Required Data Access: Product reviews, ratings, verified purchase status, customer comments.
- Required Permissions: mcp_tools:read.
- Required Inputs: Product ID, rating threshold (e.g. <= 3 stars), timeframe.
- Expected Outputs: Average rating, sentiment distribution, key recurring praise points, critical quality alerts, actionable manufacturing/packaging fixes.
- Trigger Requirements: Negative review submission, quality audit cycles, Co-Founder feedback inquiries.
- Dependencies: reviews table.
- Verification Requirements: Empirical quote extraction from verified reviews, unbiased sentiment scoring.
- Missing Capabilities: None.

================================================================================
WORKER 11: EXECUTION WORKER (SYSTEM WORKER)
================================================================================
- Worker Name: Execution Worker
- Worker ID: worker_execution
- Role: Autonomous Operational Executor & Transaction Guard
- Objective: Safely execute ONLY approved business actions across database, CMS, Task Manager, communications, and external APIs with zero unauthorized actions.
- Responsibilities: Validate cryptographic approval tokens, verify approval expiration and status, enforce strict permission boundaries, execute database mutations with rollback safety, create tasks in Ruhvi Task Manager, record detailed audit logs, handle execution failures gracefully.
- Required Skills: Transaction management, idempotency enforcement, error recovery, cryptographic verification.
- Required Tools: executeApprovedBusinessAction, executeActionPlanToTaskManager, approvals engine.
- Required APIs: Supabase DB, Task Manager API, WhatsApp/FCM/Email services.
- Required MCP Tools: execute_approved_action, execute_action_plan, update_inventory_stock.
- Required Web Access: Specific external service endpoints (WhatsApp, Resend).
- Required Browser/Research Capability: None.
- Required Image Capability: None.
- Required Video Capability: None.
- Required Analytics Capability: None.
- Required Code/Execution Capability: Full authorized mutation capability within approved bounds.
- Required Data Access: co_founder_approvals, audit_logs, relevant business tables.
- Required Permissions: mcp_tools:write, admin:full.
- Required Inputs: Approved Action ID (UUID), target action type, validated payload, staff/admin ID.
- Expected Outputs: Execution status ('executed' or 'failed'), entity ID, timestamp, before/after snapshot, audit log record.
- Trigger Requirements: Explicit user approval of an approval request, execution of approved action plan.
- Dependencies: src/lib/ai/co-founder/action-engine.ts, approvals.ts, audit.ts.
- Verification Requirements: Rejection of any unapproved or expired request, idempotency key check (never execute same approval twice), zero data corruption.
- Missing Capabilities: None (Built on existing hardened Stage 7 Action Engine).

================================================================================
WORKER 12: MONITORING & VERIFICATION WORKER (SYSTEM WORKER)
================================================================================
- Worker Name: Monitoring & Verification Worker
- Worker ID: worker_monitoring_verification
- Role: Chief Quality Inspector & Closed-Loop Verification Officer
- Objective: Inspect executed actions, track delayed business outcomes against initial projections, detect performance regressions, and report closed-loop learning to the Co-Founder.
- Responsibilities: Post-execution health monitoring, comparing pre-change vs post-change metrics, verifying whether executed changes solved the target problem, detecting regressions or unintended side effects, calculating actual vs expected ROI, reporting verified outcomes to Co-Founder memory.
- Required Skills: Closed-loop measurement, regression testing, variance analysis, attribution modeling.
- Required Tools: verifyDueActionPlanOutcomes, recordOutcomeEvent, getOutcomeAnalytics, getStoreAnalytics.
- Required APIs: Supabase co_founder_outcomes, co_founder_action_plans, audit_logs.
- Required MCP Tools: get_outcome_analytics, record_outcome_feedback, get_sales_analytics.
- Required Web Access: None.
- Required Browser/Research Capability: Playwright browser for validating live frontend elements post-deploy.
- Required Image Capability: None.
- Required Video Capability: None.
- Required Analytics Capability: Time-series variance, outcome attribution, statistical difference testing.
- Required Code/Execution Capability: Updating outcome status in database, writing verified findings to business memory.
- Required Data Access: Historical metrics, action logs, outcome records, business memory.
- Required Permissions: mcp_tools:read, mcp_tools:write.
- Required Inputs: Action ID, Plan ID, verification timeframe (e.g. 24h, 7d), expected metric targets.
- Expected Outputs: Verification status ('verified_success', 'neutral', 'regression', 'failed'), baseline vs actual delta, unexpected side effects, recommended next action.
- Trigger Requirements: Scheduled outcome verification cron, post-execution follow-up, Co-Founder verification queries.
- Dependencies: src/lib/ai/co-founder/outcomes.ts, action-planner.ts.
- Verification Requirements: Strict factual attribution, flags shortfalls > 25% as conflicts, persists learnings to long-term memory.
- Missing Capabilities: None.
================================================================================
```

---

## 4. STEP 0.2 — Capability Verification Matrix

| Worker | Capability Needed | Status | Current Provider / Location | Notes |
|---|---|:---:|---|---|
| **Worker 1 (Analytics)** | Store Sales Metrics | ✅ AVAILABLE | `src/lib/ai/co-founder/analytics.ts` | Complete |
| | KPI Baseline Comparison | ✅ AVAILABLE | `src/lib/ai/co-founder/analytics.ts` | Normalized 7d/30d periods |
| | Anomaly Detection | ✅ AVAILABLE | `src/lib/ai/co-founder/business-intelligence.ts` | Threshold-based scanner |
| **Worker 2 (Marketing)** | AI Copywriting & Strategy | ✅ AVAILABLE | `src/lib/ai/index.ts` | Gemini 2.0 / GPT-4o / Claude |
| | Competitor Ad Crawling | ✅ AVAILABLE | `src/lib/ai/browser/playwright.ts` | Headless Playwright engine |
| | Visual Image Prompts | ✅ AVAILABLE | AI Prompts + Cloudinary | Generates detailed creative prompts |
| | Direct Video Generation | 🔍 REQUIRES RESEARCH | Video API provider | Documented as PENDING |
| **Worker 3 (SEO)** | Catalog SEO Health Audit | ✅ AVAILABLE | `src/lib/ai/co-founder/seo-health.ts` | Meta & slug validator |
| | Live SERP / Competitor Crawl | ✅ AVAILABLE | `src/lib/ai/browser/playwright.ts` | Playwright browser |
| | Schema Markup Generation | ✅ AVAILABLE | `src/lib/ai/index.ts` | JSON-LD generator |
| **Worker 4 (Product)** | Product Catalog Analysis | ✅ AVAILABLE | `src/lib/ai/mcp-tools.ts` | DB queries |
| | Description Enrichment | ✅ AVAILABLE | `src/lib/ai/index.ts` | Multi-model generator |
| | Pricing Insights | ✅ AVAILABLE | `src/lib/ai/co-founder/analytics.ts` | AOV & margins |
| **Worker 5 (Competitor)** | Public Web Browsing | ✅ AVAILABLE | `src/lib/ai/browser/playwright.ts` | Headless Playwright engine |
| | Competitor Tracking Registry | ✅ AVAILABLE | `src/lib/ai/co-founder/competitors.ts` | Supabase `competitors` table |
| | Screenshots & Hook Extraction | ✅ AVAILABLE | `src/lib/ai/browser/playwright.ts` | Visual & text capture |
| **Worker 6 (Sales & CRO)** | Funnel & Cart Analytics | ✅ AVAILABLE | `src/lib/ai/co-founder/analytics.ts` | Orders & status tracking |
| | Friction Diagnosis | ✅ AVAILABLE | `src/lib/ai/co-founder/root-cause.ts` | RCA Engine |
| | CRO Recommendation Model | ✅ AVAILABLE | `src/lib/ai/co-founder/strategy-engine.ts` | Quantitative impact |
| **Worker 7 (Customer Support)** | Support Ticket Queues | ✅ AVAILABLE | `src/lib/ai/mcp-tools.ts` | `support_tickets` table |
| | Sentiment Analysis | ✅ AVAILABLE | `src/lib/ai/index.ts` | LLM sentiment classifier |
| | Customer Notifications | ✅ AVAILABLE | `src/lib/whatsapp.ts`, `src/lib/resend.ts` | WhatsApp & Email |
| **Worker 8 (Content / Blog)** | Topic & Keyword Research | ✅ AVAILABLE | `src/lib/ai/index.ts` | Generative research |
| | Long-form Markdown Drafting | ✅ AVAILABLE | `src/lib/ai/index.ts` | Markdown blog generator |
| | Internal Linking Mapping | ✅ AVAILABLE | `src/lib/ai/co-founder/seo-health.ts` | Product slug index |
| **Worker 9 (Inventory)** | Stock Level Monitoring | ✅ AVAILABLE | `src/lib/inventory.ts` | Real-time DB stock |
| | Velocity & Run-Rate Alerts | ✅ AVAILABLE | `src/lib/ai/co-founder/proactive.ts` | Stockout warning signals |
| | Restock Reordering Models | ✅ AVAILABLE | `src/lib/ai/co-founder/strategy-engine.ts` | Supply chain heuristics |
| **Worker 10 (Review)** | Customer Review Ingestion | ✅ AVAILABLE | `src/lib/ai/mcp-tools.ts` | `reviews` table |
| | Sentiment & Defect Mining | ✅ AVAILABLE | `src/lib/ai/index.ts` | Qualitative synthesis |
| | Quality Recommendation Loop | ✅ AVAILABLE | `src/lib/ai/co-founder/outcomes.ts` | Learning feedback |
| **Worker 11 (Execution)** | Approval Validation | ✅ AVAILABLE | `src/lib/ai/co-founder/approvals.ts` | Cryptographic gating |
| | Transactional Mutators | ✅ AVAILABLE | `src/lib/ai/co-founder/action-engine.ts` | Idempotent DB write |
| | Task Manager Integration | ✅ AVAILABLE | `src/lib/ai/co-founder/action-planner.ts` | Task & checklist routing |
| | Audit Logging | ✅ AVAILABLE | `src/lib/audit.ts` | `audit_logs` table |
| **Worker 12 (Monitoring)** | Before/After Metric Delta | ✅ AVAILABLE | `src/lib/ai/co-founder/outcomes.ts` | Empirical DB validation |
| | Regression Detection | ✅ AVAILABLE | `src/lib/ai/co-founder/outcomes.ts` | Conflict tracking (>25%) |
| | Memory Persistence | ✅ AVAILABLE | `src/lib/ai/co-founder/memory.ts` | `co_founder_memories` |

---

## 5. STEP 0.3 — Missing Skill / Capability Analysis & Action Plan

In accordance with the **Missing Skill / Capability Rule**:

1. **Direct Video Generation API (Worker 2 - Marketing Worker):**
   - **Current Status:** 🔍 REQUIRES RESEARCH / ⚠️ PENDING
   - **Why it is needed:** To automatically render promotional video reels, Instagram Stories, and video ads directly from creative concepts.
   - **Why it is pending:** Ruhvi's production environment currently does not have dedicated API credentials for Sora, Runway Gen-3, or Google Veo configured.
   - **Non-blocking resolution:** Worker 2 will generate production-grade video scripts, shot-by-shot storyboards, visual direction, and audio voiceover prompts immediately. The automated video rendering pipeline is cataloged as a Phase 2 roadmap item.
   - **The implementation does not stall.**

2. **Automated AI Image Generation Provider (Worker 2 & Worker 8):**
   - **Current Status:** ⚠️ AVAILABLE BUT NEEDS DIRECT MODEL CALL INTEGRATION
   - **Why it is needed:** Creating visual mockups for ad creatives and blog hero headers.
   - **Resolution:** The AI Orchestration engine (`src/lib/ai/index.ts`) already connects to OpenAI (DALL-E 3 compatible) and Gemini. The workers will format generation requests cleanly, and generate descriptive creative prompts ready for immediate rendering or manual creative signoff.

---

## 6. Step 0 Conclusion & Verification

All 12 AI Agent Workers have clear identities, role boundaries, tool interfaces, safety permissions, and output contracts.

The existing codebase provides:
- Live database queries and transaction engines
- Multi-provider AI orchestration
- Headless Playwright browser crawling
- Task Manager action execution
- Cryptographic human-in-the-loop approval gating
- Closed-loop outcome tracking

**STEP 0 is complete, verified, and ready. We now proceed sequentially to Worker 1: Analytics & Performance Worker.**
