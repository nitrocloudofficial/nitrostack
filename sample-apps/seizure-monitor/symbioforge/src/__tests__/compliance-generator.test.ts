import { expect, test, describe } from 'vitest';
import { ComplianceGenerator } from '../core/compliance-generator.js';
import { Factory } from '../core/types.js';
import fs from 'fs';

describe('ComplianceGenerator', () => {
  test('generateSpcbReport creates a PDF starting with %PDF- or HTML fallback', async () => {
    const generator = new ComplianceGenerator();
    const mockFactory: Factory = {
      id: 'test_pdf_fact',
      name: 'PDF Test Factory',
      industryType: 'Test',
      location: { lat: 10, lng: 10, address: 'Test Address' },
      productionCapacity: '1000',
      rawMaterials: [],
      declaredWastes: [],
      complianceStatus: 'filed',
      savingsEarned: 0,
      co2Avoided: 0
    };

    const filePath = await generator.generateSpcbReport(mockFactory);
    expect(fs.existsSync(filePath)).toBe(true);

    // Read the first 5 bytes to verify %PDF- or <!DOC (html fallback)
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    const signature = buffer.toString('ascii');
    
    // Depending on environment, it will either generate PDF or fallback to HTML
    expect(['%PDF-', '<!DOC']).toContain(signature);
  });
});
