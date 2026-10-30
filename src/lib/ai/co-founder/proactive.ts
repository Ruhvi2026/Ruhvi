import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { getStoreAnalytics } from './analytics';
import { getRelevantMemories } from './memory';
import type { CompetitorRecord } from './competitors';

export type SignalCategory =
  'BUSINESS' | 'RISK' | 'OPPORTUNITY' | 'FOLLOW_UP' | 'SYSTEM';
export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SignalConfidence =
  'confirmed' | 'strong' | 'possible' | 'insufficient_evidence';

export interface ProactiveSignal {
  id?: string;
  fingerprint: string;
  signalType: string;
  category: SignalCategory;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  title: string;
  summary: string; // Voice brevity: 1-2 spoken sentences
  detail: string; // Structured text breakdown
  metrics?: Record<string, any>;
  recommendedAction?: string;
  requiresApproval: boolean;
  isAcknowledged?: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  createdAt?: string;
}

export interface ProactiveScanResult {
  generatedCount: number;
  suppressedCount: number;
  activeSignals: ProactiveSignal[];
  voiceGreeting?: string;
}

/**
 * Generate a deterministic fingerprint to enforce deduplication and idempotency.
 */
export function createSignalFingerprint(
  signalType: string,
  entityId: string,
  dateBucket: string
): string {
  return `${signalType}:${entityId}:${dateBucket}`;
}

/**
 * Detect competitor discounting pressure, price undercut, or promotional movements.
 * Calibrates confidence based on evidence recency and avoids unverified definitive claims.
 */
export async function detectCompetitorPriceSignals(
  dateBucket: string,
  competitorsOverride?: CompetitorRecord[]
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];
  try {
    const competitors: CompetitorRecord[] =
      competitorsOverride ||
      (await (async () => {
        const { getCompetitors } = await import('./competitors');
        return getCompetitors();
      })());

    for (const comp of competitors) {
      const insights = comp.latest_insights;
      const promotions = insights?.promotions || '';
      const notes = comp.notes || '';
      const combinedText = `${promotions} ${notes}`.toLowerCase();

      // Check if promotional mentions are negated (e.g. "no promotions", "without discount")
      const isNegated =
        /\b(?:no|not|neither|without|zero)\s+(?:\w+\s+){0,3}(?:sale|discount|off|promo|promotions?|deal)\b/i.test(
          combinedText
        );

      // Look for aggressive discount patterns (e.g. 20% off, clearance, price drop, flash sale)
      const hasDiscountMention =
        !isNegated &&
        /\b(?:sale|discount|off|drop|clearance|promos?|promotions?|deals?|underpriced|slashed?)\b/i.test(
          combinedText
        );
      const discountMatch = combinedText.match(/(\d+)%\s*(?:off|discount)/i);
      const discountPercent = discountMatch
        ? parseInt(discountMatch[1], 10)
        : null;

      if (hasDiscountMention || (discountPercent && discountPercent >= 15)) {
        // Evidence-based confidence calibration:
        // Stored intelligence notes/insights indicate promotional patterns, but do not prove live price undercut.
        let confidence: SignalConfidence = 'possible';
        if (comp.last_analyzed_at) {
          const analyzedDate = new Date(comp.last_analyzed_at).getTime();
          const daysSinceAnalysis =
            (Date.now() - analyzedDate) / (1000 * 60 * 60 * 24);
          if (
            daysSinceAnalysis <= 7 &&
            discountPercent &&
            discountPercent >= 20
          ) {
            confidence = 'strong';
          } else if (daysSinceAnalysis > 30) {
            confidence = 'insufficient_evidence';
          }
        } else if (!promotions && !notes) {
          confidence = 'insufficient_evidence';
        }

        signals.push({
          fingerprint: createSignalFingerprint(
            'competitor_discount_alert',
            comp.id,
            dateBucket
          ),
          signalType: 'competitor_discount_alert',
          category: 'RISK',
          severity:
            discountPercent && discountPercent >= 25 ? 'high' : 'medium',
          confidence,
          title: `Potential Competitor Promotion: ${comp.name}`,
          summary: `Stored competitor intelligence for ${comp.name} indicates potential promotional discount activity${discountPercent ? ` (~${discountPercent}% off)` : ''} in the ${comp.category || 'jewelry'} category.`,
          detail: `Competitor record (ID: ${comp.id}, table: co_founder_competitors, last_analyzed: ${comp.last_analyzed_at || 'manual notes'}) indicates promotional mentions: "${promotions || notes}". Confidence is calibrated to "${confidence}" pending live site price verification. Counter-strategy: ${insights?.strategicCounterMove || 'Review category margins and feature handcrafted artisan differentiators.'}`,
          metrics: {
            competitorId: comp.id,
            competitorName: comp.name,
            discountPercent: discountPercent ?? undefined,
            category: comp.category,
            sourceTable: 'co_founder_competitors',
            lastAnalyzedAt: comp.last_analyzed_at || null,
            evidenceType: comp.last_analyzed_at
              ? 'competitor_intel_scan'
              : 'stored_notes',
            evidenceSummary: `Detected keywords in ${promotions ? 'latest_insights.promotions' : 'notes'}`,
            evaluatedAt: new Date().toISOString(),
          },
          recommendedAction:
            insights?.strategicCounterMove ||
            `Launch targeted WhatsApp/email campaign highlighting artisan heritage and purity for matching ${comp.category || 'catalog'} pieces.`,
          requiresApproval: true,
        });
      }
    }
  } catch (err: any) {
    console.warn(
      '[Proactive] Error detecting competitor price signals:',
      err?.message
    );
  }
  return signals;
}

