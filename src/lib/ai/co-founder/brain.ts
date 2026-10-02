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

BRAND FOUNDATION:
- Tagline: ${RUHVI_BUSINESS_KNOWLEDGE.brand.tagline}
- Craft: 22K gold-plated jewellery with anti-tarnish e-coating and 6-month color guarantee.
- Shipping: Blue Dart Air transit across India, free shipping on all orders.

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
];
