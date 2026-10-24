import { getServiceClient } from '@/lib/supabase/service';
import { getStoreAnalytics } from '@/lib/ai/co-founder/analytics';
import { getActiveProactiveSignals } from '@/lib/ai/co-founder/proactive';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveEffectiveApiKey } from '@/lib/ai/keys';

/**
 * 9:00 AM IST Daily Morning Executive Briefing Logic
 *
 * Runs daily at 03:30 UTC (9:00 AM IST) via Vercel Cron or VM scheduler.
 * Aggregates 24-hour revenue, orders, low inventory, delayed shipments,
 * and generates a high-craft dual-language (Bengali + English) executive
 * briefing, permanently registered in `co_founder_signals`.
 */
export async function generateDailyMorningBriefing() {
  try {
    const supabase = getServiceClient();
    const now = new Date();
    const past24hIso = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    // 1. Gather 24-Hour Business Metrics
    const [
      analyticsReport,
      recentOrdersRes,
      lowStockRes,
      unfulfilledOrdersRes,
      activeVipRes,
      proactiveSignals,
    ] = await Promise.all([
      getStoreAnalytics({ timeframe: '30d' }).catch(() => null),
      supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .gte('created_at', past24hIso),
      supabase
        .from('products')
        .select('id, name, sku, stock_quantity')
        .lte('stock_quantity', 5)
        .eq('status', 'active')
        .limit(5),
      supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .in('status', ['placed', 'confirmed'])
        .lte('created_at', past24hIso)
        .limit(5),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_vip', true),
      getActiveProactiveSignals(3).catch(() => []),
    ]);

    const past24hOrders = recentOrdersRes.data || [];
    const past24hRevenue = past24hOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );
    const past24hCount = past24hOrders.length;
    const aov =
      past24hCount > 0 ? Math.round(past24hRevenue / past24hCount) : 0;
    const lowStockCount = lowStockRes.data?.length || 0;
    const unfulfilledCount = unfulfilledOrdersRes.data?.length || 0;
    const activeVipCount = activeVipRes.count || 0;

    // 2. Synthesize with Gemini into natural Spoken Bengali & English
    let spokenBengaliBriefing = `নমস্কার ফাউন্ডার! গত ২৪ ঘণ্টায় আমাদের ${past24hCount}টি অর্ডার এসেছে, মোট সেলস ₹${past24hRevenue.toLocaleString('en-IN')} এবং গড় অর্ডার মান ₹${aov}।`;
    if (lowStockCount > 0) {
      spokenBengaliBriefing += ` স্টকে ${lowStockCount}টি গয়না কমে এসেছে।`;
    }
    if (unfulfilledCount > 0) {
      spokenBengaliBriefing += ` ${unfulfilledCount}টি অর্ডার শিপমেন্টের অপেক্ষায় আছে।`;
    }
    spokenBengaliBriefing += ' আজকের দিনটি আপনার ও রুহভির জন্য শুভ হোক!';

    const geminiKey =
      process.env.GEMINI_LIVE_API_KEY ||
      resolveEffectiveApiKey('gemini').apiKey ||
      process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
        const prompt = `
You are the AI Co-Founder of Ruhvi Fine Jewellery (ruhvi.in).
Generate a crisp, high-craft 9:00 AM Morning Executive Briefing for the Founder.

STORE DATA PAST 24 HOURS:
- Orders Placed: ${past24hCount}
- Revenue Generated: ₹${past24hRevenue}
- Average Order Value (AOV): ₹${aov}
- Low Stock Items (<5 left): ${lowStockCount} (${lowStockRes.data?.map((p) => p.name).join(', ') || 'None'})
- Delayed / Unfulfilled Orders (>24h): ${unfulfilledCount}
- Active Ruhvi Privé VIP Members: ${activeVipCount}

RULES:
1. Produce a natural, spoken colloquial Bengali brief (2-3 short sentences, warm, professional).
2. Avoid archaic words like "এবং" (use "আর").
3. Give clear, motivating executive advice for today.
Return ONLY valid JSON:
{
  "bengaliVoiceBrief": "spoken brief in natural Bengali",
  "englishVoiceBrief": "spoken brief in English",
  "actionPriorities": ["priority 1", "priority 2"]
}
`;
        const aiRes = await model.generateContent(prompt);
        const rawText = aiRes.response.text();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.bengaliVoiceBrief) {
            spokenBengaliBriefing = parsed.bengaliVoiceBrief;
          }
        }
      } catch (aiErr) {
        console.warn('[Morning Briefing] AI synthesis fallback:', aiErr);
      }
    }

    // 3. Register as a persistent proactive signal in database
    const dateBucket = now.toISOString().slice(0, 10);
    const fingerprint = `morning_briefing:${dateBucket}`;

    const detailMarkdown = `
### ☀️ 9:00 AM Executive Briefing (${dateBucket})

- **24h Revenue:** ₹${past24hRevenue.toLocaleString('en-IN')} (${past24hCount} orders, AOV ₹${aov})
- **Active VIP Privé Members:** ${activeVipCount}
- **Low Stock Alerts:** ${lowStockCount} items need attention
- **Orders Pending Fulfillment (>24h):** ${unfulfilledCount} orders
- **Critical Signals:** ${proactiveSignals.length} active alerts in system

*Generated automatically by Ruhvi AI Co-Founder Autonomous Cron.*
`.trim();

    const { data: savedSignal, error: saveErr } = await supabase
      .from('co_founder_signals')
      .upsert(
        {
          fingerprint,
          signal_type: 'daily_morning_briefing',
          category: 'BUSINESS',
          severity:
            lowStockCount > 3 || unfulfilledCount > 3 ? 'high' : 'medium',
          confidence: 'confirmed',
          title: `Daily Executive Briefing: ${dateBucket}`,
          summary: spokenBengaliBriefing,
          detail: detailMarkdown,
          metrics: {
            revenue: past24hRevenue,
            orders: past24hCount,
            aov,
            lowStockCount,
            unfulfilledCount,
            activeVipCount,
          },
          recommended_action:
            lowStockCount > 0
              ? 'Review restock recommendations for low stock pieces.'
              : 'Maintain growth campaigns and review morning dispatch schedule.',
          requires_approval: false,
          is_acknowledged: false,
          created_at: now.toISOString(),
        },
        { onConflict: 'fingerprint' }
      )
      .select('id')
      .single();

    return {
      success: true,
      timestamp: now.toISOString(),
      signalId: savedSignal?.id,
      spokenBengaliBriefing,
      metrics: {
        revenue: past24hRevenue,
        orders: past24hCount,
        aov,
        lowStockCount,
        unfulfilledCount,
        activeVipCount,
      },
    };
  } catch (err: any) {
    console.error('Fatal error in Morning Briefing cron:', err);
    throw err;
  }
}
