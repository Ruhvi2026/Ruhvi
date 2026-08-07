import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai';

// This would typically be secured by a cron secret in production
export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // Fetch all providers
    const { data: providersData, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'ai_providers')
      .single();

    if (error || !providersData) {
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }

    let providers = providersData.value as any[];

    const results = [];
    let updated = false;

    // Test each enabled provider
    for (const provider of providers) {
      if (!provider.isEnabled) continue;

      const modelToTest =
        provider.models && provider.models.length > 0
          ? provider.models[0]
          : null;
      let status = 'online';

      try {
        const { provider: aiInstance, model } = await getAIProvider(
          provider.id,
          modelToTest || '',
          provider
        );
        // Send a minimal ping prompt to test health
        await aiInstance.generateStructuredProductContent(
          'Ping. Return {"status": "ok"}',
          model
        );
      } catch (err: any) {
        console.error(`Health check failed for ${provider.id}:`, err);
        status = 'offline';
      }

      if (provider.status !== status) {
        provider.status = status;
        updated = true;
      }
      results.push({ id: provider.id, status });
    }

    if (updated) {
      // Save back to DB
      await supabase
        .from('settings')
        .upsert(
          { key: 'ai_providers', value: providers },
          { onConflict: 'key' }
        );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
