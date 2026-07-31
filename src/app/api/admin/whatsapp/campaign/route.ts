import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    // In a real app, you must verify the admin session/token here
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'admin') return NextResponse.json({error: 'Unauthorized'}, {status: 401});

    const body = await req.json();
    const { templateName, phoneNumbers, components = [] } = body;

    if (!templateName || !phoneNumbers || !Array.isArray(phoneNumbers)) {
      return NextResponse.json(
        { error: 'templateName and phoneNumbers array are required' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Send messages (in production, for large lists, use a queue like BullMQ or trigger asynchronously)
    for (const phone of phoneNumbers) {
      try {
        const response = await sendWhatsAppMessage(phone, templateName, 'en', components);
        results.push({ phone, status: 'success', response });
      } catch (err: any) {
        console.error(`Failed marketing broadcast to ${phone}:`, err);
        errors.push({ phone, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast completed. ${results.length} sent, ${errors.length} failed.`,
      results,
      errors,
    });
  } catch (error: any) {
    console.error('Marketing Campaign Error:', error);
    return NextResponse.json({ error: 'Failed to trigger marketing campaign' }, { status: 500 });
  }
}
