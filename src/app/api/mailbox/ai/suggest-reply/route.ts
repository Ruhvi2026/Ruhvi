import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvApiKey } from '@/lib/ai/keys';
import type { AIReplySuggestion } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { subject, body, from, tone = 'professional' } = await req.json();

    const apiKey = getEnvApiKey('gemini') || process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
        });

        const prompt = `
You are drafting an email reply on behalf of Ruhvi Jewels staff (ruhvi.in).
Sender: ${from || 'Customer/Partner'}
Original Subject: ${subject || ''}
Original Email:
${body || ''}

Draft a reply with tone: "${tone}".
- If "professional": polite, accommodating, formal, and helpful.
- If "quick": short 2-3 sentence acknowledgment ("Thank you, we received your message and will get back to you shortly").
- If "clarify": courteous request asking the sender to provide more specifics or order details.

Output JSON ONLY with this structure:
{
  "tone": "${tone}",
  "label": "Short label",
  "body": "The complete drafted email response without subject"
}
`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        });

        const text = result.response.text();
        const parsed: AIReplySuggestion = JSON.parse(text);
        return NextResponse.json({ success: true, suggestion: parsed });
      } catch (geminiErr) {
        console.warn(
          '[AI Suggest Reply] Gemini failed, using template:',
          geminiErr
        );
      }
    }

    // Heuristic template fallback
    const senderName =
      from?.split('<')[0]?.replace(/"/g, '')?.trim() || 'there';
    let draft = '';
    let label = 'Professional';

    if (tone === 'quick') {
      label = 'Quick Ack';
      draft = `Hi ${senderName},\n\nThank you for reaching out. We have received your email regarding "${subject || 'your inquiry'}" and our team is currently reviewing it.\n\nWe will get back to you with an update shortly.\n\nBest regards,\nRuhvi Jewels Team\nruhvi.in`;
    } else if (tone === 'clarify') {
      label = 'Request Info';
      draft = `Hi ${senderName},\n\nThank you for getting in touch with us.\n\nCould you please share a few more details (such as your Order ID or specific item reference) so we can look into this immediately and resolve it for you?\n\nWarm regards,\nRuhvi Jewels Support\nruhvi.in`;
    } else {
      label = 'Professional';
      draft = `Dear ${senderName},\n\nThank you for contacting Ruhvi Jewels.\n\nWe appreciate you bringing this to our attention. We are actively looking into your request regarding "${subject || 'your message'}" and will provide you with a comprehensive resolution as soon as possible.\n\nPlease let us know if there is anything urgent in the meantime.\n\nWarm regards,\nRuhvi Jewels Team\nruhvi.in`;
    }

    const fallback: AIReplySuggestion = {
      tone,
      label,
      body: draft,
    };

    return NextResponse.json({ success: true, suggestion: fallback });
  } catch (error) {
    console.error('[API /api/mailbox/ai/suggest-reply] Error:', error);
    return NextResponse.json(
      { error: 'Failed to suggest reply' },
      { status: 500 }
    );
  }
}
