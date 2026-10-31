import fs from 'fs';
import path from 'path';

describe('Homepage LCP Image Delivery & Responsive Preload Alignment (Phase 58)', () => {
  const pagePath = path.resolve(process.cwd(), 'src', 'app', 'page.tsx');
  const layoutPath = path.resolve(process.cwd(), 'src', 'app', 'layout.tsx');

  it('ensures homepage hero preloads are strictly aligned with picture media queries', () => {
    const pageSource = fs.readFileSync(pagePath, 'utf-8');

    // 1. Mobile preload
    expect(pageSource).toContain('href={heroMobileUrl}');
    expect(pageSource).toContain('media="(max-width: 640px)"');

    // 2. Tablet preload (resolves the tablet double-download conflict)
    expect(pageSource).toContain('href={heroTabletUrl}');
    expect(pageSource).toContain(
      'media="(min-width: 641px) and (max-width: 1024px)"'
    );

    // 3. Desktop preload
    expect(pageSource).toContain('href={heroDesktopUrl}');
    expect(pageSource).toContain('media="(min-width: 1025px)"');

    // 4. Verify fetchPriority="high" on preloads
    expect(pageSource).toMatch(
      /href=\{heroMobileUrl\}[\s\S]*?fetchPriority="high"/
    );
    expect(pageSource).toMatch(
      /href=\{heroTabletUrl\}[\s\S]*?fetchPriority="high"/
    );
    expect(pageSource).toMatch(
      /href=\{heroDesktopUrl\}[\s\S]*?fetchPriority="high"/
    );
  });

  it('ensures picture element maintains exact matching media breakpoints', () => {
    const pageSource = fs.readFileSync(pagePath, 'utf-8');

    expect(pageSource).toContain(
      '<source media="(max-width: 640px)" srcSet={heroMobileUrl} />'
    );
    expect(pageSource).toContain(
      '<source media="(max-width: 1024px)" srcSet={heroTabletUrl} />'
    );
    expect(pageSource).toContain('src={heroDesktopUrl}');
    expect(pageSource).toContain('fetchPriority="high"');
    expect(pageSource).toContain('loading="eager"');
    expect(pageSource).toContain('decoding="async"');
  });

  it('ensures layout preconnect to Cloudinary includes crossOrigin for socket reuse', () => {
    const layoutSource = fs.readFileSync(layoutPath, 'utf-8');

    expect(layoutSource).toMatch(
      /href="https:\/\/res\.cloudinary\.com"[\s\S]*?crossOrigin="anonymous"/
    );
  });
});
