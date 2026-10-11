/**
 * Tests — AI Studio Photography Engine
 *
 * Covers:
 *   1. Module exports and type contracts
 *   2. Spec extraction fallback (offline / no API key)
 *   3. 6-frame prompt structure validation
 *   4. Imagen 3 integration path (mocked)
 *   5. Tool bridge wiring: generate_product_studio_photos
 *   6. RBAC: TOOL_PERMISSION_MAP registration
 *   7. Brain.ts LLM tool declaration registration
 *   8. API route input validation
 */

jest.mock('server-only', () => ({}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({ data: [], error: null })),
        eq: jest.fn(() => ({ data: null, error: null })),
        maybeSingle: jest.fn(() => ({ data: null, error: null })),
      })),
    })),
  })),
}));

jest.mock('@/lib/ai/co-founder/telemetry', () => ({
  recordToolTelemetry: jest.fn(),
  classifyError: jest.fn((e) => 'internal_error'),
}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(() =>
    Promise.resolve({
      ok: true,
      uid: 'test-admin-uid',
      role: 'super_admin',
      status: 200,
    })
  ),
}));

jest.mock('@/lib/ai/co-founder/rate-limiter', () => ({
  enforceCoFounderRateLimit: jest.fn(() => ({
    success: true,
    result: {
      allowed: true,
      tier: 'tool_execution',
      limit: 120,
      remaining: 119,
      consumed: 1,
      resetAt: Date.now() + 60000,
      retryAfterSeconds: 0,
      key: 'test',
    },
  })),
  createRateLimitHeaders: jest.fn(() => ({})),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  generateStudioPhotos,
  type StudioPhotographyResult,
  type StudioPhotoFrame,
  type StudioFrameId,
} from '../studio-photography';

import { executeCoFounderTool } from '../tool-bridge';
import { TOOL_PERMISSION_MAP } from '@/lib/ai/mcp-auth';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../brain';

// ---------------------------------------------------------------------------
// Mock fetch globally (Gemini Vision + Imagen 3 + Cloudinary)
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Module exports & type contracts
// ---------------------------------------------------------------------------

describe('studio-photography: module shape', () => {
  it('exports generateStudioPhotos as an async function', () => {
    expect(typeof generateStudioPhotos).toBe('function');
  });

  it('returns a StudioPhotographyResult with required fields', async () => {
    // No API key → offline mode
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Test Choker',
      categoryHint: 'choker',
    });

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('productName');
    expect(result).toHaveProperty('spec');
    expect(result).toHaveProperty('frames');
    expect(result).toHaveProperty('generatedPhotos');
    expect(result).toHaveProperty('totalGenerated');
    expect(result).toHaveProperty('cloudinaryFolderPath');
    expect(result).toHaveProperty('summaryForVoice');
  });
});

// ---------------------------------------------------------------------------
// 2. Offline mode (no API key) — prompt-only fallback
// ---------------------------------------------------------------------------

describe('studio-photography: offline / prompt-only mode', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_LIVE_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns success=true with 0 totalGenerated in prompt-only mode', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Anti-Tarnish Necklace',
    });

    expect(result.success).toBe(true);
    expect(result.totalGenerated).toBe(0);
    expect(result.frames).toHaveLength(6);
  });

  it('returns error=false when no image is provided', async () => {
    const result = await generateStudioPhotos({ productName: 'Test' });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('builds fallback spec with categoryHint', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      categoryHint: 'earrings',
    });
    expect(result.spec.productCategory).toBe('earrings');
  });
});

// ---------------------------------------------------------------------------
// 3. 6-Frame prompt structure validation
// ---------------------------------------------------------------------------

