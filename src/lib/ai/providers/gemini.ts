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

    const model = this.genAI.getGenerativeModel({
      model: modelName || 'gemini-2.5-flash',
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
      // Estimate: Gemini 1.5 Flash is ~$0.075 per 1M tokens (0.000000075 per token)
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
}
