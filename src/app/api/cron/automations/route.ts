import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import {
  sendAbandonedCartEmail,
  sendWinBackEmail,
  sendCelebrationEmail,
} from '@/lib/brevo';
import { runTaskScheduler } from '@/lib/cron/task-scheduler';
import { runBlogPublisher } from '@/lib/cron/blog-publisher';
import { runProactiveCronScan } from '@/lib/ai/co-founder/proactive';
import { generateDailyMorningBriefing } from '@/lib/ai/co-founder/morning-briefing';
import {
  startAutomationRun,
  finishAutomationRun,
  claimMarketingDispatch,
  completeMarketingDispatch,
} from '@/lib/cron/automation-ledger';

export async function GET(request: Request) {
  try {
    // Vercel Cron secures the route via Authorization header matching CRON_SECRET (fail-closed)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // We need service role to query all users and bypass RLS
    const supabase = getServiceClient();

    // Start durable ledger run record
    const { runId, startedAt } = await startAutomationRun(
      supabase,
      'daily_automations'
    );
    const runErrors: any[] = [];

    const results = {
      runId,
      abandonedCarts: 0,
      winBacks: 0,
      birthdays: 0,
      anniversaries: 0,
    };

    // 1. Abandoned Carts
    // Find carts that were updated more than 24 hours ago, have items, but haven't triggered a reminder recently
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const todayDailyPeriod = new Date().toISOString().split('T')[0];

    try {
      const { data: abandonedUsers, error: abandonedError } = await supabase
        .from('users')
        .select('id, email, full_name, carts!inner(updated_at)')
        .lt('carts.updated_at', yesterday)
        .is('email', 'not.null')
        .not('email', 'eq', '')
        .or(
          `last_cart_reminder_sent.is.null,last_cart_reminder_sent.lt.${yesterday}`
        )
        .limit(50); // Bounded batch limit

      if (abandonedError) {
        runErrors.push({
          step: 'abandoned_carts_query',
          error: abandonedError.message,
        });
      } else if (abandonedUsers && abandonedUsers.length > 0) {
        for (const user of abandonedUsers) {
          // Check campaign dispatch idempotency
          const { claimed, dispatchId } = await claimMarketingDispatch(
            supabase,
            {
              userId: user.id,
              campaignType: 'abandoned_cart',
              campaignPeriod: todayDailyPeriod,
            }
          );

          if (!claimed) continue; // Already dispatched for today, skip duplicate

          try {
            await sendAbandonedCartEmail(
              user.email,
              user.full_name || 'Valued Customer'
            );
            await supabase
              .from('users')
              .update({ last_cart_reminder_sent: new Date().toISOString() })
              .eq('id', user.id);
            await completeMarketingDispatch(supabase, dispatchId, true);
            results.abandonedCarts++;
          } catch (sendErr: any) {
            await completeMarketingDispatch(
              supabase,
              dispatchId,
              false,
              sendErr?.message
            );
            runErrors.push({
              user: user.id,
              step: 'abandoned_cart_send',
              error: sendErr?.message,
            });
          }
        }
      }
    } catch (cartErr: any) {
      runErrors.push({
        step: 'abandoned_carts_general',
        error: cartErr?.message,
      });
    }

    // 2. Win-Back Campaigns
    // Find users whose last order was > 60 days ago
    const sixtyDaysAgo = new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000
    ).toISOString();
    const winbackMonthPeriod = new Date().toISOString().slice(0, 7); // e.g. '2026-10'

    try {
      const { data: winBackUsers, error: winBackError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .is('email', 'not.null')
        .or(`last_winback_sent.is.null,last_winback_sent.lt.${sixtyDaysAgo}`)
        .limit(50); // Bounded batch limit

      if (winBackError) {
        runErrors.push({ step: 'winback_query', error: winBackError.message });
      } else if (winBackUsers) {
        for (const user of winBackUsers) {
          const { data: latestOrder } = await supabase
            .from('orders')
            .select('created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (
            latestOrder &&
            new Date(latestOrder.created_at) < new Date(sixtyDaysAgo)
          ) {
            const { claimed, dispatchId } = await claimMarketingDispatch(
              supabase,
              {
                userId: user.id,
                campaignType: 'winback',
                campaignPeriod: winbackMonthPeriod,
              }
            );

            if (!claimed) continue;

            try {
              await sendWinBackEmail(
                user.email,
                user.full_name || 'Valued Customer',
                'MISSYOU20'
              );
              await supabase
                .from('users')
                .update({ last_winback_sent: new Date().toISOString() })
                .eq('id', user.id);
              await completeMarketingDispatch(supabase, dispatchId, true);
              results.winBacks++;
            } catch (wbSendErr: any) {
              await completeMarketingDispatch(
                supabase,
                dispatchId,
                false,
                wbSendErr?.message
              );
              runErrors.push({
                user: user.id,
                step: 'winback_send',
                error: wbSendErr?.message,
              });
            }
          }
        }
      }
    } catch (wbErr: any) {
      runErrors.push({ step: 'winback_general', error: wbErr?.message });
    }

    // 3. Birthdays and Anniversaries
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const yearPeriod = currentYear.toString();

    try {
      const { data: usersToCelebrate, error: celebrateError } = await supabase
        .from('users')
        .select(
          'id, email, full_name, dob, anniversary_date, last_birthday_sent, last_anniversary_sent'
        )
        .is('email', 'not.null')
        .limit(100); // Bounded batch limit

      if (celebrateError) {
        runErrors.push({
          step: 'celebration_query',
          error: celebrateError.message,
        });
      } else if (usersToCelebrate) {
        for (const user of usersToCelebrate) {
          if (user.dob) {
            const dobDate = new Date(user.dob);
            const hasNotBeenSentThisYear =
              !user.last_birthday_sent ||
              new Date(user.last_birthday_sent).getFullYear() < currentYear;

            if (
              dobDate.getMonth() + 1 === currentMonth &&
              dobDate.getDate() === currentDay &&
              hasNotBeenSentThisYear
            ) {
              const { claimed, dispatchId } = await claimMarketingDispatch(
                supabase,
                {
                  userId: user.id,
                  campaignType: 'birthday',
                  campaignPeriod: yearPeriod,
                }
              );

              if (claimed) {
                try {
                  await sendCelebrationEmail(
                    user.email,
                    user.full_name || 'Valued Customer',
                    'birthday',
                    'BDAY30'
                  );
                  await supabase
                    .from('users')
                    .update({ last_birthday_sent: new Date().toISOString() })
                    .eq('id', user.id);
                  await completeMarketingDispatch(supabase, dispatchId, true);
                  results.birthdays++;
                } catch (bdayErr: any) {
                  await completeMarketingDispatch(
                    supabase,
                    dispatchId,
                    false,
                    bdayErr?.message
                  );
                  runErrors.push({
                    user: user.id,
                    step: 'birthday_send',
                    error: bdayErr?.message,
                  });
                }
              }
            }
          }

          if (user.anniversary_date) {
            const annDate = new Date(user.anniversary_date);
            const hasNotBeenSentThisYear =
              !user.last_anniversary_sent ||
              new Date(user.last_anniversary_sent).getFullYear() < currentYear;

            if (
              annDate.getMonth() + 1 === currentMonth &&
              annDate.getDate() === currentDay &&
              hasNotBeenSentThisYear
            ) {
              const { claimed, dispatchId } = await claimMarketingDispatch(
                supabase,
                {
                  userId: user.id,
                  campaignType: 'anniversary',
                  campaignPeriod: yearPeriod,
                }
              );

              if (claimed) {
                try {
                  await sendCelebrationEmail(
                    user.email,
                    user.full_name || 'Valued Customer',
                    'anniversary',
                    'ANNIV30'
                  );
                  await supabase
                    .from('users')
                    .update({ last_anniversary_sent: new Date().toISOString() })
                    .eq('id', user.id);
                  await completeMarketingDispatch(supabase, dispatchId, true);
                  results.anniversaries++;
                } catch (annivErr: any) {
                  await completeMarketingDispatch(
                    supabase,
                    dispatchId,
                    false,
                    annivErr?.message
                  );
                  runErrors.push({
                    user: user.id,
                    step: 'anniversary_send',
                    error: annivErr?.message,
                  });
                }
              }
            }
          }
        }
      }
    } catch (celErr: any) {
      runErrors.push({ step: 'celebration_general', error: celErr?.message });
    }

    // 4. Scheduled Task Recurrences & Overdue Reminders
    try {
      const taskResults = await runTaskScheduler();
      (results as any).taskAutomation = taskResults;
    } catch (taskErr: any) {
      console.error('[cron/automations] Task scheduler error:', taskErr);
      (results as any).taskAutomationError = taskErr?.message;
      runErrors.push({ step: 'task_scheduler', error: taskErr?.message });
    }

    // 5. Blog Publishing Automation
    try {
      const blogResults = await runBlogPublisher();
      (results as any).blogPublisher = blogResults;
    } catch (blogErr: any) {
      console.error('[cron/automations] Blog publisher error:', blogErr);
      (results as any).blogPublisherError = blogErr?.message;
      runErrors.push({ step: 'blog_publisher', error: blogErr?.message });
    }

    // 6. Proactive AI Co-Founder Telemetry, Anomaly Scan & Scheduled Intelligence Analysis
    try {
      const proactiveResults = await runProactiveCronScan();
      (results as any).proactiveScan = proactiveResults;

      // Unify with Track E Shared Intelligence Scheduled Analysis (P2.6)
      const { getScheduledAnalysisController } =
        await import('@/lib/intelligence/scheduled-proactive-analysis');
      const controller = getScheduledAnalysisController();
      const scheduledRun = await controller.executeAnalysis({
        trigger: 'cron',
        actorId: 'system_cron_automations',
        callerRole: 'admin',
        preset: 'last_7_days',
      });
      (results as any).scheduledAnalysis = {
        runId: scheduledRun.runId,
        status: scheduledRun.status,
        recommendationsCount: scheduledRun.recommendationsCount,
      };
    } catch (proactiveErr: any) {
      console.error('[cron/automations] Proactive scan error:', proactiveErr);
      (results as any).proactiveScanError = proactiveErr?.message;
      runErrors.push({ step: 'proactive_scan', error: proactiveErr?.message });
    }

    // 7. Daily 9:00 AM Executive Morning Briefing
    try {
      const briefingResult = await generateDailyMorningBriefing();
      (results as any).morningBriefing = briefingResult;
    } catch (briefingErr: any) {
      console.error('[cron/automations] Morning briefing error:', briefingErr);
      (results as any).morningBriefingError = briefingErr?.message;
      runErrors.push({ step: 'morning_briefing', error: briefingErr?.message });
    }

    // Complete durable ledger run record
    const { status: runStatus, durationMs } = await finishAutomationRun(
      supabase,
      {
        runId,
        startedAt,
        stepCounts: {
          abandonedCarts: results.abandonedCarts,
          winBacks: results.winBacks,
          birthdays: results.birthdays,
          anniversaries: results.anniversaries,
        },
        errors: runErrors,
      }
    );

    (results as any).status = runStatus;
    (results as any).durationMs = durationMs;

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
