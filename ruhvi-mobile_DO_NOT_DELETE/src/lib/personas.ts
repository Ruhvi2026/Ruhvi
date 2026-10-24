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
  founder: {
    id: 'ai_co_founder',
    department: 'founder',
    name: 'Ruhvi AI Co-Founder',
    roleTitle: 'Executive AI Partner & Strategic Intelligence',
    avatarEmoji: '🤖',
    welcomeMessage:
      'Greetings Founder. I am your Ruhvi AI Co-Founder. I have real-time access to store analytics, financials, catalog, support, orders, and marketing.\n\nGive me any instruction, ask for status reports, or delegate execution tasks directly!',
    capabilities: [
      'Financials & Margins',
      'Strategic Planning',
      'Catalog Intelligence',
      'Multi-Agent Execution',
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
      'নমস্কার! আমি রুহভি মার্কেটিং এআই কো-ওয়ার্কার। সোশ্যাল মিডিয়া ক্যাম্পেইন, SEO ব্লগ ড্রাফট এবং ট্রেন্ডিং জুয়েলারি প্রমো ব্যানার তৈরিতে আমি সাহায্য করতে পারি। মনে রাখবেন—আমি ড্রাফট তৈরি করতে পারি, কিন্তু লাইভ পাবলিশ করার জন্য আপনাকে মার্কেটিং পোর্টালে গিয়ে রিভিউ করে পাবলিশ করতে হবে। আজ কোন ক্যাম্পেইন নিয়ে কাজ করব?',
    capabilities: [
      'SEO Blog Drafts',
      'Promotional Photos',
      'Discount Offers',
      'Campaign Planning',
    ],
  },
  tech: {
    id: 'ai_worker_tech',
    department: 'tech',
    name: 'Tech AI Worker',
    roleTitle: 'System Stability & Sentry Intelligence',
    avatarEmoji: '💻',
    welcomeMessage:
      'নমস্কার! আমি রুহভি টেকনিক্যাল অ্যান্ড সিস্টেম স্টেবিলিটি এআই। সেন্ট্রি এরর স্পাইকস (500 Internal Server Errors), 404 পেজ নট ফাউন্ড অ্যানোমালি, হাই ল্যাটেন্সি রেসপন্স এবং এআই সার্ভিস ব্রিজের হেলথ মনিটরিংয়ে আপনাকে সাহায্য করতে পারি। কীভাবে সহায়তা করতে পারি?',
    capabilities: [
      'Sentry 500 Spikes',
      '404 Anomaly Scanner',
      'Latency Diagnostics',
      'API Health Monitor',
    ],
  },
};

export function resolveAIWorkerForUser(
  role?: string | null,
  department?: string | null,
  email?: string | null
): AIWorkerPersona {
  const normRole = (role || '').toLowerCase().trim();
  const normDept = (department || '').toLowerCase().trim();
  const normEmail = (email || '').toLowerCase().trim();

  // If Admin or Founder
  if (
    normRole === 'admin' ||
    normRole === 'super_admin' ||
    normEmail === 'ruhvi.main@gmail.com'
  ) {
    return AI_WORKER_PERSONAS.founder;
  }

  // If department matches
  if (normDept && AI_WORKER_PERSONAS[normDept]) {
    return AI_WORKER_PERSONAS[normDept];
  }

  // Common aliases
  if (normDept.includes('order') || normDept.includes('ship') || normDept.includes('logist')) {
    return AI_WORKER_PERSONAS.orders;
  }
  if (normDept.includes('support') || normDept.includes('care') || normDept.includes('help')) {
    return AI_WORKER_PERSONAS.support;
  }
  if (normDept.includes('operat') || normDept.includes('stock') || normDept.includes('inven')) {
    return AI_WORKER_PERSONAS.operations;
  }
  if (normDept.includes('market') || normDept.includes('content') || normDept.includes('sales')) {
    return AI_WORKER_PERSONAS.marketing;
  }
  if (normDept.includes('tech') || normDept.includes('dev') || normDept.includes('eng')) {
    return AI_WORKER_PERSONAS.tech;
  }

  // Default to Orders AI Worker
  return AI_WORKER_PERSONAS.orders;
}
