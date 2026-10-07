import { getServiceClient } from '@/lib/supabase/service';
import { createAndSendNotification } from '@/lib/notifications/service';

function getNowIST(): {
  dateStr: string;
  timeStr: string;
  dayOfWeek: string;
  dayOfMonth: number;
} {
  const now = new Date();
  // Format in Asia/Kolkata timezone
  const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = istFormatter.formatToParts(now);
  const findPart = (t: string) => parts.find((p) => p.type === t)?.value || '';

  const year = findPart('year');
  const month = findPart('month');
  const day = findPart('day');
  const hour = findPart('hour');
  const minute = findPart('minute');
  const second = findPart('second');
  const weekday = findPart('weekday').toLowerCase();

  return {
    dateStr: `${year}-${month}-${day}`,
    timeStr: `${hour}:${minute}:${second}`,
    dayOfWeek: weekday,
    dayOfMonth: parseInt(day, 10),
  };
}

function generateTaskIdText(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = Array.from({ length: 3 }, () =>
    letters.charAt(Math.floor(Math.random() * letters.length))
  ).join('');
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TSK-${prefix}-${num}`;
}

export async function runTaskScheduler() {
  return await runSchedulerCore();
}

async function runSchedulerCore() {
  const supabase = getServiceClient();
  const ist = getNowIST();
  const results = {
    tasksGenerated: 0,
    remindersSent: 0,
    errors: [] as string[],
  };

  // =========================================================================
  // 1. Process Scheduled Recurrences (Daily, Weekly, Monthly)
  // =========================================================================
  try {
    const { data: recurrences, error: recError } = await supabase
      .from('task_recurrences')
      .select(
        `
        *,
        task:tasks!task_recurrences_task_id_fkey(
          id,
          task_id_text,
          title,
          description,
          created_by,
          assignee_id,
          department_id,
          priority_id,
          type_id,
          expected_duration,
          related_order_id,
          related_product_id,
          related_ticket_id,
          tags,
          checklists:task_checklists(title, sort_order)
        )
      `
      )
      .eq('is_active', true);

    if (recError) {
      console.error('[task-scheduler] Error fetching recurrences:', recError);
      results.errors.push(`Recurrences error: ${recError.message}`);
    } else if (recurrences && recurrences.length > 0) {
      for (const rec of recurrences) {
        const baseTask = rec.task as any;
        if (!baseTask) continue;

        // Check if pattern matches today
        let shouldTriggerToday = false;
        const pattern = (rec.recurrence_pattern || '').toLowerCase();

        if (pattern === 'daily') {
          shouldTriggerToday = true;
        } else if (pattern === 'weekly') {
          const days = (rec.recurrence_days || []).map((d: string) =>
            d.toLowerCase()
          );
          if (days.includes(ist.dayOfWeek)) {
            shouldTriggerToday = true;
          }
        } else if (pattern === 'monthly') {
          if (rec.day_of_month === ist.dayOfMonth) {
            shouldTriggerToday = true;
          }
        }

        if (!shouldTriggerToday) continue;

        // Check if trigger time has arrived (default to 09:00:00)
        const triggerTime = rec.trigger_time || '09:00:00';
        if (ist.timeStr < triggerTime) {
          // Hasn't reached time of day yet
          continue;
        }

        // Check if already created for today
        if (rec.last_run_at) {
          const lastRunDate = new Date(rec.last_run_at).toLocaleDateString(
            'en-IN',
            {
              timeZone: 'Asia/Kolkata',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }
          );
          const todayFormatted = new Date().toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });
          if (lastRunDate === todayFormatted) {
            // Already triggered today
            continue;
          }
        }

        // Resolve status for Open
        const { data: openStatus } = await supabase
          .from('task_statuses')
          .select('id')
          .eq('name', 'Open')
          .maybeSingle();

        // Resolve assignee: if empty but department set, assign to manager
        let assigneeId = baseTask.assignee_id;
        if (!assigneeId && baseTask.department_id) {
          const { data: mgr } = await supabase
            .from('users')
            .select('id')
            .eq('department_id', baseTask.department_id)
            .eq('role', 'manager')
            .eq('account_status', 'active')
            .limit(1)
            .maybeSingle();
          if (mgr) assigneeId = mgr.id;
        }

        // Create the task instance for today
        const newTaskPayload: Record<string, unknown> = {
          task_id_text: generateTaskIdText(),
          title: baseTask.title,
          description: baseTask.description,
          created_by: baseTask.created_by,
          assignee_id: assigneeId,
          department_id: baseTask.department_id,
          priority_id: baseTask.priority_id,
          type_id: baseTask.type_id,
          status_id: openStatus?.id || baseTask.status_id,
          due_date: ist.dateStr,
          due_time: rec.due_time || '21:00:00',
          expected_duration: baseTask.expected_duration,
          related_order_id: baseTask.related_order_id,
          related_product_id: baseTask.related_product_id,
          related_ticket_id: baseTask.related_ticket_id,
          tags: baseTask.tags || [],
          is_recurring: false,
          is_auto_scheduled: true,
          schedule_type: pattern,
          parent_task_id: baseTask.id,
        };

        const { data: createdTask, error: createErr } = await supabase
          .from('tasks')
          .insert(newTaskPayload)
          .select('id, task_id_text, title')
          .single();

        if (createErr) {
          console.error(
            '[task-scheduler] Error creating task instance:',
            createErr
          );
          results.errors.push(`Task creation error: ${createErr.message}`);
          continue;
        }

        // Copy checklists if any
        if (baseTask.checklists && baseTask.checklists.length > 0) {
          const checklistsToInsert = baseTask.checklists.map(
            (c: any, idx: number) => ({
              task_id: createdTask.id,
              title: c.title,
              sort_order: c.sort_order ?? idx,
              completed: false,
            })
          );
          await supabase.from('task_checklists').insert(checklistsToInsert);
        }

        // Record activity
        await supabase.from('task_activity').insert({
          task_id: createdTask.id,
          action: 'auto_scheduled_generation',
          metadata: {
            recurrence_pattern: pattern,
            parent_task_id: baseTask.id,
            generated_at: new Date().toISOString(),
          },
        });

        // Update last_run_at on recurrence
        await supabase
          .from('task_recurrences')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', rec.id);

        results.tasksGenerated++;

        // Send notification to assigned staff
        if (assigneeId) {
          await createAndSendNotification({
            userId: assigneeId,
            title: `📋 Scheduled Task: ${baseTask.title}`,
            message: `Your scheduled task "${baseTask.title}" has been assigned for today. Due by ${rec.due_time || '9:00 PM'}.`,
            category: 'TASK',
            type: 'system',
            link: `/admin/task-manager/${createdTask.id}`,
            referenceType: 'task',
            referenceId: createdTask.id,
            idempotencyKey: `sched-${createdTask.id}-${ist.dateStr}`,
          }).catch((err) =>
            console.error('[task-scheduler] Notification error:', err)
          );
        }
      }
    }
  } catch (err: any) {
    console.error('[task-scheduler] Recurrences execution error:', err);
    results.errors.push(err.message || 'Recurrence loop error');
  }

  // =========================================================================
  // 2. Process Overdue & Deadline Reminders
  // =========================================================================
  try {
    // Fetch incomplete tasks where due date is today or past, and reminder not sent today
    const { data: pendingTasks, error: pendingErr } = await supabase
      .from('tasks')
      .select(
        `
        id,
        task_id_text,
        title,
        assignee_id,
        department_id,
        due_date,
        due_time,
        status:task_statuses(name)
      `
      )
      .is('deleted_at', null)
      .is('reminder_sent_at', null)
      .lte('due_date', ist.dateStr);

    if (pendingErr) {
      console.error('[task-scheduler] Pending tasks error:', pendingErr);
      results.errors.push(`Pending tasks error: ${pendingErr.message}`);
    } else if (pendingTasks && pendingTasks.length > 0) {
      for (const t of pendingTasks) {
        const statusName = (t.status as any)?.name;
        if (statusName === 'Completed' || statusName === 'Closed') {
          continue;
        }

        // If due date is today, check if due_time is reached
        if (t.due_date === ist.dateStr && t.due_time) {
          if (ist.timeStr < t.due_time) {
            // Not due yet
            continue;
          }
        }

        let targetUserId = t.assignee_id;
        if (!targetUserId && t.department_id) {
          const { data: mgr } = await supabase
            .from('users')
            .select('id')
            .eq('department_id', t.department_id)
            .eq('role', 'manager')
            .eq('account_status', 'active')
            .limit(1)
            .maybeSingle();
          if (mgr) targetUserId = mgr.id;
        }

        if (targetUserId) {
          await createAndSendNotification({
            userId: targetUserId,
            title: `⚠️ Task Reminder: ${t.title}`,
            message: `Task "${t.title}" (${t.task_id_text || 'Task'}) is overdue or pending completion. Please complete and mark it done!`,
            category: 'TASK',
            type: 'system',
            link: `/admin/task-manager/${t.id}`,
            referenceType: 'task',
            referenceId: t.id,
            idempotencyKey: `remind-${t.id}-${ist.dateStr}`,
          }).catch((err) =>
            console.error('[task-scheduler] Reminder notification error:', err)
          );

          // Mark reminder_sent_at on task
          await supabase
            .from('tasks')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', t.id);

          await supabase.from('task_activity').insert({
            task_id: t.id,
            action: 'reminder_sent',
            metadata: {
              target_user_id: targetUserId,
              sent_at: new Date().toISOString(),
            },
          });

          results.remindersSent++;
        }
      }
    }
  } catch (err: any) {
    console.error('[task-scheduler] Reminder execution error:', err);
    results.errors.push(err.message || 'Reminder loop error');
  }

  return results;
}
