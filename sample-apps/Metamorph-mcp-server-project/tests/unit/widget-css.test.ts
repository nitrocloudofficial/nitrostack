import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inlineWidgetCss } from '../../src/widget-css.js';

describe('inlineWidgetCss', () => {
  const make = (html: string, css: string) => {
    const cwd = mkdtempSync(join(tmpdir(), 'mm-css-'));
    const dir = join(cwd, 'src/widgets/out');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'score-dashboard.html'), html);
    writeFileSync(join(dir, 'score-dashboard.css'), css);
    return { cwd, file: join(dir, 'score-dashboard.html') };
  };

  it('inlines the stylesheet once and is idempotent', () => {
    const { cwd, file } = make('<html><head></head><body>x</body></html>', 'body{color:red}');
    expect(inlineWidgetCss(cwd)).toBe(true);
    const once = readFileSync(file, 'utf-8');
    expect(once).toContain('<style data-mm-css>body{color:red}</style></head>');
    expect(inlineWidgetCss(cwd)).toBe(true);
    expect(readFileSync(file, 'utf-8')).toBe(once);
  });

  it('neutralises a closing style tag inside the css and survives missing files', () => {
    const { cwd, file } = make('<html><head></head></html>', 'a{}</style><script>1</script>');
    inlineWidgetCss(cwd);
    expect(readFileSync(file, 'utf-8').match(/<\/style>/g)?.length).toBe(1);
    expect(inlineWidgetCss(mkdtempSync(join(tmpdir(), 'mm-none-')))).toBe(false);
  });
});
