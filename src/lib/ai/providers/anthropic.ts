import { AIProvider } from '../index';

export class AnthropicProvider implements AIProvider {
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
      throw new Error('Anthropic API is not initialized.');
    }

    // Call Anthropic API
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName || 'claude-3-haiku-20240307',
        max_tokens: config?.maxTokens || 2000,
        ...(config?.temperature !== undefined && {
          temperature: config.temperature,
        }),
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
      throw new Error(`Anthropic API Error: ${err}`);
    }

    const data = await res.json();
    const contentText = data.content[0]?.text;
    const tokens =
      (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    // Rough estimate for Claude Haiku
    const cost = tokens * 0.00000125;

    return {
      content: this.extractJson(contentText),
      usage: { tokens, cost },
    };
  }

  private extractJson(text: string): Record<string, any> {
    if (!text) throw new Error('Anthropic returned an empty response.');
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Claude sometimes prefaces JSON with a short prose sentence.
      // Try to locate the first { or [ and parse from there.
      const braceIdx = jsonStr.indexOf('{');
      const bracketIdx = jsonStr.indexOf('[');
      const startIdx =
        braceIdx !== -1 && (bracketIdx === -1 || braceIdx < bracketIdx)
          ? braceIdx
          : bracketIdx;
      if (startIdx !== -1) {
        try {
          return JSON.parse(jsonStr.slice(startIdx));
        } catch {}
      }
      return { response: text.trim() };
    }
  }
}
