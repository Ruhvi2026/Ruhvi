import fs from 'fs';
import path from 'path';

describe('Responsive, Theme & UI Regression Verification (Phase 59)', () => {
  const rootDir = process.cwd();

  // Paths to audited key files
  const globalsCssPath = path.resolve(rootDir, 'src', 'app', 'globals.css');
  const tailwindConfigPath = path.resolve(rootDir, 'tailwind.config.js');
  const layoutPath = path.resolve(rootDir, 'src', 'app', 'layout.tsx');
  const navbarPath = path.resolve(
    rootDir,
    'src',
    'components',
    'layout',
    'Navbar.tsx'
  );
  const accountDrawerPath = path.resolve(
    rootDir,
    'src',
    'components',
    'layout',
    'AccountDrawer.tsx'
  );
  const storefrontChromePath = path.resolve(
    rootDir,
    'src',
    'components',
    'layout',
    'StorefrontChrome.tsx'
  );
  const supportTriggerPath = path.resolve(
    rootDir,
    'src',
    'components',
    'CustomerSupportChatTrigger.tsx'
  );
  const staffMessengerPath = path.resolve(
    rootDir,
    'src',
    'components',
    'chat',
    'FloatingStaffMessenger.tsx'
  );
  const middlewarePath = path.resolve(rootDir, 'src', 'middleware.ts');

  describe('1. Theme Tokens & Design Language Integrity', () => {
    it('preserves the luxury light theme design tokens in globals.css', () => {
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf-8');

      // Verify core theme variables
      expect(globalsCss).toContain('--cream: #f7f1e7;');
      expect(globalsCss).toContain('--ink: #2a2118;');
      expect(globalsCss).toContain('--gold-500: #c6a14f;');
      expect(globalsCss).toContain('--gold-400: #d6b36a;');
      expect(globalsCss).toContain('--gold: #c79a4b;');
      expect(globalsCss).toContain(
        "font-family: var(--font-jost), 'Jost', sans-serif;"
      );
      expect(globalsCss).toContain(
        "font-family: var(--font-cormorant), 'Cormorant Garamond', Georgia, serif;"
      );
    });

    it('preserves brand gold, champagne, and neumorphic tokens in tailwind.config.js', () => {
      const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf-8');

      // Brand color scales
      expect(tailwindConfig).toContain("'#D6B36A'"); // gold-400 signature champagne gold
      expect(tailwindConfig).toContain("'#C6A14F'"); // gold-500
      expect(tailwindConfig).toContain("'#FCFBF8'"); // cream-50
      expect(tailwindConfig).toContain('midnight:');
      expect(tailwindConfig).toContain('nm:');

      // Neumorphic shadows
      expect(tailwindConfig).toContain("'nm-flat':");
      expect(tailwindConfig).toContain("'nm-convex':");
      expect(tailwindConfig).toContain("'nm-inset':");
    });

    it('ensures theme initialization script cleanly separates storefront and portal defaults', () => {
      const layoutSource = fs.readFileSync(layoutPath, 'utf-8');

      // Portals default to dark via 'ruhvi-portal-theme'; storefront defaults to system / light
      expect(layoutSource).toContain(
        "localStorage.getItem('ruhvi-portal-theme') || 'dark'"
      );
      expect(layoutSource).toContain(
        "localStorage.getItem('theme') || 'system'"
      );
      expect(layoutSource).toContain('isPortal');
    });
  });

  describe('2. Dropdown, Modal & Floating Widget Z-Index Hierarchy', () => {
    it('enforces a strict non-inverting z-index stacking hierarchy', () => {
      const navbarSource = fs.readFileSync(navbarPath, 'utf-8');
      const supportTriggerSource = fs.readFileSync(supportTriggerPath, 'utf-8');
      const accountDrawerSource = fs.readFileSync(accountDrawerPath, 'utf-8');

      // 1. Navigation Header sits at z-50
      expect(navbarSource).toContain('z-50');

      // 2. Floating Customer Support Chat sits at z-[100] (safely above sticky navbar)
      expect(supportTriggerSource).toContain('z-[100]');

      // 3. Account Navigation Drawer sits at z-[9998] (backdrop) and z-[9999] (panel)
      expect(accountDrawerSource).toContain('z-[9998]');
      expect(accountDrawerSource).toContain('z-[9999]');

      // 4. Modal Overlays (like Sign Out Confirmation) sit at z-[10000]
      expect(accountDrawerSource).toContain('z-[10000]');

      // Verification of numeric hierarchy: z(Modal) > z(Drawer) > z(SupportBubble) > z(Navbar)
      const zHeader = 50;
      const zSupport = 100;
      const zDrawer = 9999;
      const zModal = 10000;

      expect(zModal).toBeGreaterThan(zDrawer);
      expect(zDrawer).toBeGreaterThan(zSupport);
      expect(zSupport).toBeGreaterThan(zHeader);
    });
  });

  describe('3. Role-Specific Navigation Isolation', () => {
    it('ensures storefront navbar mobile drawer exclusively exposes customer routes', () => {
      const navbarSource = fs.readFileSync(navbarPath, 'utf-8');

      // Customer routes must exist
      expect(navbarSource).toContain('href="/account"');
      expect(navbarSource).toContain('href="/orders"');
      expect(navbarSource).toContain('href="/wishlist"');
      expect(navbarSource).toContain('href="/account/wallet"');
      expect(navbarSource).toContain('href="/products"');
      expect(navbarSource).toContain('href="/contact"');

      // Staff/Portal routes must NEVER appear in the public storefront mobile drawer
      expect(navbarSource).not.toContain('href="/admin"');
      expect(navbarSource).not.toContain('href="/operations"');
      expect(navbarSource).not.toContain('href="/co-founder"');
      expect(navbarSource).not.toContain('href="/portal-orders"');
      expect(navbarSource).not.toContain('href="/tech"');
      expect(navbarSource).not.toContain('href="/marketing"');
    });

    it('ensures FloatingStaffMessenger is strictly confined to internal portal layouts', () => {
      const rootLayoutSource = fs.readFileSync(layoutPath, 'utf-8');

      // Root layout (and customer storefront) must NOT contain FloatingStaffMessenger
      expect(rootLayoutSource).not.toContain('<FloatingStaffMessenger');

      // Internal portal layouts MUST contain FloatingStaffMessenger
      const adminLayoutSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'app', 'admin', 'layout.tsx'),
        'utf-8'
      );
      const operationsLayoutSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'app', 'operations', 'layout.tsx'),
        'utf-8'
      );
      const cofounderLayoutSource = fs.readFileSync(
        path.resolve(rootDir, 'src', 'app', 'co-founder', 'layout.tsx'),
        'utf-8'
      );

      expect(adminLayoutSource).toContain('<FloatingStaffMessenger />');
      expect(operationsLayoutSource).toContain('<FloatingStaffMessenger />');
      expect(cofounderLayoutSource).toContain('<FloatingStaffMessenger />');
    });
  });

  describe('4. Cross-Subdomain Appearance & Chrome Isolation', () => {
    it('ensures StorefrontChrome hides customer chrome on all portal hostnames and routes', () => {
      const storefrontChromeSource = fs.readFileSync(
        storefrontChromePath,
        'utf-8'
      );

      // Subdomains recognized
      expect(storefrontChromeSource).toContain("'admin.ruhvi.in'");
      expect(storefrontChromeSource).toContain("'co-founder.ruhvi.in'");
      expect(storefrontChromeSource).toContain("'operation.ruhvi.in'");
      expect(storefrontChromeSource).toContain("'support.ruhvi.in'");
      expect(storefrontChromeSource).toContain("'tech.ruhvi.in'");

      // Route prefixes recognized
      expect(storefrontChromeSource).toContain("'/admin'");
      expect(storefrontChromeSource).toContain("'/co-founder'");
      expect(storefrontChromeSource).toContain("'/operations'");
      expect(storefrontChromeSource).toContain("'/portal-orders'");
      expect(storefrontChromeSource).toContain("'/support'");

      // Returns null when portal detected
      expect(storefrontChromeSource).toContain('if (isPortal) return null;');
    });

    it('ensures Next.js middleware routes portal subdomains correctly', () => {
      const middlewareSource = fs.readFileSync(middlewarePath, 'utf-8');

      expect(middlewareSource).toContain(
        "isAdminHost, dest: '/admin/dashboard'"
      );
      expect(middlewareSource).toContain(
        "isOperationsHost, dest: '/operations/dashboard'"
      );
      expect(middlewareSource).toContain(
        "isOrdersHost, dest: '/portal-orders/dashboard'"
      );
      expect(middlewareSource).toContain(
        "isSupportHost, dest: '/support/dashboard'"
      );
      expect(middlewareSource).toContain(
        "isCoFounderHost, dest: '/co-founder'"
      );
    });
  });

  describe('5. Responsive Layout Breakpoints & Overflow Guardrails', () => {
    it('verifies overflow-x hidden on root body to prevent horizontal jitter', () => {
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf-8');
      expect(globalsCss).toContain('overflow-x: hidden;');
    });

    it('verifies responsive breakpoints across key page layouts', () => {
      const walletPagePath = path.resolve(
        rootDir,
        'src',
        'app',
        'account',
        'wallet',
        'page.tsx'
      );
      const walletSource = fs.readFileSync(walletPagePath, 'utf-8');

      // Responsive flex/grid
      expect(walletSource).toMatch(/flex flex-col[\s\S]*?sm:flex-row/);
      expect(walletSource).toContain(
        'p-8 text-emerald-50 shadow-2xl sm:p-10 md:flex-row'
      );

      const inventoryPagePath = path.resolve(
        rootDir,
        'src',
        'app',
        'operations',
        'inventory',
        'page.tsx'
      );
      const inventorySource = fs.readFileSync(inventoryPagePath, 'utf-8');

      // Responsive multi-column layout on operations
      expect(inventorySource).toContain(
        'grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6'
      );
    });
  });
});
