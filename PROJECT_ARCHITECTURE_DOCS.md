# Project Ruhvi - Comprehensive Documentation

> [!IMPORTANT]
> **CRITICAL PROJECT FILE**: This document contains the full architecture, dependency graph, API registry, feature index, and customization structure for Project Ruhvi. **DO NOT DELETE OR OVERWRITE THIS FILE** without explicit authorization from the project owner.

> **Description:** Knowledge graph of Project Ruhvi
> **Languages:** 
> **Frameworks:** 

## 🏗️ Architecture (Layers)

### Frontend & UI Components
User interface components, pages, hooks, and React state management

### Services & Business Logic
Application services, API integrations, utility functions, and business logic

### Database & Data Layer
Supabase migrations, SQL schemas, seeds, and database configurations

### Configuration & Infrastructure
Build configs, package manifests, deployment scripts, and environmental settings

### Documentation & Guides
Project READMEs, architecture guides, and reference documents

## 🚀 Guided Tour / Features

### 1. Project Overview & Architecture
Start by reviewing the core project documentation and architecture overview.

### 2. Database Foundation & Schema
Explore the database migrations, core schemas, and data model tables.

### 3. Core Business Logic & Services
Understand the core backend services, analytics integrators, and helper logic.

### 4. Frontend Application & UI Components
Inspect the primary React components, page views, and design engine.

## 🔌 APIs & Endpoints

No explicit API endpoints found.


## 🤖 MCP, Agents, & Skills

- **`0009_phase9_ai_seo.sql`**: sql data file (8 lines)
- **`0011_phase11_ai_logs.sql`**: sql data file (47 lines)
- **`0022_push_campaigns.sql`**: sql data file (33 lines)
- **`0026_failure_diagnostics_ttl.sql`**: sql data file (66 lines)
- **`idx_ai_failure_diagnostics_expires_at`**: Table definition idx_ai_failure_diagnostics_expires_at
- **`idx_ai_failure_diagnostics_created_at`**: Table definition idx_ai_failure_diagnostics_created_at
- **`idx_ai_failure_diagnostics_recovery_status`**: Table definition idx_ai_failure_diagnostics_recovery_status
- **`idx_ai_failure_diagnostics_feature`**: Table definition idx_ai_failure_diagnostics_feature
- **`0027_ai_multi_credentials.sql`**: sql data file (177 lines)
- **`idx_ai_credentials_provider_priority`**: Table definition idx_ai_credentials_provider_priority
- **`idx_ai_credentials_health_status`**: Table definition idx_ai_credentials_health_status
- **`idx_ai_credentials_cooldown`**: Table definition idx_ai_credentials_cooldown
- **`idx_ai_model_health_provider_status`**: Table definition idx_ai_model_health_provider_status
- **`idx_ai_model_health_provider_priority`**: Table definition idx_ai_model_health_provider_priority
- **`idx_ai_model_health_default`**: Table definition idx_ai_model_health_default
- **`0028_enhanced_ai_analytics.sql`**: sql data file (123 lines)
- **`idx_ai_logs_credential_id`**: Table definition idx_ai_logs_credential_id
- **`idx_ai_logs_created_at_desc`**: Table definition idx_ai_logs_created_at_desc
- **`idx_ai_logs_provider_created`**: Table definition idx_ai_logs_provider_created
- **`idx_ai_logs_status_created`**: Table definition idx_ai_logs_status_created
- **`idx_ai_diagnostics_correlation_id`**: Table definition idx_ai_diagnostics_correlation_id
- **`idx_ai_diagnostics_credential_id`**: Table definition idx_ai_diagnostics_credential_id
- **`0031_ai_logs_latency.sql`**: sql data file (12 lines)
- **`idx_ai_logs_latency_provider`**: Table definition idx_ai_logs_latency_provider
- **`0045_secure_ai_credentials_rls.sql`**: sql data file (41 lines)
- **`0049_fix_push_campaigns_sent_by_fk.sql`**: sql data file (28 lines)
- **`idx_users_email_lookup`**: Table definition idx_users_email_lookup
- **`0095_chat_realtime_and_order_details_rpc.sql`**: sql data file (185 lines)
- **`rails.md`**: markdown docs file (65 lines)
- **`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`**: Table definition NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- **`pendingAI_COFOUNDER_MASTER_IMPLEMENTATION_PLAN.md`**: markdown docs file (1609 lines)
- **`Payment Failed — Action Needed for Ruhvi Order #{{order.number}}.html`**: html markup file (452 lines)
- **`AGENTS.md`**: markdown docs file (3 lines)
- **`AGENTS.md`**: markdown docs file (15 lines)
- **`mcp_config.json`**: json config file (13 lines)
- **`domain-normalize.test.ts`**: typescript code file (46 lines)
- **`domain-persistence.test.ts`**: typescript code file (64 lines)
- **`domain-types.test.ts`**: typescript code file (141 lines)
- **`thumbnails.test.ts`**: typescript code file (35 lines)
- **`thumbnails.ts`**: typescript code file (29 lines)
- **`plaintext.ts`**: typescript code file (14 lines)
- **`rails.ts`**: typescript code file (28 lines)
- **`ponytail.md`**: markdown docs file (11 lines)
- **`SKILL.md`**: markdown docs file (76 lines)
- **`SKILL.md`**: markdown docs file (322 lines)
- **`SKILL.md`**: markdown docs file (70 lines)
- **`SKILL.md`**: markdown docs file (155 lines)
- **`SKILL.md`**: markdown docs file (85 lines)
- **`SKILL.md`**: markdown docs file (160 lines)
- **`extract-domain-context.py`**: python code file (435 lines)

