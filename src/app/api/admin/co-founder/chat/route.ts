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

    // 3. Format & sanitize history for Google Gen AI
    // Gemini SDK strictly requires history to start with role 'user' and alternate user -> model
    const rawHistory = messages.slice(0, -1);
    const firstUserIdx = rawHistory.findIndex((m: any) => m.sender === 'user');
    const validHistory: Array<{
      role: 'user' | 'model';
      parts: [{ text: string }];
    }> = [];

    if (firstUserIdx !== -1) {
      let expectedRole: 'user' | 'model' = 'user';
      for (let i = firstUserIdx; i < rawHistory.length; i++) {
        const m = rawHistory[i];
        const role = m.sender === 'user' ? 'user' : 'model';
        if (role === expectedRole && m.text?.trim()) {
          validHistory.push({
            role,
            parts: [{ text: m.text.trim() }],
          });
          expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
      }
    }

    // 4. Model hierarchy with automatic fallback
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: channel === 'voice' ? 300 : 1000,
          },
        });

        const chat = model.startChat({ history: validHistory });
        const result = await chat.sendMessage(latest.text);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Co-Founder Chat] Model ${modelName} failed, attempting next:`,
          err?.message
        );
        continue;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No candidate Gemini model responded.');
    }

    return NextResponse.json({
      response: responseText,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[Co-Founder Chat Error]', error);
    return NextResponse.json(
      {
        error: error?.message || 'Co-Founder service temporarily unavailable',
        response: `I encountered an issue processing that: ${error?.message || 'Please try again.'}`,
      },
      { status: 500 }
    );
  }
}
