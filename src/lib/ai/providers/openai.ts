import { AIProvider } from '../index';

export class OpenAIProvider implements AIProvider {
  private apiKey: string | null = null;

  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    this.apiKey = apiKey;
  }

  async generateStructuredProductContent(
    prompt: string,
    modelName: string,
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<{
    content: Record<string, any>;
    usage: { tokens: number; cost: number };
  }> {
    if (!this.apiKey) {
      throw new Error('OpenAI API is not initialized.');
    }

    // Call OpenAI API
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        ...(config?.temperature !== undefined && {
          temperature: config.temperature,
        }),
        ...(config?.maxTokens !== undefined && {
          max_tokens: config.maxTokens,
        }),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API Error: ${err}`);
    }

    const data = await res.json();
    const contentText = data.choices[0]?.message?.content;
    const tokens = data.usage?.total_tokens || 0;

    // Rough estimate for GPT-4o
    const cost = tokens * 0.000015;

    return {
      content: JSON.parse(contentText),
      usage: { tokens, cost },
    };
  }
}
