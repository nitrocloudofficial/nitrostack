/**
 * UI/UX Integrator — recovers the corporate design language so generated UI
 * uses the approved palette and existing components instead of inventing
 * generic Bootstrap-looking output.
 */
import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import { WorkspaceService } from '../../shared/services/workspace.service.js';

export interface DesignToken {
  name: string;
  value: string;
  category: 'color' | 'font' | 'spacing' | 'radius' | 'elevation' | 'duration' | 'other';
  source: string;
}

export interface ComponentEntry {
  name: string;
  path: string;
  props: string[];
  /** How many other files import this component. */
  usageCount: number;
  doc?: string;
}

export interface DesignSystemReport {
  target: string;
  framework: string[];
  tokens: DesignToken[];
  palette: { name: string; value: string }[];
  typography: { name: string; value: string }[];
  components: ComponentEntry[];
  /** Colours used inline that are NOT in the token set — style-guide violations. */
  adHocColors: { file: string; value: string }[];
  conventions: string[];
}

@Injectable({ deps: [WorkspaceService] })
export class UiUxService {
  constructor(private workspace: WorkspaceService) {}

  analyse(target: string): DesignSystemReport {
    const walk = this.workspace.walk(target);
    const tokens: DesignToken[] = [];
    const components: ComponentEntry[] = [];
    const framework = new Set<string>();
    const conventions: string[] = [];
    const adHocColors: DesignSystemReport['adHocColors'] = [];

    const componentImports = new Map<string, number>();
    const uiFiles: { rel: string; content: string }[] = [];

    for (const abs of walk.files) {
      const rel = this.workspace.rel(target, abs);
      const base = path.basename(abs);
      const content = this.workspace.read(abs);
      if (content === null) continue;

      if (base === 'tailwind.config.js' || base === 'tailwind.config.ts' || base === 'tailwind.config.cjs') {
        framework.add('Tailwind CSS');
        tokens.push(...this.parseTailwind(rel, content));
      }

      if (/\.(css|scss|less)$/.test(base)) {
        const cssVars = this.parseCssVariables(rel, content);
        if (cssVars.length) {
          framework.add('CSS custom properties');
          tokens.push(...cssVars);
        }
        const banner = content.match(/\/\*+\s*(.{20,200}?)\s*\*+\//)?.[1];
        if (banner && /do not|must|approved|design/i.test(banner)) conventions.push(`${banner}  _(${rel})_`);
      }

      if (/\.(jsx|tsx)$/.test(base)) {
        uiFiles.push({ rel, content });
        if (/(^|\/)components?\//.test(rel)) {
          const entry = this.parseComponent(rel, content);
          if (entry) components.push(entry);
        }
        if (/from ['"]react['"]/.test(content)) framework.add('React');
        if (/styled-components/.test(content)) framework.add('styled-components');
      }
    }

    // Count component usage across every UI file to rank the canonical primitives.
    for (const { content } of uiFiles) {
      for (const c of components) {
        const pattern = new RegExp(`<${c.name}[\\s/>]|from ['"][^'"]*${c.name}['"]`);
        if (pattern.test(content)) componentImports.set(c.name, (componentImports.get(c.name) ?? 0) + 1);
      }
    }
    for (const c of components) c.usageCount = Math.max(0, (componentImports.get(c.name) ?? 1) - 1);

    const tokenValues = new Set(tokens.filter((t) => t.category === 'color').map((t) => t.value.toLowerCase()));
    for (const { rel, content } of uiFiles) {
      for (const m of content.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        if (!tokenValues.has(m[0].toLowerCase())) adHocColors.push({ file: rel, value: m[0] });
      }
    }

    const deduped = this.dedupeTokens(tokens);
    return {
      target,
      framework: [...framework],
      tokens: deduped,
      palette: deduped.filter((t) => t.category === 'color').map((t) => ({ name: t.name, value: t.value })),
      typography: deduped.filter((t) => t.category === 'font').map((t) => ({ name: t.name, value: t.value })),
      components: components.sort((a, b) => b.usageCount - a.usageCount),
      adHocColors: adHocColors.slice(0, 20),
      conventions,
    };
  }

  private parseTailwind(source: string, content: string): DesignToken[] {
    const out: DesignToken[] = [];

    const colorBlock = this.section(content, 'colors');
    if (colorBlock) {
      for (const m of colorBlock.matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8}|rgb[^'"]*)['"]/g)) {
        out.push({ name: m[1], value: m[2], category: 'color', source });
      }
    }

    const fontBlock = this.section(content, 'fontFamily');
    if (fontBlock) {
      for (const m of fontBlock.matchAll(/([\w-]+)\s*:\s*\[([^\]]*)\]/g)) {
        const stack = [...m[2].matchAll(/['"]([^'"]+)['"]/g)].map((f) => f[1]).join(', ');
        out.push({ name: m[1], value: stack, category: 'font', source });
      }
    }

    for (const [key, category] of [
      ['spacing', 'spacing'],
      ['borderRadius', 'radius'],
      ['boxShadow', 'elevation'],
    ] as const) {
      const block = this.section(content, key);
      if (!block) continue;
      for (const m of block.matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g)) {
        out.push({ name: m[1], value: m[2], category, source });
      }
    }

    return out;
  }

  /** Extract a brace-balanced `key: { ... }` section from a JS config. */
  private section(content: string, key: string): string | null {
    const start = content.search(new RegExp(`\\b${key}\\s*:\\s*\\{`));
    if (start < 0) return null;
    const open = content.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) return content.slice(open + 1, i);
      }
    }
    return null;
  }

  private parseCssVariables(source: string, content: string): DesignToken[] {
    const out: DesignToken[] = [];
    for (const m of content.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const name = m[1];
      const value = m[2].trim();
      out.push({ name, value, category: this.categorise(name, value), source });
    }
    return out;
  }

  private categorise(name: string, value: string): DesignToken['category'] {
    const n = name.toLowerCase();
    if (/color|colour|bg|fg|palette/.test(n) || /^#|^rgb|^hsl/.test(value)) return 'color';
    if (/font|type|family/.test(n)) return 'font';
    if (/space|spacing|gap|gutter|stack|inset/.test(n)) return 'spacing';
    if (/radius|round/.test(n)) return 'radius';
    if (/shadow|elevation/.test(n)) return 'elevation';
    if (/duration|ease|transition/.test(n)) return 'duration';
    return 'other';
  }

  private parseComponent(rel: string, content: string): ComponentEntry | null {
    const name =
      content.match(/export\s+default\s+function\s+(\w+)/)?.[1] ??
      content.match(/export\s+function\s+(\w+)/)?.[1] ??
      path.basename(rel).replace(/\.(jsx|tsx)$/, '');
    if (!name) return null;

    // Destructured props from the default export's signature.
    const propsBlock = content.match(new RegExp(`function\\s+${name}\\s*\\(\\s*\\{([^}]*)\\}`))?.[1] ?? '';
    const props = propsBlock
      .split(',')
      .map((p) => p.split('=')[0].trim())
      .filter((p) => /^[A-Za-z_$][\w$]*$/.test(p));

    return {
      name,
      path: rel,
      props,
      usageCount: 0,
      doc: content.match(/\/\*\*\s*(.+?)\s*\*\//s)?.[1]?.replace(/\s*\*\s*/g, ' ').trim().slice(0, 200),
    };
  }

  private dedupeTokens(tokens: DesignToken[]): DesignToken[] {
    const seen = new Map<string, DesignToken>();
    for (const t of tokens) {
      const key = `${t.category}:${t.name}`;
      if (!seen.has(key)) seen.set(key, t);
    }
    return [...seen.values()];
  }
}
