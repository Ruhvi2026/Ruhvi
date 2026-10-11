import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { executeCoFounderTool } from '@/lib/ai/co-founder/tool-bridge';
import { getUserScopes } from '@/lib/auth/rbac';
import {
  enforceCoFounderRateLimit,
  createRateLimitHeaders,
} from '@/lib/ai/co-founder/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status || 401 });
    }

    // Enforce rate limiting for tool execution
    const rateLimitCheck = enforceCoFounderRateLimit(auth.uid, {
      tier: 'tool_execution',
      role: auth.role || 'founder',
    });
    if (!rateLimitCheck.success) {
      return rateLimitCheck.response!;
    }

    const { toolName, args } = await req.json();
    if (!toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400 }
      );
    }

    const scopes = await getUserScopes(auth.uid);

    const result = await executeCoFounderTool(toolName, args, scopes);
    const rateHeaders = createRateLimitHeaders(rateLimitCheck.result);

    return NextResponse.json(result, { headers: rateHeaders });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}