/**
 * Detect checkout abandonment and cart dropoff surges with evidence calibration.
 * Groups by distinct cart sessions and excludes users who placed a completed order in the evaluation window.
 */
export async function detectCheckoutAbandonmentSignals(
  dateBucket: string,
  supabaseClient?: any,
  nowDate: Date = new Date()
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];
  try {
    const supabase = supabaseClient || getServiceClient();
    const twentyFourHoursAgo = new Date(
      nowDate.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    // Query pending cart items created or updated within the last 24h
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(
        'id, cart_id, quantity, created_at, product:products(name, price), carts(user_id, updated_at)'
      )
      .gte('created_at', twentyFourHoursAgo)
      .limit(100);

    if (!error && cartItems && cartItems.length > 0) {
      // Group items by unique cart session
      const cartMap = new Map<string, { userId?: string; items: any[] }>();
      for (const item of cartItems) {
        const cartId = item.cart_id || item.id;
        const userId = item.carts?.user_id;
        if (!cartMap.has(cartId)) {
          cartMap.set(cartId, { userId, items: [] });
        }
        cartMap.get(cartId)!.items.push(item);
      }

      // Check which users placed an order in the last 24h to filter out converted carts
      const candidateUserIds = Array.from(cartMap.values())
        .map((c) => c.userId)
        .filter((id): id is string => Boolean(id));

      const convertedUserIds = new Set<string>();
      if (candidateUserIds.length > 0) {
        try {
          const { data: recentOrders } = await supabase
            .from('orders')
            .select('user_id')
            .gte('created_at', twentyFourHoursAgo)
            .in('user_id', candidateUserIds);

          if (recentOrders) {
            for (const ord of recentOrders) {
              if (ord.user_id) convertedUserIds.add(ord.user_id);
            }
          }
        } catch {
          // Graceful fallback if orders check fails
        }
      }

      // Filter out carts of users who completed an order
      const unconvertedCarts: Array<{ cartId: string; items: any[] }> = [];
      for (const [cartId, data] of cartMap.entries()) {
        if (!data.userId || !convertedUserIds.has(data.userId)) {
          unconvertedCarts.push({ cartId, items: data.items });
        }
      }

      const distinctCartsCount = unconvertedCarts.length;
      const unconvertedItems = unconvertedCarts.flatMap((c) => c.items);

      if (distinctCartsCount >= 3) {
        const totalUnits = unconvertedItems.reduce(
          (acc: number, item: any) => acc + (Number(item.quantity) || 1),
          0
        );
        const estimatedValue = unconvertedItems.reduce(
          (acc: number, item: any) => {
            const price = Number(item.product?.price) || 0;
            const qty = Number(item.quantity) || 1;
            return acc + price * qty;
          },
          0
        );

        const isHighDropoff =
          distinctCartsCount >= 8 || estimatedValue >= 15000;
        // Evidence-based confidence calibration:
        // Unconverted cart sessions indicate potential drop-off; calibrate to 'possible' or 'strong'
        const confidence: SignalConfidence =
          distinctCartsCount >= 6 && estimatedValue >= 15000
            ? 'strong'
            : 'possible';

        signals.push({
          fingerprint: createSignalFingerprint(
            'checkout_abandonment_spike',
            'cart_funnel_24h',
            dateBucket
          ),
          signalType: 'checkout_abandonment_spike',
          category: 'RISK',
          severity: isHighDropoff ? 'high' : 'medium',
          confidence,
          title: 'Potential Cart Drop-off Spike Detected',
          summary: `Identified ${distinctCartsCount} uncompleted cart session(s) (${totalUnits} items) totaling ~₹${estimatedValue.toLocaleString('en-IN')} pending without orders in the last 24 hours.`,
          detail: `Cart telemetry scanned ${unconvertedItems.length} active cart items across ${distinctCartsCount} distinct user carts with no completed order in the last 24 hours. Estimated unrealized GMV: ₹${estimatedValue.toLocaleString('en-IN')}. Confidence calibrated to "${confidence}" pending checkout-funnel event confirmation.`,
          metrics: {
            abandonedCartsCount: distinctCartsCount,
            totalCartItems: unconvertedItems.length,
            totalUnits,
            estimatedUnrealizedGmv: estimatedValue,
            sourceTable: 'cart_items, carts, orders',
            sampleSize: distinctCartsCount,
            evaluatedAt: nowDate.toISOString(),
            evidenceType: 'unconverted_cart_session_check',
          },
          recommendedAction:
            'Trigger automated WhatsApp & Email cart recovery sequence and test payment gateway latency.',
          requiresApproval: true,
        });
      }
    }
  } catch (err: any) {
    console.warn(
      '[Proactive] Error detecting checkout abandonment signals:',
      err?.message
    );
  }
  return signals;
}

