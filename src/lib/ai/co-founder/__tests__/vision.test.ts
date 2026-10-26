import {
  analyzeJewelryImage,
  extractBase64FromDataUrl,
  downloadImageAsBase64,
  JewelryVisualAnalysisResult,
} from '../vision';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../brain';
import { TOOL_PERMISSION_MAP } from '@/lib/ai/mcp-auth';
import { executeCoFounderTool } from '../tool-bridge';

// Mock dependencies
jest.mock('server-only', () => ({}));
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: () => ({
    from: jest.fn(),
  }),
}));

// Save original env
const originalEnv = process.env;

describe('Multimodal Vision Understanding Engine (Step 8.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Data & URL Helper Functions', () => {
    it('extracts base64 and mimeType from data URLs', () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = extractBase64FromDataUrl(dataUrl);

      expect(result.mimeType).toBe('image/png');
      expect(result.base64).toMatch(/^iVBORw0KGgo/);
    });

    it('extracts plain base64 without data URL prefix', () => {
      const plain = 'aGVsbG8gd29ybGQ=';
      const result = extractBase64FromDataUrl(plain);

      expect(result.mimeType).toBe('image/jpeg');
      expect(result.base64).toBe('aGVsbG8gd29ybGQ=');
    });

    it('handles empty or null data URL input gracefully', () => {
      const result = extractBase64FromDataUrl('');
      expect(result.base64).toBe('');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('downloads remote image and converts to base64 buffer', async () => {
      const fakeBytes = new Uint8Array([1, 2, 3, 4, 5]);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'image/webp' : null,
        },
        arrayBuffer: async () => fakeBytes.buffer,
      });

      const res = await downloadImageAsBase64(
        'https://example.com/jewelry.webp'
      );
      expect(res.mimeType).toBe('image/webp');
      expect(res.base64).toBe(Buffer.from(fakeBytes).toString('base64'));
    });

    it('throws error when remote image fetch fails with HTTP error', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        downloadImageAsBase64('https://example.com/missing.jpg')
      ).rejects.toThrow('Failed to fetch image: HTTP 404');
    });
  });

  describe('2. Image Validation & Heuristic Fallback', () => {
    it('returns error when neither URL nor base64 data is supplied', async () => {
      const res = await analyzeJewelryImage({});
      expect(res.success).toBe(false);
      expect(res.error).toBe('Missing image input');
      expect(res.summary).toContain('No image URL or base64 data');
    });

    it('handles remote image download failures gracefully', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Connection timed out'));

      const res = await analyzeJewelryImage({
        imageUrl: 'https://broken-cdn.com/product.jpg',
        productNameHint: 'Diamond Tennis Bracelet',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Connection timed out');
      expect(res.summary).toContain('Failed to download image from URL');
    });

    it('generates rich heuristic inspection when GEMINI_API_KEY is unset', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_LIVE_API_KEY;

      const res = await analyzeJewelryImage({
        imageBase64: 'fakebase64string==',
        productNameHint: '22K Gold Kundan Choker Necklace',
        categoryHint: 'necklace',
      });

      expect(res.success).toBe(true);
      expect(res.productCategory).toBe('necklace');
      expect(res.metalType).toBe('yellow_gold');
      expect(res.craftsmanshipScore).toBeGreaterThanOrEqual(90);
      expect(res.photoQuality.overallScore).toBeGreaterThanOrEqual(85);
      expect(res.visualTags).toContain('anti_tarnish');
      expect(res.summaryForVoice).toContain('necklace');
    });

    it('infers ring and white gold from product name hint in offline mode', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_LIVE_API_KEY;

      const res = await analyzeJewelryImage({
        imageBase64: 'fakebase64string==',
        productNameHint: 'Solitaire White Gold Diamond Engagement Ring',
      });

      expect(res.success).toBe(true);
      expect(res.productCategory).toBe('ring');
      expect(res.metalType).toBe('white_gold');
      expect(res.gemstones.length).toBeGreaterThan(0);
      expect(res.gemstones[0].settingType).toBe('prong');
    });
  });

  describe('3. Gemini Multimodal API Integration', () => {
    it('calls Gemini Multimodal API with inline image data and parses structured response', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const mockGeminiAnalysis: Partial<JewelryVisualAnalysisResult> = {
        productCategory: 'earrings',
        metalType: 'yellow_gold',
        estimatedKarat: '22K Gold Plated',
        craftsmanshipScore: 95,
        photoQuality: {
          lightingScore: 92,
          sharpnessScore: 98,
          backgroundContrastScore: 94,
          ecommerceComplianceScore: 96,
          overallScore: 95,
          issues: [],
        },
        gemstones: [
          {
            type: 'moissanite',
            cut: 'round_brilliant',
            settingType: 'halo',
            color: 'Colorless',
            apparentClarityGrade: 'VVS1',
          },
        ],
        detectedFlaws: [],
        visualTags: ['halo_earrings', 'bridal', 'high_polish'],
        marketDifferentiators: ['Precision micro-prong halo setting'],
        recommendations: ['Feature as hero item on festive collection'],
        summary: 'Exemplary craftsmanship with mirror-polished gold finish.',
        summaryForVoice: 'High quality halo earrings with score of 95.',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: `\`\`\`json\n${JSON.stringify(mockGeminiAnalysis)}\n\`\`\``,
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await analyzeJewelryImage({
        imageBase64:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
        productNameHint: 'Celestial Halo Stud Earrings',
      });

      expect(res.success).toBe(true);
      expect(res.productCategory).toBe('earrings');
      expect(res.metalType).toBe('yellow_gold');
      expect(res.craftsmanshipScore).toBe(95);
      expect(res.photoQuality.sharpnessScore).toBe(98);
      expect(res.gemstones[0].settingType).toBe('halo');
      expect(res.summaryForVoice).toBe(
        'High quality halo earrings with score of 95.'
      );

      // Check Gemini API payload structure
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-3.8-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mime_type":"image/png"'),
        })
      );
    });

    it('falls back to heuristic analysis when upstream Gemini API fails', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      // Mock failure for all 4 models
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const res = await analyzeJewelryImage({
        imageBase64: 'data:image/jpeg;base64,fakeimage',
        productNameHint: 'Silver Mangalsutra Pendant',
      });

      expect(res.success).toBe(true);
      expect(res.productCategory).toBe('pendant');
      expect(res.craftsmanshipScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('4. Tool Bridge & MCP Authorization Integration', () => {
    it('has analyze_product_image registered in CO_FOUNDER_TOOL_DECLARATIONS', () => {
      const tool = CO_FOUNDER_TOOL_DECLARATIONS.find(
        (t) => t.name === 'analyze_product_image'
      );
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('multimodal AI vision inspection');
      expect(tool?.parameters?.properties?.image_url).toBeDefined();
      expect(tool?.parameters?.properties?.image_base64).toBeDefined();
    });

    it('has analyze_product_image mapped in TOOL_PERMISSION_MAP', () => {
      const mapping = TOOL_PERMISSION_MAP['analyze_product_image'];
      expect(mapping).toBeDefined();
      expect(mapping.module).toBe('analytics');
      expect(mapping.action).toBe('read');
    });

    it('executes analyze_product_image via executeCoFounderTool bridge', async () => {
      const scopes = ['analytics:read', 'orders:read'];

      const result = await executeCoFounderTool(
        'analyze_product_image',
        {
          image_base64: 'fakebase64==',
          product_name_hint: '22K Anti-Tarnish Gold Bangle',
        },
        scopes
      );

      expect(result.toolName).toBe('analyze_product_image');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.productCategory).toBe('bangle');
      expect(result.summaryForVoice).toBeDefined();
    });
  });
});
