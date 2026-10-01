import { NextResponse } from 'next/server';

// Proxy to the existing /api/chat route
export async function POST(req: Request) {
  try {
    // The Vercel AI SDK sends messages in the format: [{ role: 'user' | 'assistant', content: string }]
    const { messages } = await req.json();

    // Convert to the format expected by the existing /api/chat route:
    //   [{ sender: 'user' | 'assistant', text: string }]
    // Note: The existing route expects 'user' and 'assistant' for sender?
    // Actually, it expects 'user' and then formats as 'Customer' and 'Assistant' in the prompt.
    // We'll map: role 'user' -> sender 'user', role 'assistant' -> sender 'assistant'
    const convertedMessages = messages.map((m: any) => ({
      sender: m.role,
      text: m.content,
    }));

    // Forward the request to the existing /api/chat route
    const chatResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: convertedMessages }),
      }
    );

    if (!chatResponse.ok) {
      throw new Error(`Chat API error: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();

    // The existing /api/chat route returns: { response: string }
    // We need to convert to the format expected by the Vercel AI SDK:
    //   { messages: [{ role: 'assistant', content: string }] }
    // But the useChat hook expects a streaming response or a specific JSON structure.
    // Since we are not streaming, we can return a JSON object that the useChat hook can understand?
    // Actually, the useChat hook expects the AI SDK's protocol when using the hook.
    // However, we are using the hook with a custom endpoint that we control.
    // We can return the response in the format that the hook expects for a non-streaming response?
    // The hook expects the response to be a string or a stream of strings.

    // Let's return the response text directly, and the hook will treat it as the message content.
    // But note: the hook expects the response to be in the format of the AI SDK's stream.

    // Alternatively, we can return a JSON object that matches the AI SDK's non-streaming response?
    // The AI SDK's non-streaming response for generateText is: { text: string }

    // We'll return: { text: chatData.response }

    return NextResponse.json({ text: chatData.response });
  } catch (error: any) {
    console.error('Admin Chat Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
