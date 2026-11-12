import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { RuhMailRoutingRule } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

interface RawRuleRow {
  id: string;
  priority: number;
  condition_field: string;
  condition_op: string;
  condition_value: string;
  action: string;
  action_value: string;
  is_active: number;
  created_at: number;
}

// GET /api/mailbox/routing (List all routing rules)
export async function GET() {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const rows = await queryMailflareD1<RawRuleRow>(
      `SELECT id, priority, condition_field, condition_op, condition_value, action, action_value, is_active, created_at
       FROM ruhmail_routing_rules
       ORDER BY priority ASC, created_at DESC`
    );

    const rules: RuhMailRoutingRule[] = rows.map((r) => ({
      id: r.id,
      priority: r.priority,
      condition_field: r.condition_field as any,
      condition_op: r.condition_op as any,
      condition_value: r.condition_value,
      action: r.action as any,
      action_value: r.action_value,
      is_active: r.is_active === 1,
      created_at: r.created_at,
    }));

    return NextResponse.json({ success: true, rules });
  } catch (error) {
    console.error('[API /api/mailbox/routing] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rules', rules: [] },
      { status: 500 }
    );
  }
}

// POST /api/mailbox/routing (Create a new routing rule)
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const body = await req.json();
    const {
      priority = 100,
      condition_field,
      condition_op,
      condition_value,
      action,
      action_value,
      is_active = 1,
    } = body;

    if (
      !condition_field ||
      !condition_op ||
      !condition_value ||
      !action ||
      !action_value
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required rule parameters' },
        { status: 400 }
      );
    }

    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Math.floor(Date.now() / 1000);

    await queryMailflareD1(
      `INSERT INTO ruhmail_routing_rules (id, priority, condition_field, condition_op, condition_value, action, action_value, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        priority,
        condition_field,
        condition_op,
        condition_value,
        action,
        action_value,
        is_active ? 1 : 0,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      rule: {
        id,
        priority,
        condition_field,
        condition_op,
        condition_value,
        action,
        action_value,
        is_active: Boolean(is_active),
        created_at: now,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/routing] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/mailbox/routing?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Rule id is required' },
        { status: 400 }
      );
    }

    await queryMailflareD1(`DELETE FROM ruhmail_routing_rules WHERE id = ?`, [
      id,
    ]);
    return NextResponse.json({
      success: true,
      message: 'Routing rule deleted',
    });
  } catch (error) {
    console.error('[API /api/mailbox/routing] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