/**
 * Detect SEO score degradation, missing catalog meta descriptions, and ranking risks.
 */
export async function detectSeoDecaySignals(
  dateBucket: string
): Promise<ProactiveSignal[]> {
  const signals: ProactiveSignal[] = [];
  try {
    const { auditCatalogSeoHealth } = await import('./seo-health');
    const seoReport = await auditCatalogSeoHealth();

    if (
      seoReport &&
      seoReport.totalProductsScanned > 0 &&
      (seoReport.healthScore < 80 || seoReport.missingMetaDescriptions > 2)
    ) {
      const isCritical = seoReport.healthScore < 60;

      signals.push({
        fingerprint: createSignalFingerprint(
          'seo_decay_warning',
          'catalog_seo_health',
          dateBucket
        ),
        signalType: 'seo_decay_warning',
        category: 'OPPORTUNITY',
        severity: isCritical ? 'high' : 'medium',
        confidence: 'confirmed',
        title: 'Catalog SEO Health & Meta Description Alert',
        summary: `Catalog SEO health score dropped to ${seoReport.healthScore}%. ${seoReport.missingMetaDescriptions} active products are missing meta descriptions.`,
        detail: `SEO audit scanned ${seoReport.totalProductsScanned} catalog items. Findings: ${seoReport.missingMetaDescriptions} missing meta descriptions, ${seoReport.missingAltText} missing image alt tags, ${seoReport.weakKeywordCount} products with weak keyword density. ${seoReport.executiveVoiceSummary}`,
        metrics: {
          healthScore: seoReport.healthScore,
          productsScanned: seoReport.totalProductsScanned,
          missingMetaDescriptions: seoReport.missingMetaDescriptions,
          missingAltText: seoReport.missingAltText,
          weakKeywordCount: seoReport.weakKeywordCount,
          sourceTable: 'products',
          sampleSize: seoReport.totalProductsScanned,
          evaluatedAt: new Date().toISOString(),
        },
        recommendedAction:
          'Dispatch Worker 3 (SEO Specialist) to generate search-optimized titles and rich meta descriptions targeting high-intent jewelry keywords.',
        requiresApproval: true,
      });
    }
  } catch (err: any) {
    console.warn(
      '[Proactive] Error detecting SEO decay signals:',
      err?.message
    );
  }
  return signals;
}

/**
 * Scan real Ruhvi data, evaluate baselines, and detect high-conviction proactive signals.
 */
