/**
 * AI Knowledge Layer
 *
 * Provides the chatbot with Ruhvi business knowledge from two sources:
 * 1. LIVE DATA — Products, categories, stock, prices from the database
 * 2. STATIC KNOWLEDGE — Shipping, returns, warranty, payments, FAQs, care
 *
 * This layer is injected into chatbot prompts so the AI can answer
 * customer questions accurately using real, current information
 * rather than relying on a massive hardcoded system prompt.
 */

import { createServerClient } from '@supabase/ssr';

// ── Static Business Knowledge ──────────────────────────────────────────────

export const RUHVI_BUSINESS_KNOWLEDGE = {
  brand: {
    name: 'Ruhvi',
    tagline: 'Fine Jewellery',
    website: 'https://ruhvi.in',
    description:
      'Ruhvi is an exquisite fine jewellery brand offering premium gold-plated pieces crafted with care and tradition.',
  },

  materials: {
    base: 'Nickel-free brass base',
    plating: 'Premium 22K gold-plated',
    coating: 'Anti-tarnish e-coating for lasting shine',
    colorGuarantee: '6-month color guarantee on all pieces',
    hallmarking:
      'BIS hallmarking applies only to solid gold. Our gold-plated pieces are not hallmarked, which is standard for plated jewellery.',
  },

  shipping: {
    carrier: 'Blue Dart Air Transit',
    deliveryTime: '3-5 business days',
    insurance: 'All shipments are fully insured',
    tracking: 'Tracking number provided via email after dispatch',
    freeShippingThreshold: 'Free shipping on all orders',
    packaging:
      'Premium gift-ready packaging with branded box, pouch, and care card',
  },

  returns: {
    window: '7 days from delivery',
    condition:
      'Piece must be unworn, undamaged, and in original packaging with all tags attached',
    process:
      '1. Contact support or raise a ticket via chat. 2. Return pickup arranged. 3. Quality inspection. 4. Refund processed.',
    refundTimeline: '7-10 business days after return approval',
    refundMethods: 'Original payment method or store wallet credit',
    nonReturnable:
      'Personalized/engraved pieces, sale items marked as final sale',
  },

  warranty: {
    coverage: 'Manufacturing defects covered for 1 year from purchase',
    includes:
      'Defective clasps, broken chains (not from misuse), plating defects within guarantee period',
    excludes:
      'Normal wear and tear, tarnishing beyond guarantee period, damage from chemicals/perfumes/water',
    claimProcess:
      'Contact support with order number and photos of the defect. Our team will assess and arrange repair or replacement.',
  },

  payments: {
    methods: [
      'UPI (PhonePe, Google Pay, Paytm)',
      'Credit/Debit Cards',
      'Net Banking',
      'Cash on Delivery (COD)',
      'Ruhvi Wallet Balance',
    ],
    codCharges: 'COD available on select orders',
    walletInfo:
      'Ruhvi Wallet can be used for purchases. Wallet balance is credited for returns if customer chooses wallet refund.',
    securePayment:
      'All payments are processed through secure, encrypted gateways.',
  },

  rewardProgram: {
    name: 'Ruhvi Rewards',
    howItWorks:
      'Earn reward coins on every purchase. Coins can be redeemed on future orders.',
    referralProgram:
      'Refer friends to earn additional wallet credits when they make their first purchase.',
  },

  jewelleryCare: [
    'Store pieces individually in the provided pouch or a soft cloth to prevent scratching.',
    'Avoid contact with water, perfumes, lotions, and chemicals.',
    'Remove jewellery before sleeping, bathing, swimming, or exercising.',
    'Clean gently with a soft, dry cloth after wearing.',
    'Keep away from direct sunlight and extreme temperatures.',
    'The anti-tarnish e-coating protects your piece, but following these tips extends its life significantly.',
  ],

  support: {
    channels: [
      'AI Chat (Gia, the Golden Concierge)',
      'WhatsApp',
      'Email: support@ruhvi.in',
    ],
    ticketSystem:
      'Support tickets are automatically created for issues that need human attention.',
    responseTime: 'We aim to respond within 24 hours on business days.',
  },

  faq: [
    {
      q: 'Are your pieces real gold?',
      a: 'Our pieces are premium 22K gold-plated on a nickel-free brass base with anti-tarnish e-coating. They are not solid gold but offer the same beautiful appearance with a 6-month color guarantee.',
    },
    {
      q: 'Do you offer BIS hallmarking?',
      a: 'BIS hallmarking applies only to solid gold jewellery. Since our pieces are gold-plated, they do not carry BIS hallmarks, which is the industry standard for plated jewellery.',
    },
    {
      q: 'How long will my jewellery last?',
      a: 'With proper care, our pieces last for years. The anti-tarnish e-coating provides extra protection. We offer a 6-month color guarantee and 1-year warranty against manufacturing defects.',
    },
    {
      q: 'Can I return or exchange a piece?',
      a: 'Yes! We offer a 7-day return window from delivery. The piece must be unworn and in original packaging. Contact our support for easy returns.',
    },
    {
      q: 'How do I track my order?',
      a: 'Once dispatched, you will receive a tracking number via email. You can also check order status in your account or ask Gia here.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept UPI, credit/debit cards, net banking, Cash on Delivery, and Ruhvi Wallet balance.',
    },
    {
      q: 'How do I use my Ruhvi Wallet?',
      a: 'Your wallet balance is automatically available at checkout. You can combine wallet balance with other payment methods.',
    },
    {
      q: 'Do you ship internationally?',
      a: 'Currently we ship within India only. International shipping is coming soon.',
    },
  ],
};

