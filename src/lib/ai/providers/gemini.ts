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
    if (!modelName || modelName === 'gemini-2.5-flash') {
      return 'gemini-3.5-flash-lite';
    }
    return modelName;
  }

  async generateStructuredProductContent(
    prompt: string,
    modelName: string
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
    tools: import('../tools/index').AITool[]
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