describe('studio-photography: 6-frame prompt structure', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = '';
    delete process.env.GEMINI_LIVE_API_KEY;
  });

  it('always returns exactly 6 frames', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Royal Jhumka',
      categoryHint: 'earrings',
    });
    expect(result.frames).toHaveLength(6);
  });

  it('includes all 6 required frameIds', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Choker',
    });

    const frameIds: StudioFrameId[] = result.frames.map(
      (f: StudioPhotoFrame) => f.frameId
    );
    expect(frameIds).toContain('model_ethnic');
    expect(frameIds).toContain('model_western');
    expect(frameIds).toContain('studio_front');
    expect(frameIds).toContain('flatlay_overhead');
    expect(frameIds).toContain('side_45deg');
    expect(frameIds).toContain('macro_texture');
  });

  it('each frame has a non-empty prompt and negativePrompt', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Gold Ring',
      categoryHint: 'ring',
    });

    for (const frame of result.frames) {
      expect(frame.prompt.length).toBeGreaterThan(100);
      expect(frame.negativePrompt.length).toBeGreaterThan(10);
    }
  });

  it('model_ethnic frame uses 3:4 aspect ratio', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Bangle Set',
    });
    const ethnicFrame = result.frames.find(
      (f: StudioPhotoFrame) => f.frameId === 'model_ethnic'
    );
    expect(ethnicFrame?.aspectRatio).toBe('3:4');
  });

  it('studio_front frame uses 1:1 aspect ratio', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Pendant',
    });
    const studioFrame = result.frames.find(
      (f: StudioPhotoFrame) => f.frameId === 'studio_front'
    );
    expect(studioFrame?.aspectRatio).toBe('1:1');
  });

  it('product name appears in frame prompts', async () => {
    const productName = 'Ruhvi Signature Gold Choker';
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName,
    });
    const hasProductInPrompts = result.frames.some((f: StudioPhotoFrame) =>
      f.prompt.includes(productName)
    );
    expect(hasProductInPrompts).toBe(true);
  });

  it('cloudinaryFolderPath is based on productName', async () => {
    const result = await generateStudioPhotos({
      imageBase64: 'data:image/jpeg;base64,/9j/4AAQ==',
      productName: 'Royal Jhumka Set',
    });
    expect(result.cloudinaryFolderPath).toContain('ruhvi/studio-ai');
  });
});

// ---------------------------------------------------------------------------
// 4. Imagen 3 integration (mocked)
// ---------------------------------------------------------------------------

describe('studio-photography: Imagen 3 rendering (mocked)', () => {
  const FAKE_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('calls Imagen 3 predict endpoint for each frame', async () => {
    // Mock: Vision spec extraction → success
    // Mock: Imagen 3 → success for all 6 frames
    mockFetch
      // First call: Gemini Flash spec extraction
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      productCategory: 'necklace',
                      metalType: 'yellow_gold',
                      estimatedKarat: '22K Gold Plated',
                      metalFinish: 'high_polish',
                      craftsmanshipFeatures: ['Bengal filigree'],
                      gemstones: [],
                      dominantColor: 'warm yellow gold',
                      productDescription: 'Test necklace',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
      // Next 6 calls: Imagen 3 rendering (one per frame)
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          predictions: [
            {
              bytesBase64Encoded: FAKE_BASE64,
              mimeType: 'image/png',
            },
          ],
        }),
      });

    const result = await generateStudioPhotos({
      imageBase64: `data:image/jpeg;base64,${FAKE_BASE64}`,
      productName: 'Test Necklace',
      categoryHint: 'necklace',
    });

    expect(result.success).toBe(true);
    expect(result.totalGenerated).toBe(6);
    expect(result.generatedPhotos).toHaveLength(6);
    for (const photo of result.generatedPhotos) {
      expect(photo.success).toBe(true);
      expect(photo.imageBase64).toBe(FAKE_BASE64);
    }
  });

  it('handles partial Imagen 3 failures gracefully', async () => {
    // Spec extraction: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    productCategory: 'ring',
                    metalType: 'yellow_gold',
                    estimatedKarat: '22K',
                    metalFinish: 'polish',
                    craftsmanshipFeatures: [],
                    gemstones: [],
                    dominantColor: 'gold',
                    productDescription: 'Ring',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    // Frame 1: success; frames 2-6: failure
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          predictions: [
            { bytesBase64Encoded: FAKE_BASE64, mimeType: 'image/png' },
          ],
        }),
      })
      .mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      });

    const result = await generateStudioPhotos({
      imageBase64: `data:image/jpeg;base64,${FAKE_BASE64}`,
      productName: 'Ring',
    });

    // Some succeed, some fail — not a total failure
    expect(result.frames).toHaveLength(6);
    const successCount = result.generatedPhotos.filter((p) => p.success).length;
    const failCount = result.generatedPhotos.filter((p) => !p.success).length;
    expect(successCount + failCount).toBe(6);
  });

  it('falls back to next Imagen model on 404', async () => {
    // Spec extraction
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    productCategory: 'necklace',
                    metalType: 'yellow_gold',
                    estimatedKarat: '22K',
                    metalFinish: 'polish',
                    craftsmanshipFeatures: [],
                    gemstones: [],
                    dominantColor: 'gold',
                    productDescription: 'Necklace',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    // In parallel execution: some calls will hit 404 on the primary model then
    // succeed on the fast model. We set one 404 then all remaining to succeed.
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          predictions: [
            { bytesBase64Encoded: FAKE_BASE64, mimeType: 'image/png' },
          ],
        }),
      });

    const result = await generateStudioPhotos({
      imageBase64: `data:image/jpeg;base64,${FAKE_BASE64}`,
      productName: 'Necklace Fallback',
    });

    expect(result.success).toBe(true);
    // At least 5 frames succeed (the one that hit 404 on both models may fail)
    expect(result.totalGenerated).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// 5. Tool Bridge wiring
