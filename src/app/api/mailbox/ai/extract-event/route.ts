import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvApiKey } from '@/lib/ai/keys';

export const dynamic = 'force-dynamic';

export interface ExtractedCalendarEvent {
  hasEvent: boolean;
  title?: string;
  description?: string;
  suggestedDate?: string; // YYYY-MM-DD
  suggestedStartTime?: string; // HH:mm
  suggestedEndTime?: string; // HH:mm
  location?: string;
  attendees?: string[];
  isMeeting: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { subject, body, from, date } = await req.json();

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
You are an intelligent calendar assistant for Ruhvi Jewels (ruhvi.in).
Analyze the following email and detect if it mentions a meeting, appointment, deadline, call, delivery schedule, or calendar event.

Sender: ${from || 'Unknown'}
Sent Date: ${date || new Date().toISOString()}
Subject: ${subject || '(No Subject)'}
Content:
${body || '(Empty)'}

Output JSON ONLY with this exact structure:
{
  "hasEvent": boolean, // true if an event, meeting, deadline or schedule is mentioned
  "title": string, // concise event title (e.g., "Vendor Negotiation Call with XYZ")
  "description": string, // brief event summary
  "suggestedDate": string, // YYYY-MM-DD if determinable, or today/tomorrow
  "suggestedStartTime": string, // HH:mm format e.g. "14:00" or "10:30"
  "suggestedEndTime": string, // HH:mm format e.g. "15:00"
  "location": string, // e.g. "Google Meet", "Office", "Phone Call", or empty string
  "attendees": [string], // array of emails or names mentioned
  "isMeeting": boolean
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
        const parsed: ExtractedCalendarEvent = JSON.parse(text);
        return NextResponse.json({ success: true, event: parsed });
      } catch (geminiErr) {
        console.warn('[AI Extract Event] Gemini error, fallback:', geminiErr);
      }
    }

    // Heuristic fallback
    const isMeeting =
      /meeting|call|schedule|appointment|demo|zoom|google meet|discussion/i.test(
        `${subject} ${body}`
      );

    return NextResponse.json({
      success: true,
      event: {
        hasEvent: isMeeting,
        title: subject ? `Meeting: ${subject}` : 'Scheduled Meeting',
        description: body ? body.slice(0, 150) : '',
        suggestedDate: new Date().toISOString().split('T')[0],
        suggestedStartTime: '11:00',
        suggestedEndTime: '11:30',
        location: 'Virtual / Meet',
        attendees: from ? [from] : [],
        isMeeting,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/ai/extract-event] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract calendar event' },
      { status: 500 }
    );
  }
}
