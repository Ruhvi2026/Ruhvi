import fs from 'fs';
import path from 'path';

describe('Supabase Migrations Integrity & Parity Audit (P1.1)', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  it('scans all migration files and ensures none are empty', () => {
    expect(files.length).toBeGreaterThanOrEqual(120);

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      expect(content.trim().length).toBeGreaterThan(0);
    }
  });

  it('identifies and confines duplicate prefixes strictly to the known 9 historical legacy pairs', () => {
    const prefixMap = new Map<string, string[]>();

    for (const file of files) {
      const match = file.match(/^(\d{4})_/);
      if (match) {
        const prefix = match[1];
        const existing = prefixMap.get(prefix) || [];
        existing.push(file);
        prefixMap.set(prefix, existing);
      }
    }

    const collisions: Record<string, string[]> = {};
    prefixMap.forEach((fileList, prefix) => {
      if (fileList.length > 1) {
        collisions[prefix] = fileList;
      }
    });

    const collisionPrefixes = Object.keys(collisions).sort();

    // The audit specifies exactly 9 historical duplicate prefixes:
    // 0009, 0010, 0011, 0019, 0020, 0031, 0041, 0042, 0043
    expect(collisionPrefixes).toEqual([
      '0009',
      '0010',
      '0011',
      '0019',
      '0020',
      '0031',
      '0041',
      '0042',
      '0043',
    ]);

    // Ensure no prefix has more than 2 files
    Object.values(collisions).forEach((fileList) => {
      expect(fileList.length).toBe(2);
    });
  });

  it('strictly enforces unique monotonic prefixes for all recent migrations (0110 through 0120+)', () => {
    const prefixMap = new Map<string, string[]>();

    for (const file of files) {
      const match = file.match(/^(\d{4})_/);
      if (match) {
        const prefixNum = parseInt(match[1], 10);
        if (prefixNum >= 110) {
          const prefix = match[1];
          const existing = prefixMap.get(prefix) || [];
          existing.push(file);
          prefixMap.set(prefix, existing);
        }
      }
    }

    // Verify 0110 through 0120 are each present exactly once
    for (let i = 110; i <= 120; i++) {
      const prefix = i.toString().padStart(4, '0');
      const matchingFiles = prefixMap.get(prefix) || [];
      expect(matchingFiles).toHaveLength(1);
    }

    // Ensure 0118, 0119, 0120 exist and are distinct
    expect(prefixMap.get('0118')![0]).toContain('0118_secure_wallet_topup.sql');
    expect(prefixMap.get('0119')![0]).toContain('0119_business_anomalies.sql');
    expect(prefixMap.get('0120')![0]).toContain(
      '0120_order_events_idempotency.sql'
    );
  });

  it('verifies hardened idempotency guards in 0041 and 0042 migration files', () => {
    const invAdj = fs.readFileSync(
      path.join(migrationsDir, '0041_inventory_adjustments.sql'),
      'utf8'
    );
    expect(invAdj).toContain(
      'CREATE TABLE IF NOT EXISTS public.inventory_adjustments'
    );
    expect(invAdj).toContain('DROP POLICY IF EXISTS');
    expect(invAdj).toContain(
      "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_adjustment_reason')"
    );

    const cms = fs.readFileSync(
      path.join(migrationsDir, '0042_homepage_cms.sql'),
      'utf8'
    );
    expect(cms).toContain('CREATE TABLE IF NOT EXISTS public.hero_slides');
    expect(cms).toContain(
      'DROP POLICY IF EXISTS "Public can view active hero slides"'
    );

    const promo = fs.readFileSync(
      path.join(migrationsDir, '0042_promotions_table.sql'),
      'utf8'
    );
    expect(promo).toContain('CREATE TABLE IF NOT EXISTS public.promotions');
    expect(promo).toContain(
      'DROP POLICY IF EXISTS "Public promotions are viewable by everyone"'
    );
  });
});
