import { AIProvider } from '../index';

export class DeepSeekProvider implements AIProvider {
  private apiKey: string | null = null;

  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('DeepSeek API key is missing.');
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
      throw new Error('DeepSeek API is not initialized.');
    }

    const endpoint = 'https://api.deepseek.com/chat/completions';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt + '\n\nPlease return strictly valid JSON format.',
          },
        ],
        stream: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DeepSeek API Error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '';
    const tokens = data.usage?.total_tokens || 0;

    // Pricing estimate for DeepSeek: ~$0.00014 per 1k input, $0.00028 per 1k output
    const cost = tokens * 0.0000002;

    const parsedContent = this.extractJson(contentText);

    return {
      content: parsedContent,
      usage: { tokens, cost },
    };
  }

  private extractJson(text: string): Record<string, any> {
    if (!text) throw new Error('DeepSeek returned an empty response.');

    let jsonStr = text.trim();

    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(jsonStr);
    } catch {
      return { response: text.trim() };
    }
  }
}
