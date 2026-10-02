import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getCoFounderSystemPrompt } from '@/lib/ai/co-founder/brain';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, channel = 'text' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const latest = messages[messages.length - 1];
    if (!latest?.text) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    // 1. Synthesize prioritized Co-Founder System Prompt
    const systemPrompt = await getCoFounderSystemPrompt({
      userId: auth.uid,
      userRole: auth.role || 'founder',
      adminName: 'Founder',
      channel: channel as 'voice' | 'text',
      sessionGoal: latest.text,
    });

    // 2. Resolve Gemini API Key (Dedicated to Co-Founder)
    const apiKey =
      process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          response:
            'Hello Founder! I am your AI Co-Founder. To enable live multimodal generation, please configure GEMINI_LIVE_API_KEY in your environment.',
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemPrompt,
    });

    // 3. Format history for Google Gen AI
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latest.text);
    const responseText = result.response.text();

    return NextResponse.json({
      response: responseText,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[Co-Founder Chat Error]', error);
    return NextResponse.json(
      {
        error: error?.message || 'Co-Founder service temporarily unavailable',
        response: `I encountered an unexpected issue processing that request: ${error?.message || 'Please try again.'}`,
      },
      { status: 500 }
    );
  }
}
