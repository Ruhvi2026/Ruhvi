import { NextRequest } from 'next/server';
import { POST } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { analyzeJewelryImage } from '@/lib/ai/co-founder/vision';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/ai/co-founder/vision', () => ({
  analyzeJewelryImage: jest.fn(),
}));

describe('POST /api/admin/co-founder/vision/inspect (Step 9.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const req = new NextRequest('http://localhost/api/admin/co-founder/vision/inspect', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: 'https://example.com/ring.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when both imageUrl and imageBase64 are missing', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'admin-1',
      role: 'founder',
    });

    const req = new NextRequest('http://localhost/api/admin/co-founder/vision/inspect', {
      method: 'POST',
      body: JSON.stringify({ productNameHint: 'Ring' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Either imageUrl or imageBase64 is required');
  });

  it('invokes analyzeJewelryImage and returns 200 with analysis result', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'admin-1',
      role: 'founder',
    });

    (analyzeJewelryImage as jest.Mock).mockResolvedValue({
      success: true,
      productCategory: 'necklace',
      metalType: 'yellow_gold',
      estimatedKarat: '22K',
      craftsmanshipScore: 92,
      photoQuality: {
        overallScore: 90,
      },
      detectedFlaws: [],
    });

    const req = new NextRequest('http://localhost/api/admin/co-founder/vision/inspect', {
      method: 'POST',
      body: JSON.stringify({
        imageUrl: 'https://example.com/necklace.jpg',
        productNameHint: 'Bridal Choker',
        categoryHint: 'necklace',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.productCategory).toBe('necklace');
    expect(json.estimatedKarat).toBe('22K');
    expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
    expect(analyzeJewelryImage).toHaveBeenCalledWith({
      imageUrl: 'https://example.com/necklace.jpg',
      imageBase64: undefined,
      mimeType: undefined,
      productNameHint: 'Bridal Choker',
      categoryHint: 'necklace',
    });
  });

  it('returns 500 when analyzeJewelryImage throws an error', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'admin-1',
      role: 'founder',
    });

    (analyzeJewelryImage as jest.Mock).mockRejectedValue(
      new Error('Upstream vision inference crashed')
    );

    const req = new NextRequest('http://localhost/api/admin/co-founder/vision/inspect', {
      method: 'POST',
      body: JSON.stringify({ imageUrl: 'https://example.com/necklace.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Upstream vision inference crashed');
  });
});
