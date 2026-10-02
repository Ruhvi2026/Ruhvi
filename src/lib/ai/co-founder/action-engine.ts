import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';
import { assertToolPermission } from '@/lib/ai/mcp-auth';
import { acknowledgeSignal } from './proactive';

export type ActionStatus =
  'pending' | 'validating' | 'executing' | 'completed' | 'failed';

export interface BusinessActionRequest {
  actionType: string;
  actionPayload: Record<string, any>;
  approvalId?: string;
  userId: string;
  userScopes: string[];
  idempotencyKey?: string;
}

export interface BusinessActionResult {
  actionId: string;
  actionType: string;
  status: ActionStatus;
  success: boolean;
  affectedEntities: { type: string; id: string }[];
  resultData?: any;
  error?: string;
  voiceSummary: string; // Crisp spoken result for LiveKit
  timestamp: string;
}

/**
 * Validates that an entity exists before mutating it (Phase 10: Target Validation).
 */
async function validateTargetEntity(
  table: string,
  idField: string,
  idValue: string
): Promise<{ exists: boolean; entity?: any }> {
  const supabase = getServiceClient();
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(idField, idValue)
      .maybeSingle();

    if (error || !data) return { exists: false };
    return { exists: true, entity: data };
  } catch {
    return { exists: false };
  }
}

/**
 * Core Business Action Execution Engine (Stage 7).
 *
 * Sits strictly after Brain, Analytics, Proactive Intelligence, Recommendations,
 * and Server-side Approval validation.
 */
