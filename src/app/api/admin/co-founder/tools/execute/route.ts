import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { executeCoFounderTool } from '@/lib/ai/co-founder/tool-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toolName, args } = await req.json();
    if (!toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400 }
      );
    }

    const result = await executeCoFounderTool(toolName, args, [
      'orders:read',
      'products:read',
      'category:read',
      'inventory:read',
      'customer:read',
      'wallet:read',
      'rewards_coin:read',
      'payment:read',
      'whatsapp:read',
      'push_notifications:read',
      'blog:read',
      'offers:read',
      'marketing_campaign:read',
      'website_management:read',
      'analytics:read',
      'user_management:read',
      'team_management:read',
      'role_management:read',
      'mcp_tools:read',
      'support_ticket:read',
      'coupons:read',
    ]);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}