## 💾 Data Models & Schemas

- **`0001_phase0_foundation.sql`**: sql data file (242 lines)
- **`public`**: Table definition public
- **`0002_phase1_product_catalog.sql`**: sql data file (82 lines)
- **`public`**: Table definition public
- **`0003_phase2_purchase_flow.sql`**: sql data file (132 lines)
- **`0004_phase3_post_purchase_account.sql`**: sql data file (56 lines)
- **`public`**: Table definition public
- **`0005_phase4_money_features.sql`**: sql data file (106 lines)
- **`0006_phase5_shipping.sql`**: sql data file (62 lines)
- **`public`**: Table definition public
- **`idx_tracking_updates_order_id`**: Table definition idx_tracking_updates_order_id
- **`0007_phase6_marketing.sql`**: sql data file (70 lines)
- **`public`**: Table definition public
- **`0008_phase8_security_audit.sql`**: sql data file (30 lines)
- **`public`**: Table definition public
- **`idx_audit_logs_user_id`**: Table definition idx_audit_logs_user_id
- **`idx_audit_logs_entity`**: Table definition idx_audit_logs_entity
- **`0009_seed_admin_account.sql`**: sql data file (50 lines)
- **`0010_dynamic_taxonomy.sql`**: sql data file (21 lines)
- **`public`**: Table definition public
- **`0010_phase10_global_settings.sql`**: sql data file (47 lines)
- **`public`**: Table definition public
- **`public`**: Table definition public
- **`0011_seed_taxonomy.sql`**: sql data file (23 lines)
- **`0012_auto_confirm_users.sql`**: sql data file (32 lines)
- **`0013_phonepe_payment_gateway.sql`**: sql data file (10 lines)
- **`0014_firebase_users_sync.sql`**: sql data file (11 lines)
- **`0015_targeted_coupons.sql`**: sql data file (2 lines)
- **`0016_referral_program.sql`**: sql data file (95 lines)
- **`0017_wallet_program_and_rpc.sql`**: sql data file (74 lines)
- **`0018_firebase_sync_rpc.sql`**: sql data file (23 lines)
- **`0019_admin_firebase_uid.sql`**: sql data file (10 lines)
- **`0019_admin_users_rpc.sql`**: sql data file (64 lines)
- **`0020_admin_firebase_uid_fix.sql`**: sql data file (6 lines)
- **`0020_audit_logs.sql`**: sql data file (100 lines)
- **`public`**: Table definition public
- **`0021_store_settings.sql`**: sql data file (34 lines)
- **`public`**: Table definition public
- **`public`**: Table definition public
- **`0023_user_celebrations.sql`**: sql data file (9 lines)
- **`0024_permanent_uid_sync.sql`**: sql data file (138 lines)
- **`idx_users_firebase_uid`**: Table definition idx_users_firebase_uid
- **`0025_security_and_roles_update.sql`**: sql data file (40 lines)
- **`for`**: Table definition for
- **`public`**: Table definition public
- **`public`**: Table definition public
- **`public`**: Table definition public
- **`0029_product_360_sets.sql`**: sql data file (40 lines)
- **`public`**: Table definition public
- **`0030_unified_customer_identity.sql`**: sql data file (155 lines)

