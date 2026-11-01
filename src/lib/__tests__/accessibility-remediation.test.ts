import fs from 'fs';
import path from 'path';

describe('Accessibility Remediation Verification (Phase 60)', () => {
  const navbarPath = path.resolve(
    process.cwd(),
    'src',
    'components',
    'layout',
    'Navbar.tsx'
  );

  it('ensures hamburger menu buttons declare complete accessible states and dialog controls', () => {
    const navbarSource = fs.readFileSync(navbarPath, 'utf-8');

    // 1. Accessible name and dialog popup state
    expect(navbarSource).toContain('aria-label="Open categories menu"');
    expect(navbarSource).toContain('aria-expanded={mobileMenuOpen}');
    expect(navbarSource).toContain('aria-controls="mobile-navigation-drawer"');
    expect(navbarSource).toContain('aria-haspopup="dialog"');

    // 2. Visible keyboard focus indicator
    expect(navbarSource).toContain(
      'focus-visible:ring-2 focus-visible:ring-gold-500'
    );
  });

  it('ensures mobile navigation drawer aside element matches the aria-controls id', () => {
    const navbarSource = fs.readFileSync(navbarPath, 'utf-8');

    expect(navbarSource).toContain('id="mobile-navigation-drawer"');
    expect(navbarSource).toContain('role="dialog"');
    expect(navbarSource).toContain('aria-modal="true"');
    expect(navbarSource).toContain('aria-label="Categories"');
  });

  it('ensures wallet link provides an explicit accessible name on both mobile and desktop viewports', () => {
    const navbarSource = fs.readFileSync(navbarPath, 'utf-8');

    // Wallet link must have explicit aria-label so screen readers do not announce empty link when text is hidden on mobile
    expect(navbarSource).toMatch(
      /href="\/account\/wallet"[\s\S]*?aria-label=\{`Wallet balance: ₹\$\{\(profile\?\.wallet_balance \?\? 0\)\.toLocaleString\('en-IN'\)\}`\}/
    );
    expect(navbarSource).toMatch(
      /href="\/account\/wallet"[\s\S]*?focus-visible:ring-2 focus-visible:ring-gold-500/
    );
  });

  it('ensures profile, login, and close buttons retain clear keyboard focus visible states (WCAG 2.4.7)', () => {
    const navbarSource = fs.readFileSync(navbarPath, 'utf-8');

    // User profile link
    expect(navbarSource).toMatch(
      /href="\/account"[\s\S]*?focus-visible:ring-2 focus-visible:ring-gold-500/
    );

    // Login link
    expect(navbarSource).toMatch(
      /href="\/login"[\s\S]*?focus-visible:ring-2 focus-visible:ring-gold-500/
    );

    // Close drawer button
    expect(navbarSource).toMatch(
      /className="[^"]*focus-visible:ring-2 focus-visible:ring-gold-500[^"]*"[\s\S]*?aria-label="Close menu"/
    );
  });

  it('ensures global stylesheet respects system prefers-reduced-motion settings (WCAG 2.2 / 2.3.3)', () => {
    const globalsCssPath = path.resolve(
      process.cwd(),
      'src',
      'app',
      'globals.css'
    );
    const globalsCss = fs.readFileSync(globalsCssPath, 'utf-8');

    expect(globalsCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(globalsCss).toContain('animation-duration: 0.01ms !important;');
    expect(globalsCss).toContain('.mascot-bob,');
    expect(globalsCss).toContain('.gold-shimmer,');
  });

  it('ensures product detail page wishlist and CTA actions declare aria-labels and focus rings', () => {
    const pdpPath = path.resolve(
      process.cwd(),
      'src',
      'app',
      'products',
      '[slug]',
      'ProductDetailPageClient.tsx'
    );
    const pdpSource = fs.readFileSync(pdpPath, 'utf-8');

    expect(pdpSource).toContain(
      "aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}"
    );
    expect(pdpSource).toContain('focus-visible:ring-gold-500');
  });

  it('ensures EmptyState component provides accessible focus visible indicator on action links', () => {
    const emptyStatePath = path.resolve(
      process.cwd(),
      'src',
      'components',
      'ui',
      'EmptyState.tsx'
    );
    const emptyStateSource = fs.readFileSync(emptyStatePath, 'utf-8');

    expect(emptyStateSource).toContain('focus-visible:ring-gold-500');
  });
});
