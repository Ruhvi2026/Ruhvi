jest.mock('server-only', () => ({}));

import { createAndUploadFile } from '../file-generator';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../brain';

describe('File Creation & Sharing Capability (Co-Founder & AI Workers)', () => {
  it('registers create_and_share_file tool declaration in brain.ts', () => {
    const tool = CO_FOUNDER_TOOL_DECLARATIONS.find(
      (t) => t.name === 'create_and_share_file'
    );
    expect(tool).toBeDefined();
    expect(tool?.parameters?.properties?.file_name).toBeDefined();
    expect(tool?.parameters?.properties?.file_type).toBeDefined();
    expect(tool?.parameters?.properties?.content).toBeDefined();
  });

  it('generates a valid Markdown (.md) file with correct metadata and preview', async () => {
    const result = await createAndUploadFile({
      file_name: 'Diwali_Marketing_Plan.md',
      file_type: 'markdown',
      title: 'Diwali 2026 Marketing Strategy',
      content:
        '# Diwali Strategy\n\n1. Gold Coins launch\n2. Silver Pooja thali bundle',
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('Diwali_Marketing_Plan.md');
    expect(result.fileType).toBe('markdown');
    expect(result.mimeType).toContain('markdown');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.fileUrl).toBeDefined();
    expect(result.contentPreview).toContain('Diwali Strategy');
  });

  it('generates a valid HTML (.html) file with rich markup', async () => {
    const result = await createAndUploadFile({
      file_name: 'Store_Catalog_Report.html',
      file_type: 'html',
      title: 'Store Performance HTML Dashboard',
      content:
        '<!DOCTYPE html><html><body><h1>Ruhvi Jewels Performance</h1></body></html>',
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('Store_Catalog_Report.html');
    expect(result.fileType).toBe('html');
    expect(result.mimeType).toContain('html');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.fileUrl).toBeDefined();
  });

  it('generates a valid PDF (.pdf) binary document using jsPDF', async () => {
    const result = await createAndUploadFile({
      file_name: 'Jewellery_Audit_Summary.pdf',
      file_type: 'pdf',
      title: 'Jewellery Inventory & Hallmark Audit',
      content:
        'Official Audit Report\nTotal SKUs inspected: 120\n18K Hallmark Compliance: 100%',
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('Jewellery_Audit_Summary.pdf');
    expect(result.fileType).toBe('pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileSize).toBeGreaterThan(100);
    expect(result.fileUrl).toBeDefined();
  });

  it('generates a valid CSV (.csv) spreadsheet file', async () => {
    const result = await createAndUploadFile({
      file_name: 'Restock_Quantities.csv',
      file_type: 'csv',
      title: 'Weekly Restock Recommendations',
      content:
        'SKU,Product Name,Current Stock,Recommended Order\nRH-001,Gold Choker,2,10\nRH-002,Diamond Solitaire Ring,1,5',
    });

    expect(result.success).toBe(true);
    expect(result.fileName).toBe('Restock_Quantities.csv');
    expect(result.fileType).toBe('csv');
    expect(result.mimeType).toContain('csv');
    expect(result.fileSize).toBeGreaterThan(0);
  });
});
