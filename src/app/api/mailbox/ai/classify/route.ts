import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvApiKey } from '@/lib/ai/keys';

export const dynamic = 'force-dynamic';

export interface EmailClassificationResult {
  category:
    'primary' | 'transactional' | 'vendor' | 'support' | 'promotional' | 'spam';
  spamScore: number; // 0 to 100
  isSpam: boolean;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  suggestedAction: 'inbox' | 'quarantine' | 'auto_reply' | 'flag_staff';
  reasoning: string;
}

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
You are the security and inbound email classification engine for Ruhvi Jewels (ruhvi.in).
Classify the incoming email and evaluate if it is legitimate business communication or spam/phishing.

Sender: ${from || 'Unknown'}
Subject: ${subject || '(No Subject)'}
Content:
${body || '(Empty)'}

Output JSON ONLY with this exact structure:
{
  "category": "primary" | "transactional" | "vendor" | "support" | "promotional" | "spam",
  "spamScore": number, // integer from 0 (completely safe) to 100 (pure spam/phishing)
  "isSpam": boolean, // true if spamScore >= 75
  "priority": "urgent" | "high" | "normal" | "low",
  "suggestedAction": "inbox" | "quarantine" | "auto_reply" | "flag_staff",
  "reasoning": string // concise explanation
}
`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        const text = result.response.text();
        const parsed: EmailClassificationResult = JSON.parse(text);
        return NextResponse.json({ success: true, classification: parsed });
      } catch (geminiErr) {
        console.warn('[AI Classify] Gemini error, fallback:', geminiErr);
      }
    }

    // Heuristic fallback
    const isObviousSpam =
      /crypto|lottery|winner|casino|viagra|wire transfer|free money/i.test(
        `${subject} ${body}`
      );

    return NextResponse.json({
      success: true,
      classification: {
        category: isObviousSpam ? 'spam' : 'primary',
        spamScore: isObviousSpam ? 95 : 10,
        isSpam: isObviousSpam,
        priority: 'normal',
        suggestedAction: isObviousSpam ? 'quarantine' : 'inbox',
        reasoning: isObviousSpam
          ? 'Keyword heuristic match for spam'
          : 'Standard email content',
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/ai/classify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to classify email' },
      { status: 500 }
    );
  }
}
