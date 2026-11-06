import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Starter Templates Security Hardening Suite (BlueRock Audit Compliance)', () => {
  const templatesDir = path.resolve(__dirname, '../../templates');

  describe('calculator.tools.ts Security (ATR-C0011, ATR-C0008, ATR-C0013)', () => {
    const calcToolsPath = path.join(
      templatesDir,
      'typescript-starter/src/modules/calculator/calculator.tools.ts'
    );

    it('exists in the starter template', () => {
      expect(fs.existsSync(calcToolsPath)).toBe(true);
    });

    it('does not import fs or fs/promises (eliminates arbitrary filesystem writes)', () => {
      const content = fs.readFileSync(calcToolsPath, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]fs(\/promises)?['"]/);
      expect(content).not.toMatch(/require\(['"]fs(\/promises)?['"]\)/);
      expect(content).not.toMatch(/writeFileSync/);
      expect(content).not.toMatch(/writeFile\(/);
    });

    it('sanitizes input filenames with path.basename and character whitelisting', () => {
      const content = fs.readFileSync(calcToolsPath, 'utf-8');
      expect(content).toContain('path.basename');
      expect(content).toContain('replace(/[^a-zA-Z0-9._-]/g');
    });

    it('enforces strict Zod schema validation on filenames, payloads, and finite numbers', () => {
      const content = fs.readFileSync(calcToolsPath, 'utf-8');
      expect(content).toContain('.finite()');
      expect(content).toContain('.max(100)');
      expect(content).toContain('2 * 1024 * 1024');
      expect(content).toContain("enum(['text/plain', 'text/csv', 'application/json'])");
    });

    it('processes uploaded file payloads safely in memory', () => {
      const content = fs.readFileSync(calcToolsPath, 'utf-8');
      expect(content).toContain('processed_in_memory');
      expect(content).toContain('Buffer.from(base64Data, \'base64\').toString(\'utf-8\')');
    });
  });

  describe('Next.js and PostCSS Supply Chain Risk (ATR-C0007)', () => {
    const templateNames = [
      'typescript-starter',
      'typescript-code-mode',
      'typescript-enterprise-search',
      'typescript-oauth',
      'typescript-pizzaz'
    ];

    templateNames.forEach((name) => {
      const widgetPkgPath = path.join(templatesDir, name, 'src/widgets/package.json');
      const nextConfigPath = path.join(templatesDir, name, 'src/widgets/next.config.js');

      it(`template ${name}: widget package.json upgrades next to >= 15.5.0`, () => {
        expect(fs.existsSync(widgetPkgPath)).toBe(true);
        const pkg = JSON.parse(fs.readFileSync(widgetPkgPath, 'utf-8'));
        const nextVersion = pkg.dependencies?.next;
        expect(nextVersion).toBeDefined();

        // Must be on 15.5.x or higher, never on vulnerable 14.x line
        expect(nextVersion).not.toContain('14.');
        expect(nextVersion).toMatch(/\^?15\.[5-9]/);
      });

      it(`template ${name}: widget package.json pins postcss to >= 8.5.23`, () => {
        const pkg = JSON.parse(fs.readFileSync(widgetPkgPath, 'utf-8'));
        const postcssVersion = pkg.devDependencies?.postcss || pkg.dependencies?.postcss;
        expect(postcssVersion).toBeDefined();

        // Must be >= 8.5.23 to resolve CVE-2023-44270 and supply chain advisories
        expect(postcssVersion).not.toMatch(/8\.4\./);
        expect(postcssVersion).toMatch(/\^?8\.5\./);
      });

      it(`template ${name}: next.config.js removes deprecated buildActivity devIndicator`, () => {
        expect(fs.existsSync(nextConfigPath)).toBe(true);
        const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');
        expect(nextConfigContent).not.toContain('buildActivity: false');
        expect(nextConfigContent).toContain('devIndicators: false');
      });
    });
  });
});
