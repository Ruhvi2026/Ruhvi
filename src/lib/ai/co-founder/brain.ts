import 'server-only';

import {
  buildKnowledgeContext,
  RUHVI_BUSINESS_KNOWLEDGE,
} from '@/lib/ai/knowledge';
import { getRelevantMemories, CoFounderMemoryItem } from './memory';
import {
  searchSemanticMemories,
  synthesizePrioritizedMemoryContext,
} from './memory-engine';
import { getActiveProactiveSignals } from './proactive';

export interface CoFounderContextOptions {
  userId?: string;
  userRole?: string;
  adminName?: string;
  sessionGoal?: string;
  channel?: 'voice' | 'text';
  language?: string;
  voiceStyle?: 'spoken_bengali' | 'banglish' | 'standard';
}

/**
 * Builds the prioritized Co-Founder system instructions
 *
 * Implements Context Prioritization Model:
 * 1. Current user prompt & goal
 * 2. Active tool results
 * 3. Fresh live database business snapshot
 * 4. Relevant long-term memories & preferences
 * 5. Immutable brand foundations & core operational rules
 */
export async function getCoFounderSystemPrompt(
  options: CoFounderContextOptions = {}
): Promise<string> {
  const userName = options.adminName || 'Founder';
  const userRole = options.userRole || 'super_admin';
  const channel = options.channel || 'voice';

  // 1. Fetch live database snapshot (Data Freshness guarantee)
  const dynamicKnowledge = await buildKnowledgeContext(
    options.sessionGoal || 'business overview products catalog orders'
  );

  // 2. Fetch relevant long-term memories using Memory 2.0 Semantic Engine
  let memoryBlock = 'LONG-TERM MEMORIES & CONTEXT: None recorded yet.';
  if (options.userId) {
    try {
      const searchQuery =
        options.sessionGoal ||
        'business strategy operational rules goals preferences';
      const scoredMemories = await searchSemanticMemories(
        options.userId,
        searchQuery,
        { limit: 8 }
      );
      if (scoredMemories && scoredMemories.length > 0) {
        memoryBlock = synthesizePrioritizedMemoryContext(scoredMemories);
      } else {
        const legacyMemories = await getRelevantMemories(
          options.userId,
          undefined,
          5
        );
        if (legacyMemories.length > 0) {
          memoryBlock =
            `LONG-TERM STRATEGIC MEMORIES & PREFERENCES:\n` +
            legacyMemories
              .map(
                (m) => `- [${m.category.toUpperCase()}] ${m.key}: ${m.value}`
              )
              .join('\n');
        }
      }
    } catch {
      try {
        const legacyMemories = await getRelevantMemories(
          options.userId,
          undefined,
          5
        );
        if (legacyMemories.length > 0) {
          memoryBlock =
            `LONG-TERM STRATEGIC MEMORIES & PREFERENCES:\n` +
            legacyMemories
              .map(
                (m) => `- [${m.category.toUpperCase()}] ${m.key}: ${m.value}`
              )
              .join('\n');
        }
      } catch {}
    }
  }

  let proactiveSignals: any[] = [];
  try {
    proactiveSignals = await getActiveProactiveSignals(3);
  } catch {}

  const proactiveBlock =
    proactiveSignals.length > 0
      ? `ACTIVE PROACTIVE SIGNALS & ALERTS:\n` +
        proactiveSignals
          .map(
            (s) =>
              `- [${s.severity.toUpperCase()} ${s.category}] ${s.title}: ${s.summary}`
          )
          .join('\n')
      : `ACTIVE PROACTIVE SIGNALS: All systems and metrics within normal parameters.`;

  return `
You are the AI Co-Founder of "Ruhvi", an exquisite, high-growth fine jewellery brand based in India (ruhvi.in).
You are speaking directly with ${userName} (${userRole}).

ROLE & EXECUTIVE IDENTITY:
- You are an executive AI Co-Founder and strategic business partner.
- You think across Product, Catalog, Inventory, Marketing, Customer Care, Unit Economics, and Technology.
- You speak with crisp, articulate executive confidence, balanced with warmth and high craft standards.

COMMUNICATION MODE (${channel.toUpperCase()}):
${
  channel === 'voice'
    ? `- VOICE MODE: Keep your spoken answers concise, direct, and conversational.
- Do NOT read large raw JSON tables or bullet lists longer than 3 items over voice.
- Synthesize numbers into high-level takeaways (e.g., "We did 42 orders today with ₹85,000 revenue. The Choker inventory is down to 2 units.").
- Speak naturally so the founder can listen easily.`
    : `- TEXT MODE: Provide structured insights, bullet points, and action previews where helpful.`
}

DATA FRESHNESS & UNCERTAINTY HANDLING (STRICT):
1. LIVE DATA PRECEDENCE: Fresh database queries and tool outputs ALWAYS supersede stale memories or general training knowledge.
2. ZERO HALLUCINATION: Never invent order totals, revenue numbers, inventory levels, or customer details. If you don't know or don't have fresh data, explicitly state what is unknown and offer to run a tool to check.
3. IMMEDIATE TOOL EXECUTION: When the Founder asks about tickets, orders, stock, sales, metrics, SEO, or tasks, you MUST call the respective tool in the same turn. NEVER output conversational placeholders like "আমি ডেটাবেস চেক করছি..." or "Let me check..." as your final answer without returning the real data from the tool execution.

APPROVAL BOUNDARIES & SAFETY GUARDRAILS:
- READ ACTIONS (e.g. check metrics, view orders, check low stock): Perform automatically using tools.
- HIGH-IMPACT WRITE ACTIONS (e.g. adjust inventory, trigger WhatsApp broadcasts, publish blogs, create coupons, change pricing):
  1. DO NOT execute without explicit approval.
  2. Clearly explain the proposed action, target entity, and business impact.
  3. Ask: "Would you like me to proceed with this?"

MULTILINGUAL FLUENCY & ADAPTIVE CODE-SWITCHING (MANDATORY):
- You are natively fluent in Bengali (বাংলা), Hindi (हिन्दी), and English.
- The Founder will often speak to you in Bengali (বাংলা / Banglish), Hindi (हिन्दी / Hinglish), or mixed English.
- ALWAYS adapt and respond in the language and script the Founder addresses you with:
  * If the Founder speaks or writes in Bengali (e.g. "আজকের সেল কেমন?", "আমাদের স্টক চেক করো", "koto gulo order esheche?", "model change kore dao"): Respond with natural, warm, and professional Bengali. If the user used English script (Banglish), respond in natural Bengali or clear Banglish matching their comfort.
  * If the Founder speaks or writes in Hindi (e.g. "आज की बिक्री कैसी रही?", "स्टॉक की स्थिति क्या है?", "aaj kitne orders aaye?"): Respond in fluent, professional Hindi.
  * If the Founder speaks in English, respond in English.
  * If the Founder code-switches (mixes English terms with Bengali or Hindi): Match their flow naturally like a real Indian tech & business co-founder.
- Never force English on the Founder when they converse in Bengali or Hindi. You understand their questions effortlessly.

BENGALI SPOKEN VOICE PHONICS & NATURAL COLLOQUIAL SPEECH (STRICT FOR BENGALI):
${
  options.voiceStyle === 'banglish'
    ? `- BANGLISH / ROMANIZED PHONETIC MODE ACTIVE:
  * The user prefers clean Romanized Bengali for maximum audio synthesizer clarity on their device.
  * Speak in natural, crystal-clear Banglish (e.g., "Nomoshkar Founder! Aajke 5 ta notun order esheche, total revenue 14,200 taka. Aar ki check korbo bolun?").
  * Keep sentences short (under 12 words) so Indian-English TTS voices pronounce every word with 100% clarity.`
    : `- NATURAL COLLOQUIAL SPOKEN BENGALI (সহজ মিষ্টি মুখের চলিত বাংলা):
  * Speak like a real human co-founder talking over a phone call in Kolkata, NOT like an old formal textbook or legal notice.
  * STRICT BAN ON ARCHAIC / LITERARY WORDS:
    - NEVER use "এবং" (and). ALWAYS use "আর" (aar).
    - NEVER use archaic verb conjugations: "বলিবেন", "করিবেন", "হইবে", "যাহা", "তাহা", "প্রদান করুন", "জ্ঞাত হন".
    - ALWAYS use natural spoken verbs: "বলুন", "করুন", "হবে", "আছে", "দেখছি", "কী সাহায্য করতে পারি?".
    - Pronounce common business terms naturally: "অর্ডার", "সেলস", "রেভিনিউ", "স্টক", "মডেল", "রূহভি".
  * SHORT, BREATHABLE CADENCE:
    - Keep every spoken sentence under 8-12 words.
    - Use commas (,) and Bengali daris (।) frequently so the voice synthesizer pauses naturally.
    - NEVER stutter or stammer syllables (no "কী বলি... কী বলব... এবং কে এবং"). Speak clearly, confidently, and concisely.`
}

BRAND FOUNDATION:
- Tagline: ${RUHVI_BUSINESS_KNOWLEDGE.brand.tagline}
- Craft: 22K gold-plated jewellery with anti-tarnish e-coating and 6-month color guarantee.
- Shipping: Blue Dart Air transit across India, free shipping on all orders.

CO-FOUNDER ADVISOR, ANALYST, STRATEGIST & EXECUTION AGENT PROTOCOL:
1. BUSINESS CONTEXT: Draw upon real users, revenue, products, support, tasks, and memory. Use 'get_business_context'.
2. BUSINESS INTELLIGENCE: Detect problems, trends, anomalies, risks, and opportunities using 'run_business_intelligence_scan'.
3. ROOT-CAUSE ANALYSIS: When an issue arises, investigate evidence first via 'investigate_root_cause'. Differentiate:
   - Facts (authoritative DB records)
   - Evidence (statistical patterns & timestamps)
   - Assumptions (operational premises)
   - Hypotheses (ranked candidate causes)
   - Uncertainty (known unknowns & data gaps)
4. STRATEGIC SOLUTIONS: Formulate solutions with reasoning, expected impact (₹ / % projections), effort/cost, and trade-offs using 'formulate_strategy'.
5. ACTION PLANNING: Convert strategies into Goal → Strategy → Project → Tasks → Steps → Metrics using 'generate_action_plan'.
6. TASK EXECUTION: Execute approved plans directly into Ruhvi Task Manager with checklists and metrics using 'execute_action_plan'.
7. PROACTIVE ADVISOR MODE: When reporting proactively, structure insights as:
   Problem/Opportunity → Evidence → Recommended Solution → Action Plan → Priority
8. CLOSED-LOOP EXECUTION & TRUTHFUL OUTCOME VERIFICATION:
   - Core Principle: "Execution Success != Business Success". An action returning 200 OK only proves mutation completed; business success requires measured metric improvement in authoritative store tables after an elapsed measurement window.
   - Use 'get_action_lifecycle_status' to inspect operational status.
   - Use 'verify_action_outcome' to evaluate post-execution performance against live database metrics. Strictly refuse premature declarations of victory while measurement windows remain active.
   - Use 'get_closed_loop_analytics' to review aggregate execution success rates, regressions, and conflicts across the organization.
9. AI WORKER ORCHESTRATION (THE 12 SPECIALIZED AI AGENT WORKERS):
   - You are the Owner, Manager, and Orchestrator of 12 specialized AI Agent Workers:
     1. Analytics & Performance Worker ('worker_analytics_performance')
     2. Marketing Worker ('worker_marketing')
     3. SEO Worker ('worker_seo')
     4. Product Worker ('worker_product')
     5. Competitor Research Worker ('worker_competitor_research')
     6. Sales & Conversion Worker ('worker_sales_conversion')
     7. Customer Support Worker ('worker_customer_support')
     8. Content / Blog Worker ('worker_content_blog')
     9. Inventory Worker ('worker_inventory')
     10. Review & Feedback Worker ('worker_review_feedback')
     11. Execution Worker ('worker_execution') [STRICT HUMAN APPROVAL REQUIRED]
     12. Monitoring & Verification Worker ('worker_monitoring_verification')
   - Dynamically assign tasks to these workers using 'dispatch_worker_task'.
   - Receive worker results, evaluate findings, and present clear recommendations to the founder.
   - Any business-impacting operational mutation MUST obtain founder approval before dispatching to the Execution Worker.
10. CATALOG & INVENTORY INTELLIGENCE:
   - Real-Time Product Velocity: Use 'get_product_velocity' to query live unit run-rates, ASP, order frequency, and sales trajectory. Distinguish OBSERVED sales from CALCULATED velocities. Never invent sales numbers.
   - Days of Inventory (DOI): Use 'get_days_of_inventory' to calculate real inventory depletion dates and stock-out risk scores (0-100).
   - Margin & Category Intelligence: Use 'get_category_margin_breakdown' to analyze gross margin % and contribution margins across jewellery categories (Earrings, Necklaces, Rings, etc.).
   - Automated Restock Planning: Use 'get_restock_recommendations' to compute exact replenishment batches covering supplier lead time and safety buffers.
11. HIERARCHICAL MEMORY 2.0 & TRUTH HIERARCHY:
   - Priority Order: Live Store Verified Data > Approved Operational Rules > Strategic Goals > Founder Preferences > Historical Memory.
   - Use 'search_co_founder_memory' to perform hybrid semantic retrieval across operational constraints, strategic milestones, brand preferences, and outcome learnings.
   - Use 'store_co_founder_memory' to record explicit founder decisions, policies, and targets with automated semantic contradiction detection and superseding.
   - Use 'extract_session_learnings' to distill high-signal business takeaways and corrections from the conversation turn history.
   - Never violate active operational rules without explicit founder authorization.

${memoryBlock}

${proactiveBlock}

CURRENT LIVE STORE SNAPSHOT:
${dynamicKnowledge}
`.trim();
}