export async function scanProactiveSignals(
  options: {
    userId?: string;
    adminName?: string;
    cooldownHours?: number;
  } = {}
): Promise<ProactiveScanResult> {
  const supabase = getServiceClient();
  const cooldownHours = options.cooldownHours ?? 12;
  const now = new Date();
  const dateBucket = now.toISOString().split('T')[0]; // Daily bucket

  const candidateSignals: ProactiveSignal[] = [];

  try {
    // 1. Fetch 7d analytics to evaluate business anomalies and trends
    const analytics7d = await getStoreAnalytics({ timeframe: '7d' });
    const kpis7d = analytics7d.kpis;
    const comparisons7d = analytics7d.comparisons;

    // A. Revenue Anomaly Detection (Drop or Spike)
    if (comparisons7d?.revenue) {
      const revComp = comparisons7d.revenue;
      if (
        revComp.isAnomaly &&
        revComp.percentageChange !== null &&
        revComp.percentageChange <= -25
      ) {
        candidateSignals.push({
          fingerprint: createSignalFingerprint(
            'revenue_drop',
            'store_7d',
            dateBucket
          ),
          signalType: 'revenue_drop',
          category: 'RISK',
          severity: 'critical',
          confidence:
            revComp.anomalyConfidence === 'confirmed' ? 'confirmed' : 'strong',
          title: 'Significant Revenue Decline Detected',
          summary: `Net revenue decreased ${Math.abs(revComp.percentageChange)}% over the last 7 days compared to the prior period, landing at ₹${kpis7d.netRevenue.toLocaleString('en-IN')}.`,
          detail: `Revenue dropped from ₹${revComp.baseline.toLocaleString('en-IN')} to ₹${revComp.current.toLocaleString('en-IN')} (${revComp.percentageChange}% change). Sample size: ${analytics7d.evidence.sampleSizeOrders} orders.`,
          metrics: {
            currentRevenue: revComp.current,
            baselineRevenue: revComp.baseline,
            percentageChange: revComp.percentageChange,
            sourceTable: 'orders',
            sampleSize: analytics7d.evidence.sampleSizeOrders,
            dataFreshness: analytics7d.evidence.dataFreshnessTimestamp,
            evaluatedAt: now.toISOString(),
          },
          recommendedAction:
            'Inspect checkout conversion rates and review recent traffic acquisition channels.',
          requiresApproval: true,
        });
      }
    }

    // B. High Cancellation Rate Spike
    if (kpis7d.totalOrders >= 5 && kpis7d.cancellationRate >= 20) {
      const cancellationConfidence: SignalConfidence =
        kpis7d.totalOrders >= 10 ? 'confirmed' : 'strong';
      candidateSignals.push({
        fingerprint: createSignalFingerprint(
          'high_cancellations',
          'orders_7d',
          dateBucket
        ),
        signalType: 'high_cancellations',
        category: 'RISK',
        severity: 'high',
        confidence: cancellationConfidence,
        title: 'Elevated Order Cancellation Rate',
        summary: `We have experienced a ${kpis7d.cancellationRate}% order cancellation rate across ${kpis7d.totalOrders} orders recently.`,
        detail: `${kpis7d.cancelledOrders} out of ${kpis7d.totalOrders} orders were cancelled in the last 7 days.`,
        metrics: {
          totalOrders: kpis7d.totalOrders,
          cancelledOrders: kpis7d.cancelledOrders,
          cancellationRate: kpis7d.cancellationRate,
          sourceTable: 'orders',
          sampleSize: kpis7d.totalOrders,
          evaluatedAt: now.toISOString(),
        },
        recommendedAction:
          'Review customer cancellation reasons and check payment gateway webhook health.',
        requiresApproval: true,
      });
    }

    // C. Critical Inventory Stock Warning
    if (kpis7d.lowStockItemsCount > 0) {
      candidateSignals.push({
        fingerprint: createSignalFingerprint(
          'low_inventory',
          'catalog',
          dateBucket
        ),
        signalType: 'low_inventory',
        category: 'OPPORTUNITY',
        severity: kpis7d.lowStockItemsCount >= 5 ? 'high' : 'medium',
        confidence: 'confirmed',
        title: 'Low Inventory Alert for Active Catalog Items',
        summary: `There are ${kpis7d.lowStockItemsCount} active products with 5 or fewer units remaining in stock.`,
        detail: `Safety stock thresholds triggered for ${kpis7d.lowStockItemsCount} items. Top seller demand may be constrained if not restocked promptly.`,
        metrics: {
          lowStockCount: kpis7d.lowStockItemsCount,
          sourceTable: 'products',
          sampleSize: kpis7d.lowStockItemsCount,
          evaluatedAt: now.toISOString(),
        },
        recommendedAction:
          'Issue restock request or adjust safety buffers with artisan suppliers.',
        requiresApproval: true,
      });
    }

    // D. Urgent Customer Support Tickets
    if (kpis7d.urgentTicketsCount > 0) {
      candidateSignals.push({
        fingerprint: createSignalFingerprint(
          'urgent_tickets',
          'support_queue',
          dateBucket
        ),
        signalType: 'urgent_tickets',
        category: 'RISK',
        severity: 'high',
        confidence: 'confirmed',
        title: 'Urgent Customer Support Requests Pending',
        summary: `There are ${kpis7d.urgentTicketsCount} urgent or high-priority support tickets awaiting resolution.`,
        detail: `Support escalation queue requires operational review. Open tickets: ${kpis7d.openSupportTicketsCount}, Urgent: ${kpis7d.urgentTicketsCount}.`,
        metrics: {
          urgentTickets: kpis7d.urgentTicketsCount,
          openTickets: kpis7d.openSupportTicketsCount,
          sourceTable: 'support_tickets',
          sampleSize: kpis7d.urgentTicketsCount,
          evaluatedAt: now.toISOString(),
        },
        recommendedAction:
          'Assign available support staff to expedite ticket resolution.',
        requiresApproval: true,
      });
    }

    // E. Strategic Directives & Memory Follow-ups (Stage 3 Integration)
    if (options.userId) {
      const strategicMemories = await getRelevantMemories(
        options.userId,
        'strategic_goal',
        3
      );
      if (strategicMemories.length > 0) {
        const topGoal = strategicMemories[0];
        candidateSignals.push({
          fingerprint: createSignalFingerprint(
            'strategic_followup',
            topGoal.key,
            dateBucket
          ),
          signalType: 'strategic_followup',
          category: 'FOLLOW_UP',
          severity: 'medium',
          confidence: 'strong',
          title: `Strategic Goal Follow-up: ${topGoal.key.replace(/_/g, ' ')}`,
          summary: `Following up on strategic directive: "${topGoal.value.slice(0, 80)}...". Current 7-day revenue is ₹${kpis7d.netRevenue.toLocaleString('en-IN')}.`,
          detail: `Active founder directive recorded: ${topGoal.value}.`,
          recommendedAction:
            'Review campaign progress against targets in next executive check-in.',
          requiresApproval: false,
        });
      }
    }

    // F. Competitor Pricing Pressure & Undercut Detection (Step 7.3)
    const competitorSignals = await detectCompetitorPriceSignals(dateBucket);
    candidateSignals.push(...competitorSignals);

    // G. Checkout Abandonment Spike Detection (Step 7.3)
    const abandonmentSignals =
      await detectCheckoutAbandonmentSignals(dateBucket);
    candidateSignals.push(...abandonmentSignals);

    // H. SEO Keyword Rank Decay & Catalog Indexing Dips (Step 7.3)
    const seoSignals = await detectSeoDecaySignals(dateBucket);
    candidateSignals.push(...seoSignals);
  } catch (err: any) {
    console.error(
      'Error calculating candidate signals in scanProactiveSignals:',
      err
    );
  }

  // 2. Deduplication & Cooldown Filtering against Supabase
  let generatedCount = 0;
  let suppressedCount = 0;
  const activeSignals: ProactiveSignal[] = [];

  const cooldownCutoff = new Date(
    now.getTime() - cooldownHours * 60 * 60 * 1000
  ).toISOString();

  for (const signal of candidateSignals) {
    try {
      // Check existing signal in co_founder_signals
      const { data: existing } = await supabase
        .from('co_founder_signals')
        .select('id, is_acknowledged, created_at')
        .eq('fingerprint', signal.fingerprint)
        .gte('created_at', cooldownCutoff)
        .maybeSingle();

      if (existing) {
        suppressedCount++;
        continue; // Suppress duplicate notification within cooldown window
      }

      // Persist newly detected proactive signal
      const { data: inserted, error: insertError } = await supabase
        .from('co_founder_signals')
        .insert({
          fingerprint: signal.fingerprint,
          signal_type: signal.signalType,
          category: signal.category,
          severity: signal.severity,
          confidence: signal.confidence,
          title: signal.title,
          summary: signal.summary,
          detail: signal.detail,
          metrics: signal.metrics || {},
          recommended_action: signal.recommendedAction,
          requires_approval: signal.requiresApproval,
          is_acknowledged: false,
        })
        .select('id, created_at')
        .single();

      if (!insertError && inserted) {
        signal.id = inserted.id;
        signal.createdAt = inserted.created_at;
      }

      activeSignals.push(signal);
      generatedCount++;
    } catch {
      // Fallback: If DB insertion fails, keep signal in memory for this session
      activeSignals.push(signal);
      generatedCount++;
    }
  }

  // 3. Priority Sorting (Critical > High > Medium > Low)
  const severityRank: Record<SignalSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  activeSignals.sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity]
  );

  // 4. Voice Greeting Builder (For Stage 2 Realtime Audio Session)
  let voiceGreeting: string | undefined;
  if (activeSignals.length > 0) {
    const topSignal = activeSignals[0];
    const founder = options.adminName || 'there';
    voiceGreeting = `Good to speak with you, ${founder}. A quick update: ${topSignal.summary}`;
  }

  return {
    generatedCount,
    suppressedCount,
    activeSignals,
    voiceGreeting,
  };
}