// ── Live Data Retrieval ────────────────────────────────────────────────────

/**
 * Create a Supabase admin client for knowledge queries.
 */
function createAdminClient(cookieStore?: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() || [];
        },
        setAll() {},
      },
    }
  );
}

/**
 * Fetch product categories for the chatbot knowledge context.
 */
export async function getCategories(supabaseAdmin?: any): Promise<string> {
  const db = supabaseAdmin || createAdminClient();

  const { data, error } = await db
    .from('categories')
    .select('name, slug')
    .order('name');

  if (error || !data || data.length === 0) {
    return 'Categories: Information currently unavailable.';
  }

  return `PRODUCT CATEGORIES:\n${data.map((c: any) => `- ${c.name}`).join('\n')}`;
}

/**
 * Search products by name/keyword for chatbot queries.
 * Returns a summary suitable for the AI prompt context.
 */
export async function searchProducts(
  query: string,
  supabaseAdmin?: any,
  limit: number = 5
): Promise<string> {
  const db = supabaseAdmin || createAdminClient();

  const { data, error } = await db
    .from('products')
    .select('name, slug, price, stock, gold_purity, description')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return `No products found matching "${query}".`;
  }

  return `MATCHING PRODUCTS:\n${data
    .map(
      (p: any) =>
        `- ${p.name} | ₹${p.price} | ${p.stock > 0 ? `In Stock (${p.stock} available)` : 'Out of Stock'} | ${p.gold_purity || '22K'} Gold Plated | View: /products/${p.slug}`
    )
    .join('\n')}`;
}

/**
 * Get featured/popular products for general chatbot queries.
 */
export async function getFeaturedProducts(
  supabaseAdmin?: any,
  limit: number = 6
): Promise<string> {
  const db = supabaseAdmin || createAdminClient();

  const { data, error } = await db
    .from('products')
    .select('name, slug, price, stock, gold_purity')
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return 'Featured products: Information currently unavailable.';
  }

  return `FEATURED PIECES (in stock):\n${data
    .map(
      (p: any) =>
        `- ${p.name} | ₹${p.price} | ${p.gold_purity || '22K'} Gold Plated | View: /products/${p.slug}`
    )
    .join('\n')}`;
}

/**
 * Get product details by slug or name.
 */
export async function getProductDetails(
  identifier: string,
  supabaseAdmin?: any
): Promise<string> {
  const db = supabaseAdmin || createAdminClient();

  const { data, error } = await db
    .from('products')
    .select('name, slug, price, stock, gold_purity, description, images')
    .or(`slug.eq.${identifier},name.ilike.%${identifier}%`)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return `Product "${identifier}" not found.`;
  }

  return `PRODUCT DETAILS:
- Name: ${data.name}
- Price: ₹${data.price}
- Availability: ${data.stock > 0 ? `In Stock (${data.stock} available)` : 'Out of Stock'}
- Material: ${data.gold_purity || '22K'} Gold Plated on Nickel-Free Brass
- Description: ${data.description ? data.description.slice(0, 300) : 'Premium fine jewellery piece'}
- View: /products/${data.slug}`;
}

/**
 * Get active coupons/offers for customer queries.
 */
export async function getActiveCoupons(supabaseAdmin?: any): Promise<string> {
  const db = supabaseAdmin || createAdminClient();

  const { data, error } = await db
    .from('coupons')
    .select(
      'code, discount_type, discount_value, min_order_amount, description, is_public'
    )
    .eq('is_active', true)
    .eq('is_public', true)
    .gte('expiry_date', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    return 'No active public offers at the moment. Check back soon!';
  }

  return `ACTIVE OFFERS & COUPONS:\n${data
    .map(
      (c: any) =>
        `- Code: ${c.code} | ${c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}${c.min_order_amount ? ` (min order ₹${c.min_order_amount})` : ''} | ${c.description || ''}`
    )
    .join('\n')}`;
}

/**
 * Build the complete knowledge context for a chatbot prompt.
 * Intelligently selects which knowledge to include based on the user's query.
 */
