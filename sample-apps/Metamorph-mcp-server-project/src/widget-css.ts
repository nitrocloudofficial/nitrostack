// The widget build writes score-dashboard.css beside score-dashboard.html but the HTML never references it, so a host that
// loads only the HTML (NitroStudio, the /app page) shows an unstyled widget. Inline the CSS into the HTML once at start-up.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARK = 'data-mm-css';
const DIRS = ['src/widgets/out', 'dist/widgets/out', 'widgets/out'];

export function inlineWidgetCss(cwd: string, log: (m: string) => void = () => {}): boolean {
  const dir = DIRS.map((d) => join(cwd, d)).find((d) => existsSync(join(d, 'score-dashboard.html')) && existsSync(join(d, 'score-dashboard.css')));
  if (!dir) return false;
  try {
    const htmlPath = join(dir, 'score-dashboard.html');
    const html = readFileSync(htmlPath, 'utf-8');
    if (html.includes(MARK)) return true;
    const css = readFileSync(join(dir, 'score-dashboard.css'), 'utf-8').replace(/<\/style/gi, '<\\/style');
    const tag = `<style ${MARK}>${css}</style>`;
    const out = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => `${tag}</head>`) : tag + html;
    writeFileSync(htmlPath, out);
    return true;
  } catch (err) {
    log(`widget css not inlined: ${(err as Error).message}`);
    return false;
  }
}
