import { NextRequest, NextResponse } from 'next/server';
import { processRoutingRules } from '@/lib/mailbox/routing-engine';
import type { RuhMailRoutingRule } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

// POST /api/mailbox/routing/test (Simulate matching rules against an email)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rules = [], email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'email object is required' },
        { status: 400 }
      );
    }

    const matches = processRoutingRules(rules as RuhMailRoutingRule[], email);

    return NextResponse.json({
      success: true,
      matches,
      matchCount: matches.length,
    });
  } catch (error) {
    console.error('[API /api/mailbox/routing/test] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Simulation failed' },
      { status: 500 }
    );
  }
}
