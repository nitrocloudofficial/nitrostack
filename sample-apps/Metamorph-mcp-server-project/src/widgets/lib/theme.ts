// Colour tokens mirrored from app/tokens.css. They are set as inline style variables on the widget root, so the colours
// survive when the host blocks the CSS file. Keep in sync with tokens.css (tests/unit/widget-tokens.test.ts checks it).
export type ThemeName = 'light' | 'dark';

export const LIGHT: Record<string, string> = {
  '--base': '#D5DAD0',
  '--panel': '#EFE7D6',
  '--accent': '#6B1F2A',
  '--on-accent': '#F6EFE2',
  '--accent-ink': '#6B1F2A',
  '--text': '#23201B',
  '--muted': '#5E5A50',
  '--rule': '#B7BEAF',
  '--rule-strong': '#8F9786',
  '--focus': '#6B1F2A',
  '--sev-critical': '#A8452C',
  '--sev-high': '#B26418',
  '--sev-medium': '#9A7B14',
  '--sev-low': '#667328',
  '--sev-info': '#587672',
  '--state-verified': '#1D5C58'
};

export const DARK: Record<string, string> = {
  '--base': '#151614',
  '--panel': '#1A211C',
  '--accent': '#D1344A',
  '--on-accent': '#FFF3EE',
  '--accent-ink': '#F0788C',
  '--text': '#E7E4DA',
  '--muted': '#9A9A8E',
  '--rule': '#2A2D28',
  '--rule-strong': '#4A5148',
  '--focus': '#F0788C',
  '--sev-critical': '#E07A55',
  '--sev-high': '#E0953F',
  '--sev-medium': '#CDB04A',
  '--sev-low': '#9BAE5C',
  '--sev-info': '#8CA9A5',
  '--state-verified': '#4FA79E'
};

export const tokensFor = (t: ThemeName): Record<string, string> => (t === 'dark' ? DARK : LIGHT);

// The user's choice for this widget. 'auto' means: follow the host.
export type ThemePref = 'auto' | 'light' | 'dark';

// One rule for the theme to paint: the user's explicit choice, else the host's theme, else the system preference,
// else null (the CSS then decides through prefers-color-scheme). A host change is followed only while pref is 'auto'.
export function resolveTheme(o: { host?: string | null; pref?: ThemePref | null; system?: ThemeName | null }): ThemeName | null {
  if (o.pref === 'light' || o.pref === 'dark') return o.pref;
  if (o.host === 'light' || o.host === 'dark') return o.host;
  return o.system ?? null;
}

export const nextPref = (p: ThemePref): ThemePref => (p === 'auto' ? 'light' : p === 'light' ? 'dark' : 'auto');
