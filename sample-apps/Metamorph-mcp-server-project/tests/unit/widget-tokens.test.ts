import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DARK, LIGHT } from '../../src/widgets/lib/theme.js';

const css = readFileSync(new URL('../../src/widgets/app/tokens.css', import.meta.url), 'utf8');

// The block of declarations after `selector {` up to its closing brace.
function block(selector: string): string {
  const i = css.indexOf(`${selector} {`);
  expect(i).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf('}', i));
}

describe('widget tokens: tokens.css and lib/theme.ts agree', () => {
  for (const [name, map, sel] of [['light', LIGHT, '.mm'], ['dark', DARK, '.mm[data-theme="dark"]']] as const) {
    it(`${name} colours match`, () => {
      const b = block(sel);
      for (const [k, v] of Object.entries(map)) expect(b, `${k} in ${name}`).toContain(`${k}: ${v};`);
    });
  }
});
