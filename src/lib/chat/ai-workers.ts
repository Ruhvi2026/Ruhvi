// src/lib/chat/ai-workers.ts
//
// Canonical AI Co-Founder & Specialist Worker directory for RuhChat & Floating Messenger.
// Covers all 14 canonical specialist domains plus the Executive AI Co-Founder.

export interface AIWorkerPersona {
  id: string;
  department: string;
  name: string;
  roleTitle: string;
  avatarEmoji: string;
  welcomeMessage: string;
  capabilities: string[];
}

export const AI_WORKER_PERSONAS: Record<string, AIWorkerPersona> = {
  co_founder: {
    id: 'ai_co_founder',
    department: 'co_founder',
    name: 'Executive AI Co-Founder',
    roleTitle: 'Holistic Business Strategy & Leadership',
    avatarEmoji: '👑',
    welcomeMessage:
      'নমস্কার! আমি আপনার এআই কো-ফাউন্ডার। রুহভির সার্বিক গ্রোথ, সেলস রেভিনিউ, ক্যাশফ্লো, কম্পিটিটর মুভ এবং স্ট্র্যাটেজিক অ্যাকশন প্ল্যানিংয়ে আপনাকে সাহায্য করতে প্রস্তুত। আজ আমাদের বিজনেস সংক্রান্ত কী পর্যালোচনা করতে চান?',
    capabilities: [
      'Holistic Store Strategy',
      'Revenue & Margin Analytics',
      'Action Center Proposals',
      'Competitor Positioning',
    ],
  },
  orders: {
    id: 'ai_worker_orders',
    department: 'orders',
    name: 'Orders AI Worker',
    roleTitle: 'Fulfillment & Logistics Intelligence',
    avatarEmoji: '📦',
    welcomeMessage:
      'নমস্কার! আমি রুহভি অর্ডার্স অ্যান্ড লজিস্টিকস এআই। ফুলফিলমেন্ট পাইপলাইন স্ট্যাটাস, কুরিয়ার ট্রানজিট ডিলে (Shiprocket), ডেলিভারি ফেইল্ড কেস, RTO ট্র্যাকিং এবং কাস্টমার রিটার্ন কারণ অ্যানালিসিসে আপনাকে সহায়তা করতে প্রস্তুত। টিমমেটদের কল রিমার্ক দেখে ডুপ্লিকেট কল এড়াতে সাহায্য করব। কীভাবে সাহায্য করতে পারি?',
    capabilities: [
      'Pipeline Status',
      'Delivery Failed & RTO',
      'Return Reasons Breakdown',
      'Call Collision Guard',
    ],
  },
  support: {
    id: 'ai_worker_support',
    department: 'support',
    name: 'Support AI Worker',
    roleTitle: 'Customer Care & Grievance Resolution',
    avatarEmoji: '🎧',
    welcomeMessage:
      'হ্যালো! আমি রুহভি কাস্টমার সাপোর্ট এআই। ওপেন টিকেট ট্রায়াজিং, কাস্টমার রিটার্ন রিকোয়েস্ট (ডিফেক্ট ক্লেম/সাইজ মিসম্যাচ), সহানুভূতিশীল রিপ্লাই ড্রাফট এবং কাস্টমার কল রিমার্ক ট্র্যাকিংয়ে আপনাকে সাহায্য করতে পারি। কীভাবে সাহায্য করতে পারি?',
    capabilities: [
      'Return Claim Triage',
      'Empathic Draft Replies',
      'Ticket Priority',
      'Call Remarks Log',
    ],
  },
  operations: {
    id: 'ai_worker_operations',
    department: 'operations',
    name: 'Operations AI Worker',
    roleTitle: 'Inventory & Supply Chain Operations',
    avatarEmoji: '⚙️',
    welcomeMessage:
      'হ্যালো! আমি রুহভি অপারেশনস এআই কো-ওয়ার্কার। রিয়েল-টাইম ক্যাটালগ স্টক ট্র্যাকিং, লো-স্টক অর্নামেন্টস অ্যালার্ট (<= 5 units), স্টকআউট প্রেডিকশন এবং সাপ্লায়ার রিঅর্ডার ড্রাফট তৈরিতে আপনাকে সহায়তা করতে পারি। আজ কী চেক করতে চান?',
    capabilities: [
      'Stockout Risk Tracking',
      'Days of Inventory',
      'Restock Drafts',
      'Catalog Health',
    ],
  },
  marketing: {
    id: 'ai_worker_marketing',
    department: 'marketing',
    name: 'Marketing AI Worker',
    roleTitle: 'Brand Marketing & Content Strategist',
    avatarEmoji: '✨',
    welcomeMessage:
      'নমস্কার! আমি রুহভি মার্কেটিং এআই কো-ওয়ার্কার। সোশ্যাল মিডিয়া ক্যাম্পেইন, SEO ব্লগ ড্রাফট এবং ট্রেন্ডিং জুয়েলারি প্রমো ব্যানার তৈরিতে আমি সাহায্য করতে পারি। আজ কোন ক্যাম্পেইন নিয়ে কাজ করব?',
    capabilities: [
      'Creative Promo Photos',
      'SEO Blog Drafts',
      'Offers & Coupons',
      'Catalog SEO',
    ],
  },
  tech: {
    id: 'ai_worker_tech',
    department: 'tech',
    name: 'Tech AI Worker',
    roleTitle: 'Systems Architecture & Monitoring',
    avatarEmoji: '💻',
    welcomeMessage:
      'Hello! I am the Ruhvi Tech & Systems AI Worker. I can assist you with server 500 error log analysis, 404 broken route spikes, latency investigations, and system architectural troubleshooting.',
    capabilities: [
      'Sentry 500 Log Analysis',
      '404 Broken Slug Spikes',
      'Server Latency Audit',
      'System Health',
    ],
  },
  analytics: {
    id: 'ai_worker_analytics',
    department: 'analytics',
    name: 'Analytics AI Worker',
    roleTitle: 'Data & Intelligence Specialist',
    avatarEmoji: '📊',
    welcomeMessage:
      'হ্যালো! আমি রুহভি অ্যানালিটিক্স এআই। স্টোর ট্র্যাফিক, কনভার্সন রেট, কাস্টমার ড্রপ-অফ অ্যানোবেলি এবং সেলস ট্রেন্ড অ্যানালাইসিস করতে পারি। কোন ডেটা পয়েন্টটি দেখতে চান?',
    capabilities: [
      'Traffic Anomaly Detection',
      'Checkout Drop-off Analysis',
      'AOV & Conversion Trends',
      'Cohort Insights',
    ],
  },
  seo: {
    id: 'ai_worker_seo',
    department: 'seo',
    name: 'SEO AI Worker',
    roleTitle: 'Search Engine & Technical Catalog Specialist',
    avatarEmoji: '🔍',
    welcomeMessage:
      'নমস্কার! আমি রুহভি এসইও স্পেশালিস্ট এআই। প্রোডাক্ট মেটা ট্যাগ, জুয়েলারি কি-ওয়ার্ড অপ্টিমাইজেশন, স্কিমা মার্কআপ ও অর্গানিক সার্চ র‍্যাঙ্কিং অডিটে সহায়তা করতে প্রস্তুত।',
    capabilities: [
      'Meta Tag Optimization',
      'Schema Audit',
      'Jewelry Keyword Research',
      'Search Performance',
    ],
  },
  product: {
    id: 'ai_worker_product',
    department: 'product',
    name: 'Product AI Worker',
    roleTitle: 'Merchandising & Product Catalog Specialist',
    avatarEmoji: '💎',
    welcomeMessage:
      'হ্যালো! আমি রুহভি প্রোডাক্ট মার্চেন্ডাইজিং এআই। জুয়েলারি মেটাল টাইপ, জেমস্টোন ফিনিশ, প্রাইসিং স্ট্রাকচার এবং ক্যাটালগ ক্যাটাগোরাইজেশন ঠিক রাখতে সাহায্য করব।',
    capabilities: [
      'Jewelry Specifications',
      'Pricing Tier Strategy',
      'Catalog Merchandising',
      'Visual Consistency',
    ],
  },
  competitor: {
    id: 'ai_worker_competitor',
    department: 'competitor',
    name: 'Competitor AI Worker',
    roleTitle: 'Market & Competitor Intelligence Specialist',
    avatarEmoji: '🎯',
    welcomeMessage:
      'নমস্কার! আমি মার্কেট কম্পিটিটর ইন্টেলিজেন্স এআই। Giva, Palmonas, Mia by Tanishq এবং অন্যান্য D2C জুয়েলারি ব্র্যান্ডের অফার, মূল্য ও অ্যান্টি-টার্নিশ গ্যারান্টি তুলনা করি।',
    capabilities: [
      'D2C Competitor Pricing',
      'Promotional Moves',
      'Value Proposition Contrast',
      'Customer Grievance Audit',
    ],
  },
  sales: {
    id: 'ai_worker_sales',
    department: 'sales',
    name: 'Sales AI Worker',
    roleTitle: 'Revenue & Conversions Specialist',
    avatarEmoji: '📈',
    welcomeMessage:
      'হ্যালো! আমি সেলস ও কনভার্সন এআই। অ্যাবান্ডন্ড কার্ট রিকভারি, হাই-ভ্যালু কাস্টমার নার্চারিং এবং চেকআউট ফানেল অপ্টিমাইজেশনে সহায়তা করতে প্রস্তুত।',
    capabilities: [
      'Cart Recovery Tactics',
      'AOV Boosting Bundles',
      'COD Confirmation Tactics',
      'Repeat Purchase Drivers',
    ],
  },
  content: {
    id: 'ai_worker_content',
    department: 'content',
    name: 'Content AI Worker',
    roleTitle: 'Editorial, Craftsmanship & Social Specialist',
    avatarEmoji: '📝',
    welcomeMessage:
      'নমস্কার! আমি রুহভি কনটেন্ট এআই। কারিগরি জুয়েলারি তৈরির গল্প, ১৮কে গোল্ড প্লেটিং ও ৯২৫ সিলভারের ইউনিক স্টোরিটেলিং ড্রাফট করতে পারি।',
    capabilities: [
      'Artisan Storytelling',
      'Editorial Copywriting',
      'Social Captioning',
      'Brand Tone Enforcement',
    ],
  },
  inventory: {
    id: 'ai_worker_inventory',
    department: 'inventory',
    name: 'Inventory AI Worker',
    roleTitle: 'Supply Chain & Stockout Specialist',
    avatarEmoji: '🏷️',
    welcomeMessage:
      'হ্যালো! আমি সাপ্লাই চেইন ও ইনভেন্টরি এআই। ডেড-স্টক ক্যাপিটাল রিলিজ, সেফটি স্টক বাফার ও সাপ্লায়ার রিঅর্ডার ক্যালকুলেশনে সাহায্য করতে পারি।',
    capabilities: [
      'Dead Stock Identification',
      'Reorder Run-Rate',
      'Safety Buffer Calculations',
      'Supplier Lead-Time Sync',
    ],
  },
  review: {
    id: 'ai_worker_review',
    department: 'review',
    name: 'Review AI Worker',
    roleTitle: 'Customer Feedback & Voice-of-Customer Specialist',
    avatarEmoji: '⭐',
    welcomeMessage:
      'নমস্কার! আমি কাস্টমার রিভিউ ও ফিডব্যাক এআই। কাস্টমার সন্তুষ্টি, প্রোডাক্ট রিভিউ রেটিং ও এনপিএস সেন্টিমেন্ট ট্র্যাক করি।',
    capabilities: [
      'Sentiment Analysis',
      'Customer Grievance Mining',
      'Review Moderation Drafts',
      'Feature Satisfaction',
    ],
  },
  execution: {
    id: 'ai_worker_execution',
    department: 'execution',
    name: 'Execution AI Worker',
    roleTitle: 'Action Execution & Task Orchestration Specialist',
    avatarEmoji: '🚀',
    welcomeMessage:
      'হ্যালো! আমি অ্যাকশন এক্সিকিউশন এআই। অ্যাকশন সেন্টারের পেন্ডিং রিকমেন্ডেশন ও টাস্ক অর্কেস্ট্রেশন তদারকি করতে সাহায্য করব।',
    capabilities: [
      'Action Center Tracking',
      'Approval State Verification',
      'Operational Task Hand-off',
      'SLA Follow-up',
    ],
  },
  accounts: {
    id: 'ai_worker_accounts',
    department: 'accounts',
    name: 'Accounts & Tax AI Worker',
    roleTitle: 'Accounts, GST & Compliance Specialist',
    avatarEmoji: '💼',
    welcomeMessage:
      'নমস্কার! আমি রুহভি অ্যাকাউন্টস ও জিএসটি ট্যাক্স এআই। জিএসটি রুল ৪৬ ইনভয়েস, জিএসটিআর-১ ও ৩বি সামারি, ইনপুট ট্যাক্স ক্রেডিট ও হিসাব নিকাশে সহায়তা দিতে প্রস্তুত।',
    capabilities: [
      'GSTR-1 & 3B Summary',
      'Section 17(5) ITC Audit',
      'Day Book Verification',
      'Manufacturing COGS',
    ],
  },
};

export function getAIWorker(departmentOrId: string): AIWorkerPersona {
  const normalized = (departmentOrId || '')
    .toLowerCase()
    .replace(/^worker_/, '')
    .replace(/^ai_worker_/, '');
  return AI_WORKER_PERSONAS[normalized] || AI_WORKER_PERSONAS['orders'];
}

export function listAIWorkers(): AIWorkerPersona[] {
  return Object.values(AI_WORKER_PERSONAS);
}
