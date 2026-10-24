import { getServiceClient } from '@/lib/supabase/service';
import type { EntityRefType } from '@/types/chat';

export type DepartmentKey =
  'orders' | 'support' | 'operations' | 'tech' | 'marketing';

export type ProactiveEventType =
  | 'ORDER_DELIVERY_FAILED'
  | 'ORDER_RTO_INITIATED'
  | 'RETURN_REQUESTED'
  | 'OPERATIONS_LOW_STOCK'
  | 'TECH_SENTRY_500'
  | 'TECH_404_SPIKE'
  | 'TECH_HIGH_LATENCY'
  | 'MARKETING_CAMPAIGN_ALERT'
  | 'CUSTOM_ALERT';

export interface ProactiveAlertInput {
  department: DepartmentKey;
  eventType: ProactiveEventType;
  title: string;
  markdownContent: string;
  entityRef?: {
    type: EntityRefType;
    id: string;
    displayLabel?: string;
  };
  metadata?: Record<string, any>;
}

export interface ProactiveAlertResult {
  success: boolean;
  messageId?: string;
  conversationId?: string;
  error?: string;
}

const DEPARTMENT_CONFIGS: Record<
  DepartmentKey,
  { groupName: string; topic: string; portalDeepLink: string }
> = {
  orders: {
    groupName: '📦 Orders & Logistics Alerts',
    topic:
      'Automated alerts for courier delivery failures, RTO escalation risks, and transit delays.',
    portalDeepLink: '/portal-orders',
  },
  support: {
    groupName: '🎧 Customer Support Alerts',
    topic:
      'Automated alerts for customer return requests, grievance escalations, and ticket priorities.',
    portalDeepLink: '/support',
  },
  operations: {
    groupName: '⚙️ Operations & Inventory Alerts',
    topic:
      'Automated alerts for low-stock jewellery pieces (<= 2 units), stockout risks, and restock needs.',
    portalDeepLink: '/operations',
  },
  tech: {
    groupName: '💻 Tech & Systems Alerts',
    topic:
      'Automated alerts for Sentry 500 error spikes, 404 broken routes, and high server latencies.',
    portalDeepLink: '/tech',
  },
  marketing: {
    groupName: '📣 Marketing & Growth Alerts',
    topic:
      'Automated alerts for campaign ad spend limits, promo expiry, and catalog SEO health.',
    portalDeepLink: '/marketing',
  },
};

/**
 * Masks customer phone number for strict PII protection in internal chat.
 * Example: "+919830123482" or "9830123482" -> "+91 98301 ••••82"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'N/A';
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    // 919830123482
    const num = digitsOnly.slice(2);
    return `+91 ${num.slice(0, 5)} ••••${num.slice(-2)}`;
  } else if (digitsOnly.length === 10) {
    // 9830123482
    return `+91 ${digitsOnly.slice(0, 5)} ••••${digitsOnly.slice(-2)}`;
  } else if (digitsOnly.length > 5) {
    return `+91 ${digitsOnly.slice(0, 3)}••••${digitsOnly.slice(-2)}`;
  }
  return '••••••';
}

/**
 * Masks customer full name for privacy in broadcast alert cards.
 * Example: "Priya Sharma" -> "Priya S."
 */