/**
 * Acknowledge a proactive signal so it will not be surfaced repeatedly.
 */
export async function acknowledgeSignal(
  signalId: string,
  userId?: string
): Promise<{ success: boolean }> {
  const supabase = getServiceClient();

  try {
    const { error } = await supabase
      .from('co_founder_signals')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId || null,
      })
      .eq('id', signalId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error acknowledging proactive signal:', err);
    return { success: false };
  }
}

/**
 * Fetch unacknowledged active signals for dashboard display or chat context.
 */
export async function getActiveProactiveSignals(
  limit = 5
): Promise<ProactiveSignal[]> {
  const supabase = getServiceClient();

  try {
    // 1. Auto-reconcile support ticket signals: if all tickets are resolved, auto-acknowledge stale ticket signals
    const { count: openCount } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'pending']);

    if (openCount === 0) {
      await supabase
        .from('co_founder_signals')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('signal_type', 'urgent_tickets')
        .eq('is_acknowledged', false);
    }

    const { data, error } = await supabase
      .from('co_founder_signals')
      .select('*')
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      fingerprint: d.fingerprint,
      signalType: d.signal_type,
      category: d.category,
      severity: d.severity,
      confidence: d.confidence,
      title: d.title,
      summary: d.summary,
      detail: d.detail,
      metrics: d.metrics,
      recommendedAction: d.recommended_action,
      requiresApproval: d.requires_approval,
      isAcknowledged: d.is_acknowledged,
      createdAt: d.created_at,
    }));
  } catch (err: any) {
    console.error('Error fetching active signals:', err);
    return [];
  }
}

