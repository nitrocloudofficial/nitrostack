import type { Config } from 'tailwindcss';

/**
 * Seer's widgets are read as instrument output: a profile, an approval, a
 * measurement. The palette is near-monochrome so colour only appears where it
 * carries meaning — a measured value, a caution, a failed check. The one hue is
 * verdigris, the patina precision brass instruments take on.
 *
 * Themes are swapped by the `dark` class on <html>, driven by the host's
 * reported theme rather than the OS preference.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './design/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--seer-canvas)',
        surface: 'var(--seer-surface)',
        sunken: 'var(--seer-sunken)',
        ink: 'var(--seer-ink)',
        muted: 'var(--seer-muted)',
        rule: 'var(--seer-rule)',
        'rule-strong': 'var(--seer-rule-strong)',
        signal: 'var(--seer-signal)',
        caution: 'var(--seer-caution)',
        'caution-surface': 'var(--seer-caution-surface)',
        alert: 'var(--seer-alert)',
      },
      fontFamily: {
        ui: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        micro: ['11px', '1.45'],
        small: ['12px', '1.5'],
        body: ['13px', '1.55'],
        lead: ['15px', '1.4'],
        title: ['19px', '1.25'],
        figure: ['26px', '1.15'],
      },
      // Weight stops doing the work that size and colour should do.
      fontWeight: {
        regular: '400',
        medium: '500',
        strong: '650',
      },
      borderRadius: {
        sm: '3px',
        md: '6px',
        lg: '8px',
      },
      letterSpacing: {
        title: '-0.015em',
        figure: '-0.02em',
      },
    },
  },
  plugins: [],
};

export default config;