export async function buildKnowledgeContext(
  userMessage: string,
  supabaseAdmin?: any
): Promise<string> {
  const msg = userMessage.toLowerCase();
  const db = supabaseAdmin || createAdminClient();

  const knowledgeParts: string[] = [];

  // Always include static business knowledge summary
  const bk = RUHVI_BUSINESS_KNOWLEDGE;
  knowledgeParts.push(`RUHVI BUSINESS INFORMATION:
- Brand: ${bk.brand.name} — ${bk.brand.tagline}
- Materials: ${bk.materials.plating} on ${bk.materials.base}, ${bk.materials.coating}, ${bk.materials.colorGuarantee}
- Hallmarking: ${bk.materials.hallmarking}`);

  // Include shipping info if relevant
  if (
    msg.includes('ship') ||
    msg.includes('deliver') ||
    msg.includes('track') ||
    msg.includes('dispatch') ||
    msg.includes('when will') ||
    msg.includes('how long')
  ) {
    knowledgeParts.push(`SHIPPING:
- Carrier: ${bk.shipping.carrier}
- Delivery: ${bk.shipping.deliveryTime}
- Insurance: ${bk.shipping.insurance}
- Packaging: ${bk.shipping.packaging}`);
  }

  // Include return/refund info if relevant
  if (
    msg.includes('return') ||
    msg.includes('refund') ||
    msg.includes('exchange') ||
    msg.includes('money back') ||
    msg.includes('cancel')
  ) {
    knowledgeParts.push(`RETURNS & REFUNDS:
- Window: ${bk.returns.window}
- Condition: ${bk.returns.condition}
- Process: ${bk.returns.process}
- Refund Timeline: ${bk.returns.refundTimeline}
- Non-Returnable: ${bk.returns.nonReturnable}`);
  }

  // Include warranty info if relevant
  if (
    msg.includes('warranty') ||
    msg.includes('defect') ||
    msg.includes('broken') ||
    msg.includes('damaged') ||
    msg.includes('quality')
  ) {
    knowledgeParts.push(`WARRANTY:
- Coverage: ${bk.warranty.coverage}
- Includes: ${bk.warranty.includes}
- Excludes: ${bk.warranty.excludes}
- Claim Process: ${bk.warranty.claimProcess}`);
  }

  // Include payment info if relevant
  if (
    msg.includes('pay') ||
    msg.includes('upi') ||
    msg.includes('cod') ||
    msg.includes('wallet') ||
    msg.includes('card') ||
    msg.includes('net banking')
  ) {
    knowledgeParts.push(`PAYMENT:
- Methods: ${bk.payments.methods.join(', ')}
- Wallet: ${bk.payments.walletInfo}
- Security: ${bk.payments.securePayment}`);
  }

  // Include jewellery care if relevant
  if (
    msg.includes('care') ||
    msg.includes('clean') ||
    msg.includes('maintain') ||
    msg.includes('tarnish') ||
    msg.includes('store') ||
    msg.includes('last')
  ) {
    knowledgeParts.push(
      `JEWELLERY CARE TIPS:\n${bk.jewelleryCare.map((t) => `- ${t}`).join('\n')}`
    );
  }

  // Include coupon/offer info if relevant
  if (
    msg.includes('coupon') ||
    msg.includes('offer') ||
    msg.includes('discount') ||
    msg.includes('promo') ||
    msg.includes('code') ||
    msg.includes('deal') ||
    msg.includes('sale')
  ) {
    try {
      const coupons = await getActiveCoupons(db);
      knowledgeParts.push(coupons);
    } catch {
      // Silently skip if DB query fails
    }
  }

  // Include product search if the user seems to be asking about products
  if (
    msg.includes('ring') ||
    msg.includes('necklace') ||
    msg.includes('bracelet') ||
    msg.includes('earring') ||
    msg.includes('pendant') ||
    msg.includes('chain') ||
    msg.includes('anklet') ||
    msg.includes('bangle') ||
    msg.includes('product') ||
    msg.includes('piece') ||
    msg.includes('collection') ||
    msg.includes('price') ||
    msg.includes('cost') ||
    msg.includes('how much') ||
    msg.includes('available') ||
    msg.includes('stock') ||
    msg.includes('buy') ||
    msg.includes('recommend') ||
    msg.includes('show me') ||
    msg.includes('suggest')
  ) {
    try {
      // Extract a search term from the message
      const searchTerms = [
        'ring',
        'rings',
        'necklace',
        'necklaces',
        'bracelet',
        'bracelets',
        'earring',
        'earrings',
        'pendant',
        'pendants',
        'chain',
        'chains',
        'anklet',
        'anklets',
        'bangle',
        'bangles',
      ];
      const matchedTerm = searchTerms.find((t) => msg.includes(t));

      if (matchedTerm) {
        const products = await searchProducts(matchedTerm, db);
        knowledgeParts.push(products);
      } else {
        const products = await getFeaturedProducts(db);
        knowledgeParts.push(products);
      }

      const categories = await getCategories(db);
      knowledgeParts.push(categories);
    } catch {
      // Silently skip if DB query fails
    }
  }

  // Include relevant FAQs
  const relevantFaqs = bk.faq.filter((f) => {
    const faqKeywords = f.q.toLowerCase().split(' ');
    return faqKeywords.some((kw) => kw.length > 3 && msg.includes(kw));
  });

  if (relevantFaqs.length > 0) {
    knowledgeParts.push(
      `RELEVANT FAQs:\n${relevantFaqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}`
    );
  }

  return knowledgeParts.join('\n\n');
}
