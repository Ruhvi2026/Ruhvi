import { AIProvider } from '../index';
import {
  assertSafeOutboundUrl,
  safeFetch,
  UnsafeUrlError,
} from '@/lib/security/ssrf';

export class CustomProvider implements AIProvider {
  private config: any;
  private apiKey: string | null = null;

  constructor(config: any) {
    this.config = config;
  }

  initialize(apiKey: string): void {
    this.apiKey = apiKey || 'dummy-key';
  }

  async generateStructuredProductContent(
    prompt: string,
    modelName: string,
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<{
    content: Record<string, any>;
    usage: { tokens: number; cost: number };
  }> {
    if (!this.config?.baseUrl) {
      throw new Error(
        'Custom Gateway Base URL is missing. Please configure it in the Providers tab.'
      );
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const endpoint = `${baseUrl}/chat/completions`;

    try {
      await assertSafeOutboundUrl(endpoint);
    } catch (e) {
      if (e instanceof UnsafeUrlError) {
        // Re-raise as a request error so the AI engine classifies it as
        // REQUEST_ERROR (fail fast) instead of rotating credentials.
        throw new Error(`Bad request: ${e.message}`);
      }
      throw e;
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey && this.apiKey !== 'dummy-key') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      if (this.config.customHeaders) {
        const parsed = JSON.parse(this.config.customHeaders);
        headers = { ...headers, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse custom headers:', e);
    }

    let res: Response;
    try {
      res = await safeFetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: modelName || 'auto/best-coding',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          ...(config?.temperature !== undefined && {
            temperature: config.temperature,
          }),
          ...(config?.maxTokens !== undefined && {
            max_tokens: config.maxTokens,
          }),
        }),
      });
    } catch (e) {
      if (e instanceof UnsafeUrlError) {
        throw new Error(`Bad request: ${e.message}`);
      }
      throw e;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Custom Gateway Error (${res.status}): ${err}`);
    }

    // Handle both SSE streaming responses and plain JSON
    const rawText = await res.text();
    let data: any;

    const contentType = res.headers.get('content-type') || '';

    if (
      contentType.includes('text/event-stream') ||
      rawText.startsWith('data:')
    ) {
      // Parse SSE stream - collect all chunks and assemble the full message
      const lines = rawText.split('\n');
      let fullContent = '';
      let usageData: any = null;

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const chunk = JSON.parse(jsonStr);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) fullContent += delta;
          // Some gateways include usage in the last chunk
          if (chunk.usage) usageData = chunk.usage;
        } catch {
          // Skip malformed SSE lines
        }
      }

      const tokens =
        usageData?.total_tokens || Math.ceil(fullContent.length / 4);
      const cost = tokens * 0.0000001;

      const parsedContent = this.extractJson(fullContent);
      return { content: parsedContent, usage: { tokens, cost } };
    } else {
      // Plain JSON response
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error(
          `Custom Gateway returned non-JSON response: ${rawText.slice(0, 200)}`
        );
      }

      const contentText = data.choices?.[0]?.message?.content || '';
      const tokens = data.usage?.total_tokens || 0;
      const cost = tokens * 0.0000001;

      const parsedContent = this.extractJson(contentText);
      return { content: parsedContent, usage: { tokens, cost } };
    }
  }

  private extractJson(text: string): Record<string, any> {
    if (!text) throw new Error('Custom Gateway returned an empty response.');

    let jsonStr = text.trim();

    // Strip markdown code fences
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(jsonStr);
    } catch {
      // If the AI returned a plain text response (not JSON), wrap it in the expected format
      // This handles cases where the model ignores the JSON instruction
      return { response: text.trim() };
    }
  }
}