export async function executeApprovedBusinessAction(
  request: BusinessActionRequest
): Promise<BusinessActionResult> {
  const timestamp = new Date().toISOString();
  const actionId = `act_${Date.now()}`;
  const supabase = getServiceClient();

  // 1. Permission Validation (Phase 6)
  const permissionError = assertToolPermission(
    request.userScopes,
    request.actionType
  );
  if (permissionError) {
    return {
      actionId,
      actionType: request.actionType,
      status: 'failed',
      success: false,
      affectedEntities: [],
      error: permissionError.error,
      voiceSummary: `Permission denied. Your role does not have permission to execute ${request.actionType.replace(
        /_/g,
        ' '
      )}.`,
      timestamp,
    };
  }

  // 2. Server-side Approval Validation (Phase 5)
  // Low-risk read actions do not require approval; write operations MUST have valid approval
  const isHighImpact = [
    'update_inventory_stock',
    'update_product',
    'create_coupon',
    'update_coupon_status',
    'refund_order',
    'send_whatsapp_message',
    'send_push_notification',
  ].includes(request.actionType);

  let approvalRecord: any = null;

  if (isHighImpact) {
    if (!request.approvalId) {
      return {
        actionId,
        actionType: request.actionType,
        status: 'failed',
        success: false,
        affectedEntities: [],
        error: 'High-impact action requires valid approvalId',
        voiceSummary:
          'This action requires explicit founder approval before it can be executed.',
        timestamp,
      };
    }

    const { data: approval, error: appErr } = await supabase
      .from('co_founder_approvals')
      .select('*')
      .eq('id', request.approvalId)
      .single();

    if (appErr || !approval) {
      return {
        actionId,
        actionType: request.actionType,
        status: 'failed',
        success: false,
        affectedEntities: [],
        error: 'Approval record not found or inaccessible',
        voiceSummary: 'The requested approval record could not be found.',
        timestamp,
      };
    }

    // Check status: must be 'approved'
    if (approval.status === 'executed') {
      return {
        actionId,
        actionType: request.actionType,
        status: 'failed',
        success: false,
        affectedEntities: [],
        error: 'Action has already been executed (idempotency guard)',
        voiceSummary: 'This approved action has already been executed.',
        timestamp,
      };
    }

    if (approval.status !== 'approved') {
      return {
        actionId,
        actionType: request.actionType,
        status: 'failed',
        success: false,
        affectedEntities: [],
        error: `Approval record status is '${approval.status}'. Must be 'approved'.`,
        voiceSummary: `Cannot execute action because the approval status is ${approval.status}.`,
        timestamp,
      };
    }

    // Check expiration (Phase 13)
    if (new Date(approval.expires_at) <= new Date()) {
      return {
        actionId,
        actionType: request.actionType,
        status: 'failed',
        success: false,
        affectedEntities: [],
        error: 'Approval has expired',
        voiceSummary: 'This approval has expired and cannot be executed.',
        timestamp,
      };
    }

    // Check Action Type match
    if (approval.action_type !== request.actionType) {
      return {
        actionId,
        actionType: request.actionType,
        status: 'failed',
        success: false,
        affectedEntities: [],
        error: `Approval was granted for '${approval.action_type}', but execution requested '${request.actionType}'.`,
        voiceSummary:
          'Action mismatch: the approval does not match the requested action.',
        timestamp,
      };
    }

    approvalRecord = approval;
  }

  // 3. Execution Router (Phase 7-8)
  try {
    switch (request.actionType) {
      // ── Inventory Stock Update ───────────────────────────────────────────
      case 'update_inventory_stock': {
        const { product_id, sku, new_stock_quantity } = request.actionPayload;
        if ((!product_id && !sku) || typeof new_stock_quantity !== 'number') {
          throw new Error(
            'product_id or sku, and new_stock_quantity are required'
          );
        }

        // Target Validation (Phase 10)
        let targetQuery = supabase
          .from('products')
          .select('id, name, sku, stock_quantity');
        if (product_id) targetQuery = targetQuery.eq('id', product_id);
        else if (sku) targetQuery = targetQuery.eq('sku', sku);

        const { data: product, error: prodErr } =
          await targetQuery.maybeSingle();
        if (prodErr || !product) {
          throw new Error(`Target product not found in catalog.`);
        }

        const { error: updateErr } = await supabase
          .from('products')
          .update({
            stock_quantity: new_stock_quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (updateErr) throw updateErr;

        // Auto-acknowledge related low stock proactive signals (Phase 27)
        if (new_stock_quantity > 5) {
          const { data: sigs } = await supabase
            .from('co_founder_signals')
            .select('id')
            .eq('signal_type', 'low_inventory')
            .eq('is_acknowledged', false);

          if (sigs && sigs.length > 0) {
            for (const s of sigs) {
              await acknowledgeSignal(s.id, request.userId);
            }
          }
        }

        const affectedEntities = [{ type: 'product', id: product.id }];

        // Mark approval executed (Phase 11)
        if (approvalRecord) {
          await supabase
            .from('co_founder_approvals')
            .update({
              status: 'executed',
              execution_result: {
                product_id: product.id,
                previousStock: product.stock_quantity,
                newStock: new_stock_quantity,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', approvalRecord.id);
        }

        await logAuditEvent({
          portal: 'admin',
          action: 'co_founder_execute_inventory_update',
          entityType: 'product',
          entityId: product.id,
          changes: {
            previous: product.stock_quantity,
            current: new_stock_quantity,
          },
        }).catch(() => {});

        return {
          actionId,
          actionType: request.actionType,
          status: 'completed',
          success: true,
          affectedEntities,
          resultData: {
            productId: product.id,
            sku: product.sku,
            newStock: new_stock_quantity,
          },
          voiceSummary: `Inventory for ${product.name} has been updated to ${new_stock_quantity} units.`,
          timestamp,
        };
      }

      // ── Support Ticket Status Update ─────────────────────────────────────
      case 'update_ticket_status': {
        const { ticket_id, new_status } = request.actionPayload;
        if (!ticket_id || !new_status) {
          throw new Error('ticket_id and new_status are required');
        }

        const { data: ticket, error: tickErr } = await supabase
          .from('support_tickets')
          .select('id, ticket_number, status')
          .eq('id', ticket_id)
          .maybeSingle();

        if (tickErr || !ticket) {
          throw new Error('Target support ticket not found.');
        }

        const { error: updateErr } = await supabase
          .from('support_tickets')
          .update({
            status: new_status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticket_id);

        if (updateErr) throw updateErr;

        const affectedEntities = [{ type: 'support_ticket', id: ticket_id }];

        if (approvalRecord) {
          await supabase
            .from('co_founder_approvals')
            .update({
              status: 'executed',
              execution_result: {
                ticket_id,
                previousStatus: ticket.status,
                newStatus: new_status,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', approvalRecord.id);
        }

        await logAuditEvent({
          portal: 'admin',
          action: 'co_founder_execute_ticket_status_update',
          entityType: 'support_ticket',
          entityId: ticket_id,
          changes: { previous: ticket.status, current: new_status },
        }).catch(() => {});

        return {
          actionId,
          actionType: request.actionType,
          status: 'completed',
          success: true,
          affectedEntities,
          resultData: { ticketId: ticket_id, status: new_status },
          voiceSummary: `Ticket #${ticket.ticket_number || ticket_id} status has been changed to ${new_status}.`,
          timestamp,
        };
      }

      // ── Coupon Creation ──────────────────────────────────────────────────
      case 'create_coupon': {
        const { code, discount_type, discount_value, min_order_amount } =
          request.actionPayload;
        if (!code || !discount_value) {
          throw new Error(
            'code and discount_value are required to create a coupon'
          );
        }

        const { data: newCoupon, error: couponErr } = await supabase
          .from('coupons')
          .insert({
            code: code.trim().toUpperCase(),
            discount_type: discount_type || 'percentage',
            discount_value: Number(discount_value),
            min_order_amount: Number(min_order_amount || 0),
            is_active: true,
          })
          .select('id, code')
          .single();

        if (couponErr) throw couponErr;

        const affectedEntities = [{ type: 'coupon', id: newCoupon.id }];

        if (approvalRecord) {
          await supabase
            .from('co_founder_approvals')
            .update({
              status: 'executed',
              execution_result: {
                couponId: newCoupon.id,
                code: newCoupon.code,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', approvalRecord.id);
        }

        await logAuditEvent({
          portal: 'admin',
          action: 'co_founder_execute_create_coupon',
          entityType: 'coupon',
          entityId: newCoupon.id,
          changes: { code: newCoupon.code, discount_value },
        }).catch(() => {});

        return {
          actionId,
          actionType: request.actionType,
          status: 'completed',
          success: true,
          affectedEntities,
          resultData: newCoupon,
          voiceSummary: `Coupon ${newCoupon.code} has been created and activated.`,
          timestamp,
        };
      }

      default:
        throw new Error(
          `Action type '${request.actionType}' is not supported by the Business Action Layer.`
        );
    }
  } catch (execErr: any) {
    console.error('Error during business action execution:', execErr);

    if (approvalRecord) {
      await supabase
        .from('co_founder_approvals')
        .update({
          status: 'failed',
          execution_result: { error: execErr.message },
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalRecord.id);
    }

    return {
      actionId,
      actionType: request.actionType,
      status: 'failed',
      success: false,
      affectedEntities: [],
      error: execErr.message || 'Action execution failed',
      voiceSummary: `Execution failed: ${execErr.message}`,
      timestamp,
    };
  }
}