export interface ExecutiveAdvisorReport {
  problemOrOpportunity: string;
  evidence: string;
  recommendedSolution: string;
  actionPlan: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  executiveVoiceSummary: string;
}

/**
 * Standardized Proactive Advisor Mode:
 * Proactively generates executive briefings in the strict format:
 * Problem/Opportunity → Evidence → Recommended Solution → Action Plan → Priority
 */
export async function generateExecutiveAdvisorBriefing(): Promise<
  ExecutiveAdvisorReport[]
> {
  const { runBusinessIntelligenceScan } =
    await import('./business-intelligence');
  const { formulateStrategicSolution } = await import('./strategy-engine');
  const { generateActionPlanFromStrategy } = await import('./action-planner');

  const digest = await runBusinessIntelligenceScan('7d');
  const reports: ExecutiveAdvisorReport[] = [];

  // 1. Process Problems with sufficient evidence
  for (const prob of digest.problems) {
    const strategy = formulateStrategicSolution({
      title: prob.title,
      issueType: prob.title,
      additionalContext: prob.detail,
    });
    const plan = generateActionPlanFromStrategy(strategy, {
      problemStatement: prob.summary,
    });

    reports.push({
      problemOrOpportunity: `[PROBLEM] ${prob.title}: ${prob.summary}`,
      evidence: `${prob.detail} Potential Impact: ${prob.potentialImpact}`,
      recommendedSolution: strategy.recommendedSolution,
      actionPlan: `Tasks to create: ${plan.tasks.map((t) => t.title).join('; ')}`,
      priority: prob.severity,
      executiveVoiceSummary: `${prob.summary} I recommend ${strategy.recommendedSolution.slice(0, 120)}...`,
    });
  }

  // 2. Process Operational Risks
  for (const risk of digest.risks) {
    const strategy = formulateStrategicSolution({
      title: risk.title,
      issueType: risk.title,
      additionalContext: risk.detail,
    });
    const plan = generateActionPlanFromStrategy(strategy, {
      problemStatement: risk.summary,
    });

    reports.push({
      problemOrOpportunity: `[RISK] ${risk.title}: ${risk.summary}`,
      evidence: `${risk.detail} Potential Impact: ${risk.potentialImpact}`,
      recommendedSolution: strategy.recommendedSolution,
      actionPlan: `Tasks to create: ${plan.tasks.map((t) => t.title).join('; ')}`,
      priority: risk.severity,
      executiveVoiceSummary: `${risk.summary} Recommended move: ${strategy.recommendedSolution.slice(0, 120)}...`,
    });
  }

  // 3. Process Growth Opportunities
  for (const opp of digest.growthOpportunities) {
    const strategy = formulateStrategicSolution({
      title: opp.title,
      issueType: opp.title,
      additionalContext: opp.detail,
    });
    const plan = generateActionPlanFromStrategy(strategy, {
      problemStatement: opp.summary,
    });

    reports.push({
      problemOrOpportunity: `[OPPORTUNITY] ${opp.title}: ${opp.summary}`,
      evidence: `${opp.detail} Potential Impact: ${opp.potentialImpact}`,
      recommendedSolution: strategy.recommendedSolution,
      actionPlan: `Tasks to create: ${plan.tasks.map((t) => t.title).join('; ')}`,
      priority: opp.severity,
      executiveVoiceSummary: `${opp.summary} We can capture ${strategy.expectedImpact.quantitativeProjection}.`,
    });
  }

  return reports;
}