export function maskCustomerName(name?: string | null): string {
  if (!name || !name.trim()) return 'Customer';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

/**
 * Finds an admin or system user ID to act as the sender for automated system alert messages.
 */
async function getSystemSenderId(
  supabase: ReturnType<typeof getServiceClient>
): Promise<string> {
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .in('role', ['super_admin', 'admin'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (adminUser?.id) {
    return adminUser.id;
  }

  // Fallback to any active staff user
  const { data: anyStaff } = await supabase
    .from('users')
    .select('id')
    .neq('role', 'customer')
    .limit(1)
    .maybeSingle();

  return anyStaff?.id || '00000000-0000-0000-0000-000000000000';
}

/**
 * Resolves or auto-initializes the dedicated alert group conversation for a department.
 * Adds all department staff and super admins as group members.
 */
export async function getOrCreateDepartmentAlertConversation(
  department: DepartmentKey,
  client?: ReturnType<typeof getServiceClient>
): Promise<string> {
  const supabase = client || getServiceClient();
  const config = DEPARTMENT_CONFIGS[department] || DEPARTMENT_CONFIGS.orders;

  // 1. Search for existing alert conversation
  const { data: existingConv } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('group_name', config.groupName)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (existingConv?.id) {
    return existingConv.id;
  }

  // 2. Not found, create conversation with system creator
  const senderId = await getSystemSenderId(supabase);

  const { data: newConv, error: createErr } = await supabase
    .from('chat_conversations')
    .insert({
      type: 'group',
      group_name: config.groupName,
      group_topic: config.topic,
      created_by: senderId,
    })
    .select('id')
    .single();

  if (createErr || !newConv) {
    throw new Error(
      `Failed to create alert conversation: ${createErr?.message}`
    );
  }

  // 3. Find eligible staff members for this department + admins
  const { data: eligibleUsers } = await supabase
    .from('users')
    .select('id, role, department')
    .or(`department.ilike.%${department}%,role.in.(super_admin,admin)`)
    .eq('account_status', 'active');

  if (eligibleUsers && eligibleUsers.length > 0) {
    const memberRows = eligibleUsers.map((u) => ({
      conversation_id: newConv.id,
      user_id: u.id,
      is_admin: ['super_admin', 'admin'].includes(u.role),
    }));

    await supabase
      .from('chat_conversation_members')
      .upsert(memberRows, { onConflict: 'conversation_id,user_id' });
  }

  // 4. Initial greeting message
  await supabase.from('chat_messages').insert({
    conversation_id: newConv.id,
    sender_id: senderId,
    message_type: 'system',
    system_action: 'group_created',
    text_content: `📣 **${config.groupName}** initialized.\nReal-time autonomous alerts and operational notifications for the ${department.toUpperCase()} department will appear here.`,
  });

  return newConv.id;
}

/**
 * Universal Proactive Alert Dispatcher.
 * Injects cleanly formatted markdown alert cards into the target department's RuhChat channel,
 * attaches entity references for fast in-chat navigation, and triggers push notifications.
 */
export async function dispatchProactiveAlert(
  input: ProactiveAlertInput
): Promise<ProactiveAlertResult> {
  try {
    const supabase = getServiceClient();
    const conversationId = await getOrCreateDepartmentAlertConversation(
      input.department,
      supabase
    );
    const senderId = await getSystemSenderId(supabase);

    // 1. Insert alert message into RuhChat
    const { data: message, error: msgErr } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        message_type: 'text',
        text_content: input.markdownContent,
      })
      .select('id')
      .single();

    if (msgErr || !message) {
      throw new Error(
        `Failed to insert proactive alert message: ${msgErr?.message}`
      );
    }

    // 2. Insert entity reference if provided (e.g. order, product, support_ticket)
    if (input.entityRef) {
      await supabase.from('chat_entity_references').insert({
        message_id: message.id,
        entity_type: input.entityRef.type,
        entity_id: input.entityRef.id,
        display_label: input.entityRef.displayLabel || input.entityRef.id,
      });
    }

    // 3. Trigger push notifications asynchronously in background
    triggerBackgroundPushNotification(
      conversationId,
      senderId,
      input.title,
      input.markdownContent
    ).catch((err) => {
      console.warn(
        '[Proactive Dispatcher] Push notification background trigger failed:',
        err
      );
    });

    return {
      success: true,
      messageId: message.id,
      conversationId,
    };
  } catch (error: any) {
    console.error('[Proactive Dispatcher Error]', error);
    return {
      success: false,
      error: error?.message || 'Unknown error dispatching proactive alert',
    };
  }
}

/**
 * Helper to dispatch background push notifications to members of the conversation
 */
async function triggerBackgroundPushNotification(
  conversationId: string,
  senderId: string,
  title: string,
  content: string
) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${appUrl}/api/internal-chat/push-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: 'Ruhvi Autonomous Alert',
        text_content: `${title}: ${content.slice(0, 100)}...`,
      }),
    });
  } catch {
    // Non-blocking fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIFIC DEPARTMENT EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch Courier Delivery Failed Alert to Orders & Logistics Channel
 */
export async function dispatchDeliveryFailedAlert(data: {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  courier?: string;
  reason?: string;
  attemptCount?: number;
}) {
  const maskedPhone = maskPhoneNumber(data.customerPhone);
  const maskedName = maskCustomerName(data.customerName);
  const orderNum = data.orderNumber || data.orderId.slice(0, 8);

  const markdown = `🚨 **[DELIVERY FAILED] Courier Attempt Unsuccessful**
- **Order:** \`#${orderNum}\`
- **Customer:** ${maskedName} (${maskedPhone})
- **Courier:** ${data.courier || 'Shiprocket'}
- **Failure Reason:** ${data.reason || 'Customer unavailable at delivery address'}
- **Attempt Count:** #${data.attemptCount || 1}

⚠️ **Action Required to Prevent RTO:**
Please open the portal, coordinate a preferred delivery slot with the customer, and log your call remark immediately.

🔗 [Open Order in Orders Portal](/portal-orders?search=${encodeURIComponent(orderNum)})`;

  return dispatchProactiveAlert({
    department: 'orders',
    eventType: 'ORDER_DELIVERY_FAILED',
    title: `Delivery Failed: #${orderNum}`,
    markdownContent: markdown,
    entityRef: {
      type: 'order',
      id: orderNum,
      displayLabel: `#${orderNum}`,
    },
    metadata: data,
  });
}

/**
 * Dispatch RTO Initiated Alert to Orders & Support Channels
 */
export async function dispatchRtoInitiatedAlert(data: {
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  courier?: string;
  reason?: string;
}) {
  const maskedPhone = maskPhoneNumber(data.customerPhone);
  const maskedName = maskCustomerName(data.customerName);
  const orderNum = data.orderNumber || data.orderId.slice(0, 8);

  const markdown = `⚠️ **[RTO INITIATED] Order Returning to Origin**
- **Order:** \`#${orderNum}\`
- **Customer:** ${maskedName} (${maskedPhone})
- **Courier:** ${data.courier || 'Shiprocket'}
- **RTO Reason:** ${data.reason || 'Consignee unreachable after max attempts / Rejected at doorstep'}
- **Transit Status:** Returning to Ruhvi Warehouse

👉 **Action Required:**
1. Open Orders Portal and log call status as \`RTO Confirmed\` or coordinate re-dispatch.
2. Notify customer regarding refund or re-attempt policy.

🔗 [Open Order in Orders Portal](/portal-orders?search=${encodeURIComponent(orderNum)})`;

  return dispatchProactiveAlert({
    department: 'orders',
    eventType: 'ORDER_RTO_INITIATED',
    title: `RTO Initiated: #${orderNum}`,
    markdownContent: markdown,
    entityRef: {
      type: 'order',
      id: orderNum,
      displayLabel: `#${orderNum}`,
    },
    metadata: data,
  });
}

/**
 * Dispatch New Customer Return Request Alert to Support & Orders Channels
 */
export async function dispatchReturnRequestAlert(data: {
  returnId: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  reason: string;
  customerNote?: string;
  itemName?: string;
  photoUrl?: string;
}) {
  const maskedPhone = maskPhoneNumber(data.customerPhone);
  const maskedName = maskCustomerName(data.customerName);
  const orderNum = data.orderNumber || data.orderId.slice(0, 8);

  const markdown = `🔄 **[NEW RETURN REQUEST] Customer Initiated Return**
- **Order:** \`#${orderNum}\`
- **Item:** ${data.itemName || 'Jewellery Item'}
- **Return Reason:** \`${data.reason}\`
- **Customer Note:** "${data.customerNote || 'No additional note provided'}"
- **Customer:** ${maskedName} (${maskedPhone})
${data.photoUrl ? `- **Defect Photo Attached:** [View Uploaded Image](${data.photoUrl})` : ''}

👉 **Action Required:**
Review customer defect claim and reason in Support Portal. Coordinate reverse pickup, instant wallet credit, or replacement.

🔗 [Review Return in Support Portal](/support?tab=returns&id=${encodeURIComponent(data.returnId)})`;

  return dispatchProactiveAlert({
    department: 'support',
    eventType: 'RETURN_REQUESTED',
    title: `Return Request: #${orderNum} (${data.reason})`,
    markdownContent: markdown,
    entityRef: {
      type: 'order',
      id: orderNum,
      displayLabel: `#${orderNum}`,
    },
    metadata: data,
  });
}

/**
 * Dispatch Critical Low Stock Alert to Operations Channel
 */
export async function dispatchLowStockAlert(data: {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  category?: string;
}) {
  const markdown = `⚡ **[INVENTORY ALERT] Critical Low Stock Warning**
- **Product:** ${data.productName}
- **SKU:** \`${data.sku}\`
- **Remaining Stock:** **${data.currentStock} unit${data.currentStock === 1 ? '' : 's'}**
- **Category:** ${data.category || 'Jewellery'}
- **Stockout Risk:** High — Expected stockout within 24–48 hours based on customer traffic.

👉 **Action Required:**
Check supplier lead times and prepare restock batch in Operations Portal.

🔗 [Open Inventory in Operations Portal](/operations?tab=inventory&sku=${encodeURIComponent(data.sku)})`;

  return dispatchProactiveAlert({
    department: 'operations',
    eventType: 'OPERATIONS_LOW_STOCK',
    title: `Low Stock: ${data.productName} (${data.currentStock} left)`,
    markdownContent: markdown,
    entityRef: {
      type: 'product',
      id: data.productId,
      displayLabel: data.sku,
    },
    metadata: data,
  });
}

/**
 * Dispatch Sentry 500 Error Spike Alert to Tech Channel
 */
export async function dispatchTech500ErrorAlert(data: {
  errorName: string;
  errorMessage: string;
  route?: string;
  count?: number;
  sentryEventId?: string;
  stackSnippet?: string;
}) {
  const markdown = `🔥 **[TECH CRITICAL] Sentry 500 Error Spike Detected**
- **Error:** \`${data.errorName}\`
- **Message:** ${data.errorMessage}
- **Route:** \`${data.route || 'Serverless API'}\`
- **Occurrences:** **${data.count || 1} events** in short window
${data.sentryEventId ? `- **Sentry Event ID:** \`${data.sentryEventId}\`` : ''}
${data.stackSnippet ? `\`\`\`\n${data.stackSnippet.slice(0, 300)}\n\`\`\`` : ''}

👉 **Action Required:**
On-call engineering team inspect server logs, check recent deployments, and address unhandled exceptions.

🔗 [Open Tech Logs & Diagnostics](/tech?tab=logs)`;

  return dispatchProactiveAlert({
    department: 'tech',
    eventType: 'TECH_SENTRY_500',
    title: `Sentry Error Spike: ${data.errorName}`,
    markdownContent: markdown,
    metadata: data,
  });
}

/**
 * Dispatch 404 Broken Page Spike Alert to Tech Channel
 */
export async function dispatchTech404SpikeAlert(data: {
  missingPath: string;
  referrer?: string;
  hitCount: number;
  timeWindowMinutes?: number;
}) {
  const markdown = `🔍 **[TECH ALERT] 404 Broken Route Spike**
- **Missing Path:** \`${data.missingPath}\`
- **404 Hits:** **${data.hitCount} requests** (last ${data.timeWindowMinutes || 15} mins)
- **Referrer:** ${data.referrer || 'Direct / External Link'}

👉 **Action Required:**
Check if a marketing campaign, promotional email, or Instagram link is pointing to a broken slug. Configure Next.js 301 redirect or restore page.

🔗 [Open Tech Portal](/tech)`;

  return dispatchProactiveAlert({
    department: 'tech',
    eventType: 'TECH_404_SPIKE',
    title: `404 Spike: ${data.missingPath}`,
    markdownContent: markdown,
    metadata: data,
  });
}

