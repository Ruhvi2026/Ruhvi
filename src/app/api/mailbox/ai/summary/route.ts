import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvApiKey } from '@/lib/ai/keys';
import type { AISummaryResponse } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { subject, body, from } = await req.json();

    if (!body && !subject) {
      return NextResponse.json(
        { error: 'Email content is required' },
        { status: 400 }
      );
    }

    const apiKey = getEnvApiKey('gemini') || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
        });

        const prompt = `
You are an executive assistant summarizing an incoming email for staff at Ruhvi Jewels (ruhvi.in).
Sender: ${from || 'Unknown'}
Subject: ${subject || '(No Subject)'}
Content:
${body || '(Empty)'}

Output JSON ONLY with this exact structure:
{
  "summary": "1 concise sentence overview of what this email is about",
  "keyPoints": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "actionItems": ["action needed 1 if any, or empty array"],
  "sentiment": "positive" | "neutral" | "urgent" | "negative"
}
`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        const text = result.response.text();
        const parsed: AISummaryResponse = JSON.parse(text);
        return NextResponse.json({ success: true, ...parsed });
      } catch (geminiErr) {
        console.warn(
          '[AI Summary] Gemini failed, falling back to local extractor:',
          geminiErr
        );
      }
    }

    // Heuristic fallback if Gemini API is unavailable or rate-limited
    const lines = (body || '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 10 && !l.startsWith('>'));

    const keyPoints = lines.slice(0, 3);
    const hasUrgent = /urgent|asap|immediately|cancel|refund|issue/i.test(
      `${subject} ${body}`
    );

    const fallback: AISummaryResponse = {
      summary: subject
        ? `Message regarding "${subject}" from ${from || 'sender'}.`
        : 'Email received.',
      keyPoints:
        keyPoints.length > 0
          ? keyPoints
          : ['Review incoming email content for details.'],
      actionItems: hasUrgent
        ? ['Review urgently and respond to sender.']
        : ['Review when convenient.'],
      sentiment: hasUrgent ? 'urgent' : 'neutral',
    };

    return NextResponse.json({ success: true, ...fallback });
  } catch (error) {
    console.error('[API /api/mailbox/ai/summary] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