/**
 * Background Cron Job: AI Co-Founder Proactive Intelligence Engine
 *
 * Scans real business telemetry, detects anomalies, evaluates safety thresholds,
 * deduplicates signals, and dispatches in-app notifications for administrative review.
 */
export async function runProactiveCronScan() {
  const startTime = Date.now();

  // 1. Execute proactive scan
  const scanResult = await scanProactiveSignals();

  // 2. Dispatch high-severity signals to admin notifications table
  const supabase = getServiceClient();
  const highPrioritySignals = scanResult.activeSignals.filter(
    (s) => s.severity === 'critical' || s.severity === 'high'
  );

  if (highPrioritySignals.length > 0) {
    // Fetch admin user IDs
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['super_admin', 'admin', 'manager']);

    if (adminUsers && adminUsers.length > 0) {
      const notificationsToInsert: any[] = [];

      for (const signal of highPrioritySignals) {
        for (const admin of adminUsers) {
          notificationsToInsert.push({
            user_id: admin.id,
            title: `[AI Co-Founder] ${signal.title}`,
            message: signal.summary,
            category: 'UPDATES',
            type: 'system',
            link: '/co-founder',
          });
        }
      }

      if (notificationsToInsert.length > 0) {
        await supabase.from('notifications').insert(notificationsToInsert);
      }

      // 3. Dispatch to RuhChat Official Broadcast Channel (Only for genuine critical/high anomalies)
      try {
        const superAdmin = adminUsers.find((u) => u.id);
        if (superAdmin) {
          for (const signal of highPrioritySignals) {
            await supabase.rpc('send_staff_broadcast', {
              p_sender_id: superAdmin.id,
              p_title: `[AI Co-Founder Alert] ${signal.title}`,
              p_message: `${signal.summary}\n\n👉 Recommended Action: ${signal.recommendedAction || 'Review on Co-Founder Dashboard'}`,
              p_priority: signal.severity === 'critical' ? 'urgent' : 'high',
              p_allow_replies: true,
            });
          }
        }
      } catch (chatErr) {
        console.warn(
          '[Proactive] RuhChat broadcast dispatch fallback:',
          chatErr
        );
      }
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    generatedCount: scanResult.generatedCount,
    suppressedCount: scanResult.suppressedCount,
    activeSignalCount: scanResult.activeSignals.length,
    durationMs,
    signals: scanResult.activeSignals.map((s) => ({
      id: s.id,
      fingerprint: s.fingerprint,
      severity: s.severity,
      title: s.title,
      recommendedAction: s.recommendedAction,
    })),
  };
}
