import { AIProvider } from '../index';

export class OpenRouterProvider implements AIProvider {
  private apiKey: string | null = null;

  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    this.apiKey = apiKey;
  }

  async generateStructuredProductContent(
    prompt: string,
    modelName: string
  ): Promise<{
    content: Record<string, any>;
    usage: { tokens: number; cost: number };
  }> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API is not initialized.');
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://ruhvi.in',
        'X-Title': 'Ruhvi AI',
      },
      body: JSON.stringify({
        model: modelName || 'google/gemini-flash-1.5',
        messages: [
          {
            role: 'user',
            content:
              prompt +
              '\n\nPlease return strictly valid JSON and nothing else.',
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API Error: ${err}`);
    }

    const data = await res.json();
    const contentText = data.choices[0]?.message?.content;
    const tokens = data.usage?.total_tokens || 0;

    // Fallback cost estimate
    const cost = tokens * 0.000005;

    return {
      content: JSON.parse(contentText),
      usage: { tokens, cost },
    };
  }
}
