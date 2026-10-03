import 'server-only';

import {
  buildKnowledgeContext,
  RUHVI_BUSINESS_KNOWLEDGE,
} from '@/lib/ai/knowledge';
import { getRelevantMemories, CoFounderMemoryItem } from './memory';
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

  // 2. Fetch relevant long-term memories from Supabase
  let memories: CoFounderMemoryItem[] = [];
  if (options.userId) {
    memories = await getRelevantMemories(options.userId, undefined, 5);
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

  const memoryBlock =
    memories.length > 0
      ? `LONG-TERM STRATEGIC MEMORIES & PREFERENCES:\n` +
        memories
          .map((m) => `- [${m.category.toUpperCase()}] ${m.key}: ${m.value}`)
          .join('\n')
      : `LONG-TERM STRATEGIC MEMORIES: None recorded yet.`;

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
8. MEASURE & LEARN: Track closed-loop outcomes and persist validated findings to business memory.

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
];
