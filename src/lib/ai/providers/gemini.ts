import { AIProvider } from '../index';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI | null = null;

  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private resolveModelName(modelName?: string): string {
    if (!modelName) return 'gemini-3.5-flash';

    // Current active models
    const ACTIVE_MODELS = [
      'gemini-3.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];
    if (ACTIVE_MODELS.includes(modelName)) {
      return modelName;
    }

    // Map deprecated, removed, or non-existent model names to current equivalents
    const MODEL_ALIASES: Record<string, string> = {
      'gemini-pro-latest': 'gemini-1.5-pro',
      'gemini-1.5-pro-latest': 'gemini-1.5-pro',
      'gemini-3.5-flash-lite': 'gemini-3.5-flash',
    };

    return MODEL_ALIASES[modelName] || 'gemini-3.5-flash';
  }

  async generateStructuredProductContent(
    prompt: string,
    modelName: string,
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<{
    content: Record<string, any>;
    usage: { tokens: number; cost: number };
  }> {
    if (!this.genAI) {
      throw new Error('Gemini provider is not initialized. Check the API key.');
    }

    const effectiveModel = this.resolveModelName(modelName);
    const model = this.genAI.getGenerativeModel({
      model: effectiveModel,
      generationConfig: {
        responseMimeType: 'application/json',
        ...(config?.temperature !== undefined && {
          temperature: config.temperature,
        }),
        ...(config?.maxTokens !== undefined && {
          maxOutputTokens: config.maxTokens,
        }),
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const usageMetadata = response.usageMetadata;
      const tokens = usageMetadata?.totalTokenCount || 0;
      // Estimate: Gemini Flash Lite is ~$0.075 per 1M tokens (0.000000075 per token)
      const cost = tokens * 0.000000075;

      return {
        content: JSON.parse(text),
        usage: { tokens, cost },
      };
    } catch (error: any) {
      console.error('Gemini API generation failed:', error);
      throw new Error(`AI Generation failed: ${error.message}`);
    }
  }

  async generateWithTools(
    prompt: string,
    modelName: string,
    tools: import('../tools/index').AITool[],
    config?: { temperature?: number; maxTokens?: number }
  ): Promise<{
    content: string;
    toolCalls?: any[];
    usage: { tokens: number; cost: number };
  }> {
    if (!this.genAI) {
      throw new Error('Gemini provider is not initialized.');
    }

    // Convert our AITool interface to Gemini FunctionDeclarations
    const geminiTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters as any, // simplified conversion for schema
    }));

    const effectiveModel = this.resolveModelName(modelName);
    const model = this.genAI.getGenerativeModel({
      model: effectiveModel,
      tools: [{ functionDeclarations: geminiTools }],
      generationConfig: {
        ...(config?.temperature !== undefined && {
          temperature: config.temperature,
        }),
        ...(config?.maxTokens !== undefined && {
          maxOutputTokens: config.maxTokens,
        }),
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;

      const functionCalls = response.functionCalls();
      const text = response.text();

      const usageMetadata = response.usageMetadata;
      const tokens = usageMetadata?.totalTokenCount || 0;
      const cost = tokens * 0.000000075;

      return {
        content: text,
        toolCalls: functionCalls,
        usage: { tokens, cost },
      };
    } catch (error: any) {
      console.error('Gemini API tool generation failed:', error);
      throw new Error(`AI Tool Generation failed: ${error.message}`);
    }
  }
}