/**
 * Dispatch High Server Latency Alert to Tech Channel
 */
export async function dispatchTechHighLatencyAlert(data: {
  endpoint: string;
  latencyMs: number;
  thresholdMs?: number;
}) {
  const threshold = data.thresholdMs || 3000;
  const markdown = `⏱️ **[TECH WARNING] High Server Latency Detected**
- **Endpoint:** \`${data.endpoint}\`
- **Response Time:** **${data.latencyMs} ms** (Threshold: ${threshold} ms)
- **Impact:** Slow customer checkout or catalog browsing latency

👉 **Action Required:**
Inspect Supabase connection pooling, query indexes, or external API bottlenecks.

🔗 [Open Tech Portal](/tech)`;

  return dispatchProactiveAlert({
    department: 'tech',
    eventType: 'TECH_HIGH_LATENCY',
    title: `High Latency: ${data.endpoint} (${data.latencyMs}ms)`,
    markdownContent: markdown,
    metadata: data,
  });
}

/**
 * Autonomous Cron / Background Scanner for Operational Alerts.
 * Automatically checks for:
 * 1. Delivery failed / RTO orders in the last 24 hours.
 * 2. Active catalog products with critical low stock (<= 2).
 * 3. Recent customer returns.
 */
export async function scanAndDispatchOperationalAlerts(): Promise<{
  scannedOrders: number;
  scannedProducts: number;
  alertsDispatched: number;
}> {
  const supabase = getServiceClient();
  let alertsDispatched = 0;

  // 1. Scan for Delivery Failed or RTO orders in last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: failedOrders } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, delivery_status, shipping_address, created_at'
    )
    .or(
      'delivery_status.ilike.%failed%,delivery_status.ilike.%rto%,status.ilike.%rto%'
    )
    .gte('created_at', since)
    .limit(10);

  if (failedOrders) {
    for (const ord of failedOrders) {
      const address = (ord.shipping_address as any) || {};
      const isRto =
        (ord.delivery_status || '').toLowerCase().includes('rto') ||
        (ord.status || '').toLowerCase().includes('rto');

      if (isRto) {
        await dispatchRtoInitiatedAlert({
          orderId: ord.id,
          orderNumber: ord.order_number,
          customerName: address.name || address.full_name,
          customerPhone: address.phone,
          reason: ord.delivery_status || 'RTO in progress',
        });
      } else {
        await dispatchDeliveryFailedAlert({
          orderId: ord.id,
          orderNumber: ord.order_number,
          customerName: address.name || address.full_name,
          customerPhone: address.phone,
          reason: ord.delivery_status || 'Courier delivery attempt failed',
        });
      }
      alertsDispatched++;
    }
  }

  // 2. Scan for Low Stock Products (stock <= 2)
  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('id, name, sku, stock, is_active, category:categories(name)')
    .eq('is_active', true)
    .lte('stock', 2)
    .order('stock', { ascending: true })
    .limit(10);

  if (lowStockProducts) {
    for (const prod of lowStockProducts) {
      const catName = Array.isArray(prod.category)
        ? (prod.category[0] as any)?.name
        : (prod.category as any)?.name;

      await dispatchLowStockAlert({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku || prod.id.slice(0, 8),
        currentStock: prod.stock || 0,
        category: catName,
      });
      alertsDispatched++;
    }
  }

  return {
    scannedOrders: failedOrders?.length || 0,
    scannedProducts: lowStockProducts?.length || 0,
    alertsDispatched,
  };
}