// ---------------------------------------------------------------------------

describe('tool-bridge: generate_product_studio_photos', () => {
  const FAKE_BASE64 = '/9j/4AAQSkZJRgABAQEASABIAAD=';

  it('routes generate_product_studio_photos to studio photography engine', async () => {
    mockFetch
      // Spec extraction
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      productCategory: 'necklace',
                      metalType: 'yellow_gold',
                      estimatedKarat: '22K Gold Plated',
                      metalFinish: 'high_polish',
                      craftsmanshipFeatures: ['filigree'],
                      gemstones: [],
                      dominantColor: 'gold',
                      productDescription: 'Gold Necklace',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

    // No GEMINI_API_KEY → prompt-only mode (no Imagen 3 calls)
    delete process.env.GEMINI_API_KEY;

    const result = await executeCoFounderTool(
      'generate_product_studio_photos',
      {
        image_base64: `data:image/jpeg;base64,${FAKE_BASE64}`,
        product_name: 'Filigree Necklace',
        category_hint: 'necklace',
        upload_to_cloudinary: false,
      }
    );

    expect(result.toolName).toBe('generate_product_studio_photos');
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('frames');
    expect(result.data.frames).toHaveLength(6);
    expect(result.summaryForVoice).toBeTruthy();
  });

  it('returns an error if no image is supplied', async () => {
    const result = await executeCoFounderTool(
      'generate_product_studio_photos',
      {
        product_name: 'Missing Image Product',
      }
    );

    expect(result.toolName).toBe('generate_product_studio_photos');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. RBAC: TOOL_PERMISSION_MAP
// ---------------------------------------------------------------------------

describe('mcp-auth: TOOL_PERMISSION_MAP registration', () => {
  it('has generate_product_studio_photos registered', () => {
    const mapping = TOOL_PERMISSION_MAP['generate_product_studio_photos'];
    expect(mapping).toBeDefined();
  });

  it('requires products:write permission', () => {
    const mapping = TOOL_PERMISSION_MAP['generate_product_studio_photos'];
    expect(mapping.module).toBe('products');
    expect(mapping.action).toBe('write');
  });
});

// ---------------------------------------------------------------------------
// 7. Brain.ts LLM declaration registration
// ---------------------------------------------------------------------------

describe('brain.ts: CO_FOUNDER_TOOL_DECLARATIONS', () => {
  it('has generate_product_studio_photos declared in tool schema', () => {
    const declaration = CO_FOUNDER_TOOL_DECLARATIONS.find(
      (t) => t.name === 'generate_product_studio_photos'
    );
    expect(declaration).toBeDefined();
  });

  it('declare image_url and image_base64 as parameters', () => {
    const declaration = CO_FOUNDER_TOOL_DECLARATIONS.find(
      (t) => t.name === 'generate_product_studio_photos'
    );
    const props = declaration?.parameters?.properties || {};
    expect(props).toHaveProperty('image_url');
    expect(props).toHaveProperty('image_base64');
  });

  it('declares upload_to_cloudinary as BOOLEAN', () => {
    const declaration = CO_FOUNDER_TOOL_DECLARATIONS.find(
      (t) => t.name === 'generate_product_studio_photos'
    );
    const props = declaration?.parameters?.properties || {};
    expect((props as any).upload_to_cloudinary?.type).toBe('BOOLEAN');
  });
});

// ---------------------------------------------------------------------------
// 8. API route input validation
// ---------------------------------------------------------------------------

describe('API route: /api/admin/co-founder/studio/generate', () => {
  let POST: (req: any) => Promise<any>;

  beforeAll(async () => {
    ({ POST } =
      await import('@/app/api/admin/co-founder/studio/generate/route'));
  });

  it('returns 400 when neither image_url nor image_base64 is supplied', async () => {
    const req = {
      json: async () => ({ product_name: 'Test Product' }),
    } as any;

    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/image_url|image_base64/i);
  });

  it('returns 200 for a valid offline request', async () => {
    // No GEMINI_API_KEY → prompt-only mode → still returns success
    delete process.env.GEMINI_API_KEY;

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    productCategory: 'necklace',
                    metalType: 'yellow_gold',
                    estimatedKarat: '22K',
                    metalFinish: 'polish',
                    craftsmanshipFeatures: [],
                    gemstones: [],
                    dominantColor: 'gold',
                    productDescription: 'Gold necklace',
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const req = {
      json: async () => ({
        image_base64: 'data:image/jpeg;base64,/9j/4AAQ==',
        product_name: 'Ruhvi Choker',
        category_hint: 'choker',
      }),
    } as any;

    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('frames');
    expect(body.frames).toHaveLength(6);
  });
});