## 🛠️ Key Services


## ⚙️ Core Functions

- **`makeAnalysis`**: Function makeAnalysis
- **`countConfigModules`**: Function countConfigModules
- **`git`**: Function git
- **`createTemporaryDirectory`**: Function createTemporaryDirectory
- **`writeProjectFile`**: Function writeProjectFile
- **`commitAll`**: Function commitAll
- **`createRepository`**: Function createRepository
- **`makeNode`**: Function makeNode
- **`makeGraph`**: Function makeGraph
- **`createMockPlugin`**: Function createMockPlugin
- **`designGraph`**: Function designGraph
- **`makeNode`**: Function makeNode
- **`makeNode`**: Function makeNode
- **`makeEdge`**: Function makeEdge
- **`makeGraph`**: Function makeGraph
- **`buildConceptPatterns`**: Function buildConceptPatterns
- **`detectLanguageConcepts`**: Function detectLanguageConcepts
- **`getLanguageDisplayName`**: Function getLanguageDisplayName
- **`buildLanguageLessonPrompt`**: Function buildLanguageLessonPrompt
- **`extractJson`**: Function extractJson
- **`parseLanguageLessonResponse`**: Function parseLanguageLessonResponse
- **`toLayerId`**: Function toLayerId
- **`matchFileToLayer`**: Function matchFileToLayer
- **`detectLayers`**: Function detectLayers
- **`buildLayerDetectionPrompt`**: Function buildLayerDetectionPrompt
- **`parseLayerDetectionResponse`**: Function parseLayerDetectionResponse
- **`applyLLMLayers`**: Function applyLLMLayers
- **`buildFileAnalysisPrompt`**: Function buildFileAnalysisPrompt
- **`buildProjectSummaryPrompt`**: Function buildProjectSummaryPrompt
- **`extractJson`**: Function extractJson
- **`parseFileAnalysisResponse`**: Function parseFileAnalysisResponse
- **`parseProjectSummaryResponse`**: Function parseProjectSummaryResponse
- **`stripToValidPrefix`**: Function stripToValidPrefix
- **`normalizeNodeId`**: Function normalizeNodeId
- **`normalizeComplexity`**: Function normalizeComplexity
- **`inferTypeFromId`**: Function inferTypeFromId
- **`normalizeBatchOutput`**: Function normalizeBatchOutput
- **`buildTourGenerationPrompt`**: Function buildTourGenerationPrompt
- **`parseTourGenerationResponse`**: Function parseTourGenerationResponse
- **`generateHeuristicTour`**: Function generateHeuristicTour
- **`classifyUpdate`**: Function classifyUpdate
- **`detectDirectoryChanges`**: Function detectDirectoryChanges
- **`topDirectories`**: Function topDirectories
- **`topDirectory`**: Function topDirectory
- **`summarizeChanges`**: Function summarizeChanges
- **`cosineSimilarity`**: Function cosineSimilarity
- **`cosineSimilarityWithQueryMag`**: Function cosineSimilarityWithQueryMag
- **`node`**: Function node
- **`mergeDesignGraph`**: Function mergeDesignGraph
- **`mkNode`**: Function mkNode
