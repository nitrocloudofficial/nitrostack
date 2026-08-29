export const tokens = {
  bg: { widget: '#ffffff', surface: '#f8f9fb', elevated: '#ffffff' },
  border: { default: '#eaecf0', subtle: '#e4e7ec', input: '#d0d5dd' },
  text: { primary: '#101828', secondary: '#475467', tertiary: '#667085', disabled: '#98a2b3', onDark: '#ffffff' },
  severity: { HIGH: '#b42318', MEDIUM: '#b54708', LOW: '#067647' },
  color: {
    breaking: '#d92d20', nonbreaking: '#12b76a',
    impactBg: '#fef3f2', impactText: '#b42318',
    safeBg: '#f0fdf4', safeText: '#067647',
    decisionBg: '#ecfdf3', decisionBorder: '#a6f4c5', decisionText: '#067647',
    errorBg: '#fef3f2', errorBorder: '#fecdca', errorText: '#b42318',
    bannerBg: '#fffaeb', bannerBorder: '#f79009', bannerText: '#b54708',
  },
  action: { primary: '#067647', danger: '#b42318', disabledBg: '#f2f4f7' },
  radius: { card: 10, section: 8, badge: 999, classification: 4 },
  shadow: { widget: '0 1px 3px rgba(16,24,40,.1), 0 1px 2px rgba(16,24,44,.06)' },
} as const;

export const fonts = {
  body: 'Inter, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Consolas, monospace',
} as const;

export const S: Record<string, React.CSSProperties> = {
  widget: { padding: 24, border: `1px solid ${tokens.border.subtle}`, borderRadius: tokens.radius.card, background: tokens.bg.widget, color: tokens.text.primary, fontFamily: fonts.body, fontSize: 14, lineHeight: 1.5, boxShadow: tokens.shadow.widget },
  banner: { marginBottom: 20, padding: '10px 14px', borderRadius: tokens.radius.section, background: tokens.color.bannerBg, border: `1px solid ${tokens.color.bannerBorder}`, fontSize: 12, color: tokens.color.bannerText, lineHeight: 1.5 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: tokens.text.tertiary, textTransform: 'uppercase' as const, marginBottom: 4 },
  title: { margin: 0, fontSize: 20, fontWeight: 600, color: tokens.text.primary, lineHeight: 1.3 },
  subtitle: { marginTop: 4, fontSize: 13, color: tokens.text.tertiary, fontFamily: fonts.mono },
  section: { marginTop: 28 },
  sectionTitle: { margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: tokens.text.primary, paddingBottom: 8, borderBottom: `1px solid ${tokens.border.default}` },
  stat: { padding: 14, borderRadius: tokens.radius.section, background: tokens.bg.surface, border: `1px solid ${tokens.border.default}` },
  statLabel: { fontSize: 11, fontWeight: 600, color: tokens.text.tertiary, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 600, color: tokens.text.primary },
  card: { padding: 14, border: `1px solid ${tokens.border.default}`, borderRadius: tokens.radius.section, marginBottom: 8 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 6 },
  textarea: { width: '100%', minHeight: 64, padding: '10px 12px', borderRadius: tokens.radius.section, border: `1px solid ${tokens.border.input}`, fontSize: 13, color: tokens.text.primary, background: tokens.bg.widget, resize: 'vertical' as const, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const },
  buttonRow: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' as const },
};

export function pill(bg: string, fg: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: tokens.radius.classification, background: bg, color: fg, letterSpacing: '0.02em', textTransform: 'uppercase' as const };
}

export function badge(severity: keyof typeof tokens.severity): React.CSSProperties {
  return { background: tokens.severity[severity], color: tokens.text.onDark, fontWeight: 800, fontSize: 11, padding: '6px 12px', borderRadius: tokens.radius.badge, letterSpacing: '0.02em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, flexShrink: 0 };
}

export function buttonStyle(variant: 'primary' | 'danger' | 'ghost', disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 16px', border: variant === 'ghost' ? `1px solid ${tokens.border.input}` : 0,
    borderRadius: tokens.radius.section,
    background: disabled ? tokens.action.disabledBg : variant === 'primary' ? tokens.action.primary : variant === 'danger' ? tokens.action.danger : tokens.bg.widget,
    color: disabled ? tokens.text.disabled : variant === 'ghost' ? '#344054' : tokens.text.onDark,
    fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
    transition: 'background 150ms ease-out, opacity 150ms ease-out',
  };
}