/**
 * Standard Tool Declarations for Gemini Live and AI SDK
 */
export const CO_FOUNDER_TOOL_DECLARATIONS = [
  {
    name: 'get_store_metrics',
    description:
      'Retrieve top-level business analytics: total revenue, order count, AOV, and customer metrics.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date_range: {
          type: 'STRING',
          description:
            'Time window: "today", "yesterday", "last_7_days", "this_month"',
        },
      },
    },
  },
  {
    name: 'get_orders',
    description:
      'Fetch recent customer orders with status, total amounts, and customer details.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description:
            'Filter by order status: "placed", "confirmed", "shipped", "delivered", "cancelled"',
        },
        limit: {
          type: 'NUMBER',
          description: 'Number of orders to retrieve (default: 5)',
        },
      },
    },
  },
  {
    name: 'get_inventory_levels',
    description:
      'Check stock levels across catalog, highlighting low stock or out-of-stock items.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Optional filter: "low_stock" or "out_of_stock"',
        },
      },
    },
  },
  {
    name: 'get_support_tickets',
    description:
      'List active customer support tickets, complaints, or return requests.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description:
            'Filter by ticket status: "open", "in_progress", "resolved"',
        },
      },
    },
  },
  {
    name: 'update_support_ticket_status',
    description:
      'Update the status of a customer support ticket (e.g. resolve, close, or set to in_progress). Automatically syncs with database.',
    parameters: {
      type: 'OBJECT',
      properties: {
        ticketId: {
          type: 'STRING',
          description:
            'The support ticket ID or ticket number (e.g., RUV-2026-000015)',
        },
        status: {
          type: 'STRING',
          description:
            'New status: "resolved", "closed", "in_progress", or "open"',
        },
        resolutionNote: {
          type: 'STRING',
          description:
            'Optional note explaining why the ticket was resolved/closed',
        },
      },
      required: ['ticketId', 'status'],
    },
  },
  {
    name: 'get_sales_analytics',
    description:
      'Deep business intelligence query: revenue, orders, AOV, cancellations, trends, period-over-period comparisons, and anomalies.',
    parameters: {
      type: 'OBJECT',
      properties: {
        timeframe: {
          type: 'STRING',
          description:
            'Time window: "today", "yesterday", "7d", "30d", "this_month", "last_month"',
        },
      },
    },
  },
  {
    name: 'get_proactive_signals',
    description:
      'Retrieve active high-priority business alerts, risks, opportunities, and pending strategic follow-ups.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: {
          type: 'NUMBER',
          description:
            'Maximum number of proactive signals to return (default: 5)',
        },
      },
    },
  },
  {
    name: 'get_pending_approvals',
    description:
      'List pending high-impact action approvals awaiting founder review and decision.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'submit_approval_decision',
    description:
      'Record explicit founder approval, rejection, or revocation for a high-impact action.',
    parameters: {
      type: 'OBJECT',
      required: ['approval_id', 'decision'],
      properties: {
        approval_id: {
          type: 'STRING',
          description: 'The unique UUID of the pending approval request',
        },
        decision: {
          type: 'STRING',
          description: 'Decision choice: "approved", "rejected", or "revoked"',
        },
        reason: {
          type: 'STRING',
          description: 'Optional justification or note for the decision',
        },
      },
    },
  },
  {
    name: 'execute_approved_action',
    description:
      'Safely execute a verified, approved business action (e.g. inventory update, ticket status change, coupon creation).',
    parameters: {
      type: 'OBJECT',
      required: ['action_type', 'approval_id'],
      properties: {
        action_type: {
          type: 'STRING',
          description:
            'The action type: "update_inventory_stock", "update_ticket_status", "create_coupon"',
        },
        approval_id: {
          type: 'STRING',
          description:
            'The UUID of the approved record from co_founder_approvals',
        },
        action_payload: {
          type: 'OBJECT',
          description: 'Exact approved parameters for execution',
        },
      },
    },
  },
  {
    name: 'get_repository_architecture',
    description:
      'Inspect codebase tech stack, module structure, and database migration status.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'inspect_recent_errors',
    description:
      'Retrieve recent system exceptions, error logs, and stack traces with root cause diagnosis.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: {
          type: 'NUMBER',
          description: 'Maximum error events to fetch (default: 5)',
        },
      },
    },
  },
  {
    name: 'review_code_snippet',
    description:
      'Analyze a code snippet for security vulnerabilities, secret leaks, SQL/command injection, and performance issues.',
    parameters: {
      type: 'OBJECT',
      required: ['snippet'],
      properties: {
        snippet: {
          type: 'STRING',
          description: 'The code snippet to evaluate',
        },
        language: {
          type: 'STRING',
          description:
            'Programming language (e.g. "typescript", "sql", "bash")',
        },
      },
    },
  },
  {
    name: 'record_outcome_feedback',
    description:
      'Record founder feedback, result confirmation, correction, or critique for an AI recommendation or business action.',
    parameters: {
      type: 'OBJECT',
      required: ['feedback_text'],
      properties: {
        feedback_text: {
          type: 'STRING',
          description: 'The specific feedback, observation, or correction',
        },
        feedback_type: {
          type: 'STRING',
          description:
            'Feedback sentiment: "positive", "negative", "correction", "neutral"',
        },
        entity_type: {
          type: 'STRING',
          description:
            'Entity type: "recommendation", "action", "proactive_signal", "general_decision"',
        },
        entity_id: {
          type: 'STRING',
          description: 'Optional ID of the referenced recommendation or action',
        },
        reported_outcome: {
          type: 'STRING',
          description: 'Observed outcome stated by the founder',
        },
      },
    },
  },
  {
    name: 'get_outcome_analytics',
    description:
      'Retrieve statistical outcome intelligence: recommendation acceptance rates, verified business outcomes, conflict counts, and learning signals.',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: {
          type: 'NUMBER',
          description: 'Number of past days to analyze (default: 30)',
        },
      },
    },
  },
  {
    name: 'browse_website',
    description:
      'Browse and inspect any public website or competitor URL live using Playwright browser engine. Renders JavaScript/SPAs, extracts headlines, main text content, detected pricing, and marketing hooks.',
    parameters: {
      type: 'OBJECT',
      required: ['url'],
      properties: {
        url: {
          type: 'STRING',
          description:
            'The target website URL to browse (e.g. "https://competitor.com" or "competitor.com/collections")',
        },
        wait_for_selector: {
          type: 'STRING',
          description:
            'Optional CSS selector to wait for before extracting page content',
        },
        timeout_ms: {
          type: 'NUMBER',
          description: 'Timeout in milliseconds (default: 20000)',
        },
        capture_screenshot: {
          type: 'BOOLEAN',
          description:
            'Whether to capture a visual screenshot of the rendered page',
        },
      },
    },
  },
  {
    name: 'get_business_context',
    description:
      'Retrieve a 360-degree holistic business context covering Users, Revenue, Catalog stock velocity, Support tickets, Active Tasks/Roadmap, Governance Decisions, and Business Memory.',
    parameters: {
      type: 'OBJECT',
      properties: {
        force_refresh: {
          type: 'BOOLEAN',
          description:
            'Whether to bypass the 60s cache and force query fresh database rows',
        },
      },
    },
  },
  {
    name: 'run_business_intelligence_scan',
    description:
      'Execute an automated Business Intelligence scan to detect Problems, Metric Trends & Anomalies, Operational Risks, and Revenue Growth Opportunities.',
    parameters: {
      type: 'OBJECT',
      properties: {
        timeframe: {
          type: 'STRING',
          description: 'Analysis window: "7d" or "30d" (default: "7d")',
        },
      },
    },
  },
  {
    name: 'investigate_root_cause',
    description:
      'Perform a formal Root-Cause Analysis (RCA) on an identified problem, partitioning findings into Facts, Evidence, Assumptions, Hypotheses, and Uncertainty.',
    parameters: {
      type: 'OBJECT',
      required: ['issue_type'],
      properties: {
        issue_type: {
          type: 'STRING',
          description:
            'Type of issue: "revenue_decline", "high_cancellation_rate", "inventory_stockout", "support_ticket_spike", "system_errors", "custom"',
        },
        context: {
          type: 'STRING',
          description:
            'Optional additional context or observations regarding the issue',
        },
      },
    },
  },
  {
    name: 'formulate_strategy',
    description:
      'Formulate practical business solutions with strategic reasoning, quantitative expected impact, operational effort/cost, trade-offs, and alternative approaches.',
    parameters: {
      type: 'OBJECT',
      required: ['title', 'issue_type'],
      properties: {
        title: {
          type: 'STRING',
          description: 'Title of the problem or strategic objective',
        },
        issue_type: {
          type: 'STRING',
          description:
            'Core issue area (e.g., "cancellation", "stockout", "revenue", "general")',
        },
        additional_context: {
          type: 'STRING',
          description:
            'Specific details or constraints to factor into strategy',
        },
      },
    },
  },
  {
    name: 'generate_action_plan',
    description:
      'Convert an approved strategy into a structured Action Plan: Goal → Strategy → Project → Tasks → Steps → Success Metrics, and save to the action plan registry.',
    parameters: {
      type: 'OBJECT',
      required: ['strategy_title', 'strategy_objective'],
      properties: {
        strategy_title: {
          type: 'STRING',
          description: 'Title of the strategy to decompose',
        },
        strategy_objective: {
          type: 'STRING',
          description: 'Core high-level goal and objective',
        },
        strategy_recommendation: {
          type: 'STRING',
          description: 'Recommended methodology and execution approach',
        },
        problem_statement: {
          type: 'STRING',
          description: 'Original problem statement being solved',
        },
        recommendation_id: {
          type: 'STRING',
          description:
            'Optional linked recommendation UUID from co_founder_recommendations',
        },
        signal_id: {
          type: 'STRING',
          description: 'Optional linked signal UUID from co_founder_signals',
        },
      },
    },
  },
  {
    name: 'execute_action_plan',
    description:
      'Execute an approved action plan: automatically creates and routes real tasks in Ruhvi Task Manager with checklist steps, and registers closed-loop metric tracking.',
    parameters: {
      type: 'OBJECT',
      required: ['plan_id'],
      properties: {
        plan_id: {
          type: 'STRING',
          description: 'UUID of the action plan from co_founder_action_plans',
        },
        staff_user_id: {
          type: 'STRING',
          description: 'Staff UUID executing the plan',
        },
      },
    },
  },
  {
    name: 'dispatch_worker_task',
    description:
      'Assign an operational or analytical task to one of the 12 specialized AI Agent Workers under the AI Co-Founder (or use "auto" to dynamically route). Workers: Analytics, Marketing, SEO, Product, Competitor Research, Sales & Conversion, Customer Support, Content/Blog, Inventory, Review/Feedback, Execution, Monitoring/Verification.',
    parameters: {
      type: 'OBJECT',
      required: ['task'],
      properties: {
        worker_id: {
          type: 'STRING',
          description:
            'Target worker ID ("auto", "worker_analytics_performance", "worker_marketing", "worker_seo", "worker_product", "worker_competitor_research", "worker_sales_conversion", "worker_customer_support", "worker_content_blog", "worker_inventory", "worker_review_feedback", "worker_execution", "worker_monitoring_verification")',
        },
        task: {
          type: 'STRING',
          description:
            'Detailed instructions, task description, and objective for the specialized worker',
        },
        timeframe: {
          type: 'STRING',
          description:
            'Optional timeframe filter: "today", "yesterday", "7d", "30d", "this_month"',
        },
        parameters: {
          type: 'OBJECT',
          description:
            'Optional structured parameters for the worker (e.g. url, topic, approval_id, plan_id)',
        },
      },
    },
  },
  {
    name: 'get_worker_statuses',
    description:
      'List the operational status, role, priority, and responsibilities of all 12 specialized AI Agent Workers.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'execute_multi_worker_plan',
    description:
      'Plan and execute a multi-worker coordinated initiative across specialized AI Agent Workers with stage dependencies, parallel execution for safe investigative steps, and automatic human approval gating for mutations.',
    parameters: {
      type: 'OBJECT',
      required: ['goal'],
      properties: {
        goal: {
          type: 'STRING',
          description:
            'The comprehensive business goal or initiative to decompose and execute across workers (e.g. "Run a full store growth audit", "Plan a festive campaign launch", "Execute checkout conversion recovery")',
        },
        timeframe: {
          type: 'STRING',
          description:
            'Optional timeframe filter: "today", "yesterday", "7d", "30d", "this_month"',
        },
        parameters: {
          type: 'OBJECT',
          description:
            'Optional structured parameters or context for the workers',
        },
      },
    },
  },
  {
    name: 'verify_action_outcome',
    description:
      'Truthfully verify whether an executed strategic action reached its business metric target against live authoritative database tables (orders, products, support tickets). Refuses false success if measurement window has not yet elapsed.',
    parameters: {
      type: 'OBJECT',
      required: ['action_id'],
      properties: {
        action_id: {
          type: 'STRING',
          description:
            'The action ID, approval ID, or outcome record ID to verify',
        },
        force_immediate: {
          type: 'BOOLEAN',
          description:
            'Optional override to bypass measurement window check for testing or immediate verification',
        },
      },
    },
  },
  {
    name: 'get_action_lifecycle_status',
    description:
      'Inspect the unified closed-loop lifecycle state of a strategic action (e.g. PROPOSED, APPROVED, EXECUTING, OUTCOME_EXPECTED, OUTCOME_ACHIEVED, OUTCOME_REGRESSED, OUTCOME_CONFLICTED).',
    parameters: {
      type: 'OBJECT',
      required: ['action_id'],
      properties: {
        action_id: {
          type: 'STRING',
          description:
            'The action ID, approval ID, or outcome record ID to inspect',
        },
      },
    },
  },
  {
    name: 'get_closed_loop_analytics',
    description:
      'Retrieve high-level closed-loop KPIs, verified outcome success rates, detected business regressions, and an executive voice summary.',
    parameters: {
      type: 'OBJECT',
      properties: {
        days: {
          type: 'NUMBER',
          description: 'Lookback timeframe in days (default: 30)',
        },
      },
    },
  },
  {
    name: 'get_product_velocity',
    description:
      'Calculate real-time sales velocity (units/day, run-rate revenue, order count, ASP, and velocity trend) for a single SKU or across catalog batches from live order items.',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id_or_sku: {
          type: 'STRING',
          description: 'Product UUID or SKU code to analyze',
        },
        timeframe_days: {
          type: 'NUMBER',
          description: 'Lookback window in days (default: 30)',
        },
        batch: {
          type: 'BOOLEAN',
          description:
            'Set to true to calculate velocity across the entire catalog or filtered SKUs',
        },
        category_slug: {
          type: 'STRING',
          description: 'Optional category slug filter for batch calculation',
        },
        sort_by: {
          type: 'STRING',
          description: 'Sort order: "velocity", "revenue", "stock", or "name"',
        },
      },
    },
  },
  {
    name: 'get_days_of_inventory',
    description:
      'Calculate Days-of-Inventory (DOI) run-out runway, stock-out risk score (0-100), projected run-out dates, and urgency tier for a product SKU.',
    parameters: {
      type: 'OBJECT',
      required: ['product_id_or_sku'],
      properties: {
        product_id_or_sku: {
          type: 'STRING',
          description: 'Product UUID or SKU code',
        },
        lead_time_days: {
          type: 'NUMBER',
          description: 'Supplier replenishment lead time in days (default: 10)',
        },
        safety_buffer_days: {
          type: 'NUMBER',
          description: 'Target safety buffer stock in days (default: 20)',
        },
        timeframe_days: {
          type: 'NUMBER',
          description: 'Sales velocity lookback window in days (default: 30)',
        },
      },
    },
  },
  {
    name: 'get_category_margin_breakdown',
    description:
      'Analyze gross revenue, COGS, gross margin %, and revenue contribution across jewellery categories (Earrings, Necklaces, Bangles, Mangalsutras, Rings).',
    parameters: {
      type: 'OBJECT',
      properties: {
        timeframe_days: {
          type: 'NUMBER',
          description: 'Timeframe in days (default: 30)',
        },
      },
    },
  },
  {
    name: 'get_restock_recommendations',
    description:
      'Generate prioritized inventory replenishment recommendations with calculated reorder quantities, estimated capital expenditure, and urgency tiers.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category_slug: {
          type: 'STRING',
          description: 'Optional category filter',
        },
        urgency_tier: {
          type: 'STRING',
          description:
            'Filter by urgency: "OUT_OF_STOCK", "CRITICAL", "ELEVATED", "HEALTHY", "OVERSTOCKED"',
        },
        lead_time_days: {
          type: 'NUMBER',
          description: 'Supplier lead time in days (default: 10)',
        },
        safety_buffer_days: {
          type: 'NUMBER',
          description: 'Target safety buffer in days (default: 20)',
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum recommendations to return (default: 50)',
        },
      },
    },
  },
  {
    name: 'search_co_founder_memory',
    description:
      'Search long-term episodic, strategic, operational, and preference memories using hybrid semantic vector retrieval.',
    parameters: {
      type: 'OBJECT',
      required: ['query'],
      properties: {
        query: {
          type: 'STRING',
          description:
            'The semantic question or topic to search across memories',
        },
        layer: {
          type: 'STRING',
          description:
            'Optional taxonomy layer filter: "conversation", "decision", "preference", "operational_rule", "strategic_goal", "correction", "outcome_learning"',
        },
        limit: {
          type: 'NUMBER',
          description: 'Maximum number of memories to return (default: 8)',
        },
      },
    },
  },
  {
    name: 'store_co_founder_memory',
    description:
      'Store a new long-term business rule, strategic goal, founder preference, or decision. Automatically detects contradictions and supersedes outdated memories.',
    parameters: {
      type: 'OBJECT',
      required: ['key', 'value'],
      properties: {
        key: {
          type: 'STRING',
          description:
            'Unique identifier or slug for this memory item (e.g. "choker_buffer_stock")',
        },
        value: {
          type: 'STRING',
          description: 'The memory text or factual rule statement',
        },
        taxonomy_layer: {
          type: 'STRING',
          description:
            'Taxonomy layer: "operational_rule", "strategic_goal", "preference", "decision", "correction", "conversation"',
        },
        importance: {
          type: 'NUMBER',
          description:
            'Importance rating from 1 (minor) to 5 (critical policy/rule)',
        },
        topics: {
          type: 'ARRAY',
          description:
            'Optional semantic topic tags (e.g. ["inventory", "safety_stock"])',
          items: { type: 'STRING' },
        },
      },
    },
  },
  {
    name: 'extract_session_learnings',
    description:
      'Analyze recent conversation turns to extract and summarize high-signal founder rules, goals, preferences, or corrections.',
    parameters: {
      type: 'OBJECT',
      properties: {
        persist_to_memory: {
          type: 'BOOLEAN',
          description:
            'Whether to automatically persist extracted high-confidence candidates to long-term memory (default: false)',
        },
      },
    },
  },
  {
    name: 'analyze_product_image',
    description:
      'Perform multimodal AI vision inspection on a jewelry product image (URL or base64). Analyzes metal type, karat, gemstone settings, craftsmanship quality, flaws, and catalog photography compliance.',
    parameters: {
      type: 'OBJECT',
      properties: {
        image_url: {
          type: 'STRING',
          description: 'Public URL of the product or catalog image to inspect.',
        },
        image_base64: {
          type: 'STRING',
          description:
            'Optional base64 encoded image data if inspecting a direct upload or screenshot.',
        },
        product_name_hint: {
          type: 'STRING',
          description: 'Optional hint for product name or SKU.',
        },
        category_hint: {
          type: 'STRING',
          description:
            'Optional hint for product category (e.g. "necklace", "ring", "earrings").',
        },
      },
    },
  },
  {
    name: 'generate_product_studio_photos',
    description:
      'AI Studio Photography Engine: generates a complete 6-frame e-commerce catalog photo shoot for a jewelry product. Accepts the real product image (URL or base64), extracts gemological specs via Gemini Vision, produces 6 hyper-realistic art-directed frames (2 model wears, studio hero, flat-lay unboxing, 45° side profile, extreme macro texture) using Google Imagen 3, and optionally uploads all renders to Cloudinary. Use when the founder asks to generate product photos, studio shots, catalog images, model wears, or e-commerce photos for any jewelry item.',
    parameters: {
      type: 'OBJECT',
      properties: {
        image_url: {
          type: 'STRING',
          description:
            'Public URL of the existing real product image to base the shoot on.',
        },
        image_base64: {
          type: 'STRING',
          description:
            'Base64-encoded product image data (alternative to image_url).',
        },
        mime_type: {
          type: 'STRING',
          description: 'MIME type of the base64 image (default: image/jpeg).',
        },
        product_name: {
          type: 'STRING',
          description:
            'Product name or SKU used for file naming and prompt context.',
        },
        category_hint: {
          type: 'STRING',
          description:
            'Optional product category hint to accelerate spec extraction (e.g. "necklace", "earrings", "ring", "choker").',
        },
        upload_to_cloudinary: {
          type: 'BOOLEAN',
          description:
            'Whether to automatically upload all generated renders to Cloudinary CDN (default: false — returns base64 only).',
        },
      },
    },
  },
  {
    name: 'create_draft_product',
    description:
      'Creates a new product draft in the store catalog with up to 6 studio photos, high-converting SEO copy, slug, product name, category, pricing, metadata, and immediately creates a formal approval request for the founder to review and publish it to the live store.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description:
            'High-converting luxury product name (e.g. "Royal Kundan Floral Choker Necklace").',
        },
        slug: {
          type: 'STRING',
          description:
            'URL-friendly product slug (e.g. "royal-kundan-floral-choker-necklace").',
        },
        description: {
          type: 'STRING',
          description:
            'SEO-optimized product description highlighting design, craftsmanship, materials, styling occasions, and care.',
        },
        category_name: {
          type: 'STRING',
          description:
            'Product category name (e.g. "Necklaces", "Chokers", "Earrings", "Rings", "Bangles", "Bridal Sets").',
        },
        price: {
          type: 'NUMBER',
          description: 'Selling price in INR (e.g. 2499).',
        },
        mrp: {
          type: 'NUMBER',
          description:
            'Maximum Retail Price / strike price in INR (e.g. 4999).',
        },
        cost_price: {
          type: 'NUMBER',
          description:
            'Estimated production or procurement cost in INR (optional).',
        },
        sku: {
          type: 'STRING',
          description: 'Optional unique SKU code (e.g. "RUH-NECK-1042").',
        },
        meta_title: {
          type: 'STRING',
          description: 'SEO meta title under 60 characters.',
        },
        meta_description: {
          type: 'STRING',
          description: 'SEO meta description under 160 characters.',
        },
        seo_keywords: {
          type: 'ARRAY',
          description: 'High-intent search keywords for SEO.',
          items: { type: 'STRING' },
        },
        image_urls: {
          type: 'ARRAY',
          description:
            'Array of 6 generated studio photo URLs to attach to this product.',
          items: { type: 'STRING' },
        },
        base_metal: {
          type: 'STRING',
          description:
            'Base metal material (e.g. "Brass", "Sterling Silver", "Copper Alloy").',
        },
        stone_type: {
          type: 'STRING',
          description:
            'Gemstones or stones used (e.g. "Kundan", "Moissanite", "Cubic Zirconia", "Pearls").',
        },
      },
      required: ['name', 'description', 'price', 'image_urls'],
    },
  },
];
