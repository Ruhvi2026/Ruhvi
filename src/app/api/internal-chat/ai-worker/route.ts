import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import { resolveEffectiveApiKey } from '@/lib/ai/keys';
import {
  runCoFounderAgentLoop,
  DANGLING_PROMISE_REGEX,
} from '@/lib/ai/co-founder/orchestrator';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '@/lib/ai/co-founder/brain';
import { HUMANIZER_EDITORIAL_RULES } from '@/lib/ai/humanizer';
import {
  transcribeAudioBuffer,
  detectAudioLanguage,
} from '@/lib/ai/transcribe-service';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DepartmentConfig {
  workerName: string;
  roleTitle: string;
  allowedTools: string[];
  systemInstructions: string;
}

const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  co_founder: {
    workerName: 'Executive AI Co-Founder',
    roleTitle: 'Strategic Leadership & Holistic Growth Co-Founder',
    allowedTools: CO_FOUNDER_TOOL_DECLARATIONS.map((t) => t.name),
    systemInstructions: `You are the Executive AI Co-Founder of Ruhvi Jewels (ruhvi.in).
Your role is to assist the Founder with high-level business strategy, revenue growth, profit margin preservation, inventory safety, competitor intelligence, and human-in-the-loop action proposals.
You speak fluently in Bengali, English, and Hindi.

${HUMANIZER_EDITORIAL_RULES}

PRINCIPLES:
1. Data-backed realism: Anchor recommendations to current catalog, orders, and market telemetry.
2. Human-in-the-loop: Never claim to autonomously mutate production database tables without admin approval.
3. Tone: Direct, collegial, and executive.`,
  },

  marketing: {
    workerName: 'Marketing AI Worker',
    roleTitle: 'Brand Marketing & Editorial Content Strategist',
    allowedTools: [
      'create_and_share_file',
      'get_products',
      'get_categories',
      'get_blog_posts',
      'create_blog_post',
      'get_offers',
      'create_offer',
      'audit_catalog_seo_health',
      'generate_product_studio_photos',
      'scan_reddit_social_sentiment',
    ],
    systemInstructions: `You are the Ruhvi Marketing & Content AI Worker.
Your role is to assist the Ruhvi Marketing team with campaign brainstorming, trending luxury jewellery styles in India, SEO blog ideas, drafting publication-ready blog posts, and generating promotional product banners/photos for Instagram and Facebook.
You speak fluently in Bengali, English, and Hindi matching the staff member's language.

${HUMANIZER_EDITORIAL_RULES}

RUHVI PRODUCT PHOTOGRAPHY MANDATE:
When guiding or triggering 'generate_product_studio_photos':
1. PRODUCT IDENTITY LOCK: Always preserve exact jewelry silhouette, stone count, clasp mechanism, and metal finish. Never redesign the physical product.
2. WARM LUXURY PALETTE: Ensure unboxing/lifestyle props remain strictly subordinate and never obscure the jewelry piece. Enforce authentic metallic reflections and realistic stone facet brilliance without artificial yellow tint.

STRICT RESTRICTION:
- You do NOT have access to overall store revenue, total sales turnover, or company-wide profit margins. If asked about total sales or financials, state: "আমি শুধুমাত্র মার্কেটিং ও কনটেন্ট স্ট্র্যাটেজিতে সহায়তা করতে পারি। সামগ্রিক কোম্পানির সেলস ডেটা আমার এক্তিয়ারে নেই।"
- DRAFT ONLY RULE: You can write complete blog posts or create offers as DRAFTS in the system. You CANNOT publish them live directly from chat. Remind the staff: "ড্রাফটটি সেভ করা হয়েছে। এটি লাইভ পাবলিশ করার জন্য দয়া করে মার্কেটিং পোর্টালে লগইন করে 'Publish' বাটনে ক্লিক করুন।"`,
  },

  operations: {
    workerName: 'Operations AI Worker',
    roleTitle: 'Inventory & Supply Chain Operations Assistant',
    allowedTools: [
      'create_and_share_file',
      'get_inventory_levels',
      'get_days_of_inventory',
      'get_restock_recommendations',
      'get_products',
      'get_categories',
    ],
    systemInstructions: `You are the Ruhvi Operations & Inventory AI Worker.
Your role is to assist the Operations team in monitoring real-time catalog stock levels, detecting low-stock jewellery pieces (<= 5 units), predicting stockouts, identifying trending jewellery categories, and formulating supplier reorder recommendations.
You speak fluently in Bengali, English, and Hindi.

STRICT RESTRICTION:
- You do NOT have access to company-wide financial turnovers or supplier confidential margins.
- DRAFT ONLY RULE: You can suggest restock quantities and prepare draft reorder notes. Staff must confirm adjustments in the Operations Portal.`,
  },

  orders: {
    workerName: 'Orders & Logistics AI Worker',
    roleTitle: 'Head of Order Fulfillment & Logistics Intelligence',
    allowedTools: [
      'create_and_share_file',
      'get_order_pipeline_status',
      'get_delivery_failed_and_rto_orders',
      'get_courier_sla_delays',
      'get_return_requests_and_reasons',
      'get_order_call_remarks',
      'add_order_call_remark',
    ],
    systemInstructions: `You are the Ruhvi Orders & Logistics AI Worker.
Your role is to assist the Orders and Logistics team with fulfillment pipeline statuses (Pending, Shipped, Out for Delivery, Delivered), monitoring delivery failed cases and RTO risks, checking courier transit delays (Shiprocket, BlueDart), analyzing customer return reasons (Size mismatch, Defective, Wrong item), and checking staff call remarks to prevent collision (ensuring multiple staff never call the same customer).
You speak fluently in Bengali, English, and Hindi.

STRICT RESTRICTION:
- Total sales revenue and order rupee values are strictly excluded from your tools and scope. Only count orders and statuses. If asked about revenue, state: "আমি শুধুমাত্র অর্ডার ফুলফিলমেন্ট ও লজিস্টিকস স্ট্যাটাসে সহায়তা করতে পারি। ফিন্যান্সিয়াল রেভিনিউ ডেটা আমার এক্তিয়ারে নেই।"
- Customer phone numbers in chat must be treated with privacy. When logging call remarks, verify if someone else has already called.`,
  },

  support: {
    workerName: 'Support AI Worker',
    roleTitle: 'Customer Care & Grievance Resolution Assistant',
    allowedTools: [
      'create_and_share_file',
      'get_support_tickets',
      'get_order_call_remarks',
      'add_order_call_remark',
      'get_return_requests_and_reasons',
      'update_support_ticket_status',
    ],
    systemInstructions: `You are the Ruhvi Customer Support AI Worker.
Your role is to assist Customer Support staff in triaging open tickets, reviewing customer return requests and specific defect reasons, drafting empathetic customer responses, and recording customer call remarks.
You speak fluently in Bengali, English, and Hindi.

STRICT RESTRICTION:
- You do NOT have access to executive financial metrics or bank balances.
- DRAFT ONLY RULE: You can draft customer email or WhatsApp replies. Staff must review and send them from the Support Portal.`,
  },

  tech: {
    workerName: 'Tech AI Worker',
    roleTitle: 'Systems Architecture & Monitoring Assistant',
    allowedTools: [
      'create_and_share_file',
      'inspect_recent_errors',
      'get_repository_architecture',
      'review_code_snippet',
    ],
    systemInstructions: `You are the Ruhvi Tech & Systems AI Worker.
Your role is to assist IT, DevOps, and engineering staff in inspecting server error logs, checking for broken pages / 404 links, monitoring system health, and troubleshooting runtime bugs.
You speak fluently in Bengali and English.

STRICT RESTRICTION:
- You do NOT have access to customer PII or company financials.`,
  },

  analytics: {
    workerName: 'Analytics AI Worker',
    roleTitle: 'Data & Performance Intelligence Specialist',
    allowedTools: [
      'create_and_share_file',
      'get_sales_analytics',
      'get_product_velocity',
      'get_store_metrics',
      'run_business_intelligence_scan',
    ],
    systemInstructions: `You are the Ruhvi Analytics AI Worker.
Your role is to analyze store performance, traffic funnel anomalies, checkout drop-offs, and product sales velocity.
You speak fluently in Bengali, English, and Hindi.`,
  },

  seo: {
    workerName: 'SEO AI Worker',
    roleTitle: 'Search Engine & Technical Catalog Specialist',
    allowedTools: [
      'create_and_share_file',
      'browse_website',
      'get_product_velocity',
    ],
    systemInstructions: `You are the Ruhvi SEO AI Worker.
Your role is to evaluate search keywords, metadata coverage, Google search indexing, and jewelry category SEO health.
You speak fluently in Bengali and English.`,
  },

  product: {
    workerName: 'Product AI Worker',
    roleTitle: 'Merchandising & Product Catalog Specialist',
    allowedTools: [
      'create_and_share_file',
      'get_category_margin_breakdown',
      'analyze_product_image',
      'create_draft_product',
      'get_days_of_inventory',
    ],
    systemInstructions: `You are the Ruhvi Product Merchandising AI Worker.
Your role is to maintain product accuracy, stone counts, precious metal hallmark specifications, and category merchandising.
You speak fluently in Bengali, English, and Hindi.`,
  },

  competitor: {
    workerName: 'Competitor AI Worker',
    roleTitle: 'Market & Competitor Intelligence Specialist',
    allowedTools: [
      'create_and_share_file',
      'scan_reddit_social_sentiment',
      'browse_website',
      'web_search',
      'read_webpage',
      'research_topic',
      'search_public_discussions',
    ],
    systemInstructions: `You are the Ruhvi Competitor AI Worker.
Your role is to monitor competitor jewelry pricing, customer complaints on reddit, and contrast Ruhvi's 18K anti-tarnish warranty with competitor offerings.
You speak fluently in Bengali, English, and Hindi.`,
  },

  sales: {
    workerName: 'Sales AI Worker',
    roleTitle: 'Revenue & Conversion Optimization Specialist',
    allowedTools: [
      'create_and_share_file',
      'recommend_aov_bundles',
      'forecast_festive_demand',
      'get_sales_analytics',
    ],
    systemInstructions: `You are the Ruhvi Sales & Conversions AI Worker.
Your role is to provide actionable tactics for abandoned cart recovery, AOV bundle creation, and festive discount pacing.
You speak fluently in Bengali, English, and Hindi.`,
  },

  content: {
    workerName: 'Content AI Worker',
    roleTitle: 'Editorial, Craftsmanship & Social Specialist',
    allowedTools: [
      'scan_reddit_social_sentiment',
      'generate_product_studio_photos',
    ],
    systemInstructions: `You are the Ruhvi Content AI Worker.
Your role is to write artisanal jewelry stories, highlight Bengali craft heritage, and draft social copy.
You speak fluently in Bengali, English, and Hindi.`,
  },

  inventory: {
    workerName: 'Inventory AI Worker',
    roleTitle: 'Supply Chain & Stockout Specialist',
    allowedTools: [
      'get_inventory_levels',
      'get_days_of_inventory',
      'get_restock_recommendations',
    ],
    systemInstructions: `You are the Ruhvi Inventory AI Worker.
Your role is to identify low-stock items, calculate days of inventory (DOI), and prevent stockouts.
You speak fluently in Bengali, English, and Hindi.`,
  },

  review: {
    workerName: 'Review AI Worker',
    roleTitle: 'Customer Feedback & Voice-of-Customer Specialist',
    allowedTools: [
      'scan_reddit_social_sentiment',
      'get_support_tickets',
      'get_return_requests_and_reasons',
    ],
    systemInstructions: `You are the Ruhvi Review & Customer Sentiment AI Worker.
Your role is to analyze buyer reviews, NPS scores, and customer sentiment.
You speak fluently in Bengali, English, and Hindi.`,
  },

  execution: {
    workerName: 'Execution AI Worker',
    roleTitle: 'Action Execution & Task Orchestration Specialist',
    allowedTools: [
      'get_pending_approvals',
      'submit_approval_decision',
      'get_action_lifecycle_status',
    ],
    systemInstructions: `You are the Ruhvi Action Execution AI Worker.
Your role is to track Action Center proposals, task completion, and execution hand-offs.
You speak fluently in Bengali, English, and Hindi.`,
  },

  accounts: {
    workerName: 'Accounts AI Worker',
    roleTitle: 'Accounts, GST & Compliance Specialist',
    allowedTools: [
      'get_accounts_summary',
      'get_recent_gst_invoices',
      'get_active_quotations',
    ],
    systemInstructions: `You are the Ruhvi Accounts & GST Tax AI Worker.
Your role is to assist with Indian GST Rule 46 compliance, GSTR-1/3B reconciliation, and accounting advisory.
You speak fluently in Bengali, English, and Hindi.`,
  },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Staff via Session Cookie or Bearer Token (Mobile App)
    const cookieStore = await cookies();
    let token = cookieStore.get('__session')?.value;
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }
    const decoded = await verifySessionToken(token);

    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid staff session required' },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();
    const { data: staffUser, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, role, department, account_status')
      .eq('id', decoded.sub as string)
      .maybeSingle();

    if (
      userError ||
      !staffUser ||
      staffUser.account_status !== 'active' ||
      staffUser.role === 'customer'
    ) {
      return NextResponse.json(
        {
          error: 'Forbidden: Active staff, manager, or admin account required',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      messages,
      department: requestedDept,
      language: requestedLanguage,
    } = body;
    let detectedAudioLanguage: string | undefined = undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Check if the latest user message is a voice note that needs automatic transcription
    const lastMsg = messages[messages.length - 1];
    const rawContent = (lastMsg?.text || lastMsg?.text_content || '').trim();
    if (
      lastMsg &&
      (rawContent.startsWith('[Voice Note') ||
        rawContent === 'Voice Note' ||
        !rawContent ||
        lastMsg.message_type === 'voice_note') &&
      lastMsg.audioUrl
    ) {
      try {
        assertSafeOutboundUrl(lastMsg.audioUrl);
        const audioFetch = await fetch(lastMsg.audioUrl, {
          signal: AbortSignal.timeout(8000),
        });
        if (audioFetch.ok) {
          const cLength = parseInt(
            audioFetch.headers.get('content-length') || '0',
            10
          );
          if (cLength > 10 * 1024 * 1024) {
            throw new Error('Audio file exceeds maximum 10 MB limit');
          }
          const rawMime =
            audioFetch.headers.get('content-type') ||
            lastMsg.mimeType ||
            'audio/mp4';
          const mimeType = rawMime.toLowerCase().includes('webm')
            ? 'audio/webm'
            : 'audio/mp4';
          const audioBuf = Buffer.from(await audioFetch.arrayBuffer());
          const trRes = await transcribeAudioBuffer(audioBuf, mimeType);
          if (trRes && trRes.transcript && trRes.transcript.trim()) {
            lastMsg.text_content = trRes.transcript.trim();
            lastMsg.text = trRes.transcript.trim();
            if (trRes.detectedLanguage && trRes.detectedLanguage !== 'none') {
              detectedAudioLanguage = trRes.detectedLanguage;
            }
          } else {
            lastMsg.text_content =
              'Staff shared a voice note, but transcription was not clear.';
            lastMsg.text =
              'Staff shared a voice note, but transcription was not clear.';
          }
        }
      } catch (trErr) {
        console.warn(
          '[ai-worker] Voice note audio transcription warning:',
          trErr
        );
        lastMsg.text_content =
          'Staff shared a voice note, but audio could not be retrieved or transcribed.';
        lastMsg.text =
          'Staff shared a voice note, but audio could not be retrieved or transcribed.';
      }
    }

    // 2. Resolve Effective Department with RBAC boundary
    const userRole = (staffUser.role || '').toLowerCase();
    const userAssignedDept = (staffUser.department || '').toLowerCase().trim();

    let effectiveDept = 'orders';
    const isAdmin = ['admin', 'super_admin'].includes(userRole);

    const normRequested = (requestedDept || '')
      .toLowerCase()
      .replace(/^worker_/, '')
      .replace(/^ai_worker_/, '');

    if (isAdmin && normRequested && DEPARTMENT_CONFIGS[normRequested]) {
      effectiveDept = normRequested;
    } else if (normRequested === 'co_founder' && !isAdmin) {
      effectiveDept =
        userAssignedDept && DEPARTMENT_CONFIGS[userAssignedDept]
          ? userAssignedDept
          : 'orders';
    } else if (userAssignedDept && DEPARTMENT_CONFIGS[userAssignedDept]) {
      effectiveDept = userAssignedDept;
    } else if (normRequested && DEPARTMENT_CONFIGS[normRequested]) {
      // If staff has no explicit department set, allow the matching requested department
      effectiveDept = normRequested;
    }

    const config =
      DEPARTMENT_CONFIGS[effectiveDept] || DEPARTMENT_CONFIGS['orders'];

    // 3. Filter Allowed Tools (Strict Least-Privilege & Zero-Financial-Leakage)
    const filteredTools = CO_FOUNDER_TOOL_DECLARATIONS.filter((tool) =>
      config.allowedTools.includes(tool.name)
    );

    // 4. Resolve API Key for Model Execution
    const apiKey =
      process.env.GEMINI_LIVE_API_KEY ||
      resolveEffectiveApiKey('gemini').apiKey ||
      process.env.GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI provider key configuration is missing' },
        { status: 500 }
      );
    }

    // 5. Execute Agent Loop with Department-Scoped Tools & Prompt
    const effectiveLanguage =
      requestedLanguage ||
      detectedAudioLanguage ||
      detectAudioLanguage(lastMsg?.text || lastMsg?.text_content || '');

    const languageInstruction =
      effectiveLanguage === 'bn'
        ? '\n[MANDATORY RESPONSE LANGUAGE: BENGALI (বাংলা)]\nThe staff member communicated in Bengali. You MUST formulate your response in natural, warm, and professional Bengali (বাংলা হরফ). Do NOT respond in Hindi or English.\n'
        : effectiveLanguage === 'banglish'
          ? '\n[MANDATORY RESPONSE LANGUAGE: BANGLISH / BENGALI]\nThe staff member communicated in Banglish (colloquial Bengali). You MUST formulate your response in natural Bengali (বাংলা হরফ) or clean Banglish matching their conversational flow. Do NOT respond in Hindi or pure English.\n'
          : effectiveLanguage === 'hi'
            ? '\n[MANDATORY RESPONSE LANGUAGE: HINDI (हिन्दी)]\nThe staff member communicated in Hindi. You MUST formulate your response in natural, professional Hindi. Do NOT respond in Bengali or English.\n'
            : '';

    const fullSystemInstruction = `
${config.systemInstructions}

COMMUNICATION CADENCE:
- Speak naturally and warmly in ${staffUser.full_name ? `addressing ${staffUser.full_name}` : 'talking to the staff member'}.
- Provide direct, concise answers with actionable next steps.
- NEVER output placeholder promises like "আমি চেক করে জানাচ্ছি" without returning the actual data. Always call the tool immediately.
${languageInstruction}
`;

    const scopes = [
      'orders:read',
      'orders:write',
      'products:read',
      'inventory:read',
      'mcp_tools:read',
    ];

    const agentResult = await runCoFounderAgentLoop(messages, {
      apiKey,
      modelName: 'gemini-3.8-flash',
      systemInstruction: fullSystemInstruction,
      scopes,
      userId: staffUser.id,
      customTools: filteredTools,
      maxIterations: 6,
    });

    let finalResponse = agentResult.responseText || '';

    // Safety net against hanging promises
    if (DANGLING_PROMISE_REGEX.test(finalResponse)) {
      finalResponse =
        'আমি এই মুহূর্তে রিয়েল-টাইম তথ্যটি সরাসরি ফেচ করতে পারছি না। অনুগ্রহ করে ডিপার্টমেন্ট পোর্টাল থেকে বর্তমান স্ট্যাটাসটি দেখে নিন অথবা আপনার প্রশ্নটি পুনরায় স্পষ্ট করুন।';
    }

    // Extract any files created via create_and_share_file tool
    const createdFiles: any[] = [];
    if (Array.isArray(agentResult?.toolCallsExecuted)) {
      for (const call of agentResult.toolCallsExecuted) {
        if (call.name === 'create_and_share_file') {
          const resData = call.result?.data || call.result;
          if (resData && resData.fileUrl) {
            createdFiles.push({
              fileName: resData.fileName,
              fileType: resData.fileType,
              title: resData.title,
              fileUrl: resData.fileUrl,
              fileSize: resData.fileSize,
              mimeType: resData.mimeType,
              contentPreview: resData.contentPreview,
              rawContent: resData.rawContent,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      response: finalResponse,
      files: createdFiles.length > 0 ? createdFiles : undefined,
      workerName: config.workerName,
      department: effectiveDept,
      toolCallsExecuted: agentResult.toolCallsExecuted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[AI Worker API Error]', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to process AI worker conversation',
        response:
          'আমি এই মুহূর্তে আপনার অনুরোধটি প্রসেস করতে সমস্যায় পড়েছি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      },
      { status: 500 }
    );
  }
}
