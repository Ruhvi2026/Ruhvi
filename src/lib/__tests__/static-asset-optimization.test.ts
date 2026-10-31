import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

describe('Static Image Asset Optimization (Phase 56)', () => {
  const publicDir = path.resolve(process.cwd(), 'public');

  describe('RuhChat Launcher Icon (ruhchat-icon.png & ruhchat-icon.webp)', () => {
    const pngPath = path.join(publicDir, 'ruhchat-icon.png');
    const webpPath = path.join(publicDir, 'ruhchat-icon.webp');
    const origPath = path.join(publicDir, 'ruhchat-icon.orig.png');

    it('preserves an original backup for safe recovery', () => {
      expect(fs.existsSync(origPath)).toBe(true);
      const origSize = fs.statSync(origPath).size;
      expect(origSize).toBe(550005);
    });

    it('ensures optimized PNG transfer size is reduced by >95%', async () => {
      expect(fs.existsSync(pngPath)).toBe(true);
      const pngSize = fs.statSync(pngPath).size;
      // Original was 550,005 bytes; optimized should be <= 20,000 bytes (~13.2 KB)
      expect(pngSize).toBeLessThanOrEqual(20000);
      expect(pngSize).toBeGreaterThan(5000);

      const metadata = await sharp(pngPath).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
    });

    it('provides modern ultra-fast WebP alternative under 5KB', async () => {
      expect(fs.existsSync(webpPath)).toBe(true);
      const webpSize = fs.statSync(webpPath).size;
      // WebP should be <= 5,000 bytes (~3.2 KB)
      expect(webpSize).toBeLessThanOrEqual(5000);
      expect(webpSize).toBeGreaterThan(1000);

      const metadata = await sharp(webpPath).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
    });
  });

  describe('Admin Login Illustration (admin-login.png & admin-login.webp)', () => {
    const pngPath = path.join(publicDir, 'images', 'admin-login.png');
    const webpPath = path.join(publicDir, 'images', 'admin-login.webp');
    const origPath = path.join(publicDir, 'images', 'admin-login.orig.png');

    it('preserves original fallback for recovery', () => {
      expect(fs.existsSync(origPath)).toBe(true);
    });

    it('ensures admin login illustration payload is significantly reduced', async () => {
      expect(fs.existsSync(pngPath)).toBe(true);
      const pngSize = fs.statSync(pngPath).size;
      // Original was 286,157 bytes; optimized PNG should be <= 120,000 bytes
      expect(pngSize).toBeLessThanOrEqual(120000);
    });

    it('ensures admin login WebP asset is under 25KB', async () => {
      expect(fs.existsSync(webpPath)).toBe(true);
      const webpSize = fs.statSync(webpPath).size;
      expect(webpSize).toBeLessThanOrEqual(25000);

      const metadata = await sharp(webpPath).metadata();
      expect(metadata.format).toBe('webp');
    });
  });
});
