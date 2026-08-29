/**
 * Application chrome — sidebar, topbar, cards, pills, primitives.
 *
 * Shared by all five bundles so the MCP widgets and the browser console are
 * visibly one product rather than five screens that happen to share a colour.
 *
 * EVERY COMPONENT HERE IS TOTAL
 * ----------------------------
 * Props are typed, but the data reaching them originates from `window.openai
 * .toolOutput` — untyped at the boundary and sometimes `{}`. A component that
 * throws on a missing field takes down the whole bundle, and a widget crash is
 * invisible: the host frame simply stays blank. So every render path tolerates
 * undefined and falls back to an em dash or a documented placeholder.
 */
import React from 'react';
import { COLORS, bandLabel, riskBorder, riskColor, riskSoft, type RiskLevel } from '../lib/theme.js';
import { initials, pad2 } from '../lib/format.js';
import { IconBell, IconSearch } from './icons.jsx';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="piq-app">{children}</div>;
}

export function MainColumn({ children }: { children: React.ReactNode }) {
  return <div className="piq-main">{children}</div>;
}

export function Content({ children }: { children?: React.ReactNode }) {
  return <div className="piq-content">{children}</div>;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number | null;
}

export function Sidebar({
  nav,
  activeId,
  onNavigate,
  stats,
  navLabel = 'Casework',
}: {
  nav: NavItem[];
  activeId: string;
  onNavigate?: (id: string) => void;
  stats?: QuickStat[];
  navLabel?: string;
}) {
  return (
    <aside className="piq-sidebar">
      <div className="piq-brand">
        <div className="piq-brand-mark">PIQ</div>
        <div>
          <div className="piq-brand-name">PassportIQ</div>
          <div className="piq-brand-sub">Verification Copilot</div>
        </div>
      </div>

      <nav className="piq-nav">
        <div className="piq-nav-label">{navLabel}</div>
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`piq-nav-item${item.id === activeId ? ' is-active' : ''}`}
            onClick={() => onNavigate?.(item.id)}
            // A non-interactive nav in a read-only widget should not advertise
            // clickability it does not have.
            style={onNavigate ? undefined : { cursor: 'default' }}
            aria-current={item.id === activeId ? 'page' : undefined}
          >
            <span className="piq-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {typeof item.count === 'number' && <span className="piq-nav-count">{item.count}</span>}
          </button>
        ))}
      </nav>

      {stats && stats.length > 0 && (
        <div className="piq-sidebar-foot">
          <QuickStats stats={stats} />
        </div>
      )}
    </aside>
  );
}

export interface QuickStat {
  label: string;
  value: number | string;
  tone?: RiskLevel | 'accent' | 'machine' | 'neutral';
}

export function QuickStats({ stats }: { stats: QuickStat[] }) {
  const toneColor = (tone: QuickStat['tone']): string => {
    if (tone === 'accent') return COLORS.accent;
    if (tone === 'machine') return COLORS.machine;
    if (tone === 'neutral' || tone === undefined) return COLORS.textPrimary;
    return riskColor(tone);
  };

  return (
    <div className="piq-quickstats">
      <div className="piq-quickstats-title">Quick Stats</div>
      {stats.map((stat) => (
        <div className="piq-quickstat" key={stat.label}>
          <span className="piq-quickstat-label">{stat.label}</span>
          <span className="piq-quickstat-value" style={{ color: toneColor(stat.tone) }}>
            {typeof stat.value === 'number' ? pad2(stat.value) : stat.value}
          </span>
        </div>
      ))}
      <div className="piq-emblem">
        <Emblem />
        <div className="piq-emblem-text">
          Ministry of External Affairs
          <br />
          Passport Seva — Officer Console
        </div>
      </div>
    </div>
  );
}

/**
 * A neutral state emblem.
 *
 * Deliberately a generic lion-capital-style silhouette rather than the actual
 * Government of India emblem: reproducing a state emblem in a hackathon demo
 * would be a misuse of a protected symbol. It reads as institutional without
 * impersonating an authority.
 */
function Emblem() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <circle cx="13" cy="13" r="12" fill="none" stroke={COLORS.borderStrong} strokeWidth="1" />
      <path
        d="M13 5.4l1.9 3.4h-3.8zM8.4 9.8h9.2l-1 2.1H9.4zM9 12.7h8l-.8 5.4H9.8zM8.2 19h9.6"
        fill="none"
        stroke={COLORS.textMuted}
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

export function TopBar({
  crumbs,
  live,
  notifications = 0,
  officer,
  onSearch,
  extra,
  onLogout,
}: {
  crumbs: string[];
  live?: { label: string; tone?: 'live' | 'idle' | 'machine' };
  notifications?: number;
  officer?: { name: string; role: string };
  onSearch?: () => void;
  extra?: React.ReactNode;
  /** Renders a sign-out control after the officer identity (console only). */
  onLogout?: () => void;
}) {
  const tone = live?.tone ?? 'live';
  const liveClass =
    tone === 'idle' ? 'piq-live is-idle' : tone === 'machine' ? 'piq-live is-machine' : 'piq-live';

  return (
    <header className="piq-topbar">
      <div className="piq-crumbs">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={`${crumb}-${i}`}>
            {i > 0 && <span className="piq-crumb-sep">›</span>}
            <span className={`piq-crumb${i === crumbs.length - 1 ? ' is-current' : ''}`}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="piq-topbar-right">
        {extra}
        {live && (
          <span className={liveClass}>
            <span className="piq-live-dot" />
            {live.label}
          </span>
        )}
        {onSearch && (
          <button type="button" className="piq-iconbtn" onClick={onSearch} aria-label="Search">
            <IconSearch size={16} />
          </button>
        )}
        <button
          type="button"
          className="piq-iconbtn"
          aria-label={`Notifications${notifications > 0 ? ` (${notifications} unread)` : ''}`}
        >
          <IconBell size={16} />
          {notifications > 0 && (
            <span className="piq-badge-dot">{notifications > 99 ? '99+' : notifications}</span>
          )}
        </button>
        {officer && (
          <div className="piq-officer">
            <div className="piq-avatar">{initials(officer.name)}</div>
            <div>
              <div className="piq-officer-name">{officer.name}</div>
              <div className="piq-officer-role">{officer.role}</div>
            </div>
          </div>
        )}
        {onLogout && (
          <button
            type="button"
            className="piq-iconbtn"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            style={{ color: COLORS.textSecondary }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Cards + primitives
// ---------------------------------------------------------------------------

export function Card({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  flush,
  icon,
  style,
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  flush?: boolean;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section className="piq-card" style={style}>
      {(title || actions || eyebrow) && (
        <div className="piq-card-head">
          {icon && <span style={{ color: COLORS.textSecondary, display: 'flex' }}>{icon}</span>}
          <div style={{ minWidth: 0 }}>
            {eyebrow && <div className="piq-eyebrow">{eyebrow}</div>}
            {title && <div className="piq-card-title">{title}</div>}
            {subtitle && <div className="piq-card-sub">{subtitle}</div>}
          </div>
          {actions && <div className="piq-card-actions">{actions}</div>}
        </div>
      )}
      <div className={`piq-card-body${flush ? ' is-flush' : ''}`}>{children}</div>
    </section>
  );
}

export function Pill({
  children,
  color,
  background,
  border,
  square,
}: {
  children: React.ReactNode;
  color?: string;
  background?: string;
  border?: string;
  square?: boolean;
}) {
  return (
    <span
      className={`piq-pill${square ? ' piq-pill-sq' : ''}`}
      style={{
        color: color ?? COLORS.textSecondary,
        background: background ?? COLORS.surfaceAlt,
        borderColor: border ?? 'transparent',
      }}
    >
      {children}
    </span>
  );
}

/**
 * A risk pill.
 *
 * Always renders the WORD as well as the colour — see the note in theme.ts on
 * greyscale printing and colour-blind review. `showScore` appends the number for
 * surfaces where the exact value matters.
 */
export function RiskPill({
  band,
  score,
  showScore,
}: {
  band: RiskLevel | string | null | undefined;
  score?: number | null;
  showScore?: boolean;
}) {
  const label = bandLabel(band);
  return (
    <Pill color={riskColor(band)} background={riskSoft(band)} border={riskBorder(band)}>
      {showScore && typeof score === 'number' ? `${label} · ${Math.round(score)}` : label}
    </Pill>
  );
}

export function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="piq-chip">
      {icon && <span style={{ display: 'flex', color: COLORS.textMuted }}>{icon}</span>}
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="piq-field">
      <div className="piq-field-label">{label}</div>
      <div className={`piq-field-value${mono ? ' is-mono' : ''}`}>{children ?? '—'}</div>
    </div>
  );
}

export function Fields({ children }: { children: React.ReactNode }) {
  return <div className="piq-fields">{children}</div>;
}

export function Bar({ percent, color }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <div className="piq-bar">
      <div
        className="piq-bar-fill"
        style={{ width: `${clamped}%`, background: color ?? COLORS.accent }}
      />
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'default',
  disabled,
  block,
  small,
  icon,
  type = 'button',
  title,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'machine';
  disabled?: boolean;
  block?: boolean;
  small?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  title?: string;
}) {
  const cls = [
    'piq-btn',
    variant === 'primary' ? 'piq-btn-primary' : '',
    variant === 'machine' ? 'piq-btn-machine' : '',
    block ? 'piq-btn-block' : '',
    small ? 'piq-btn-sm' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} title={title}>
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="piq-empty">{children}</div>;
}

export function Spinner() {
  return <span className="piq-spin" />;
}

/**
 * Sample-data banner.
 *
 * The widgets render sample data when opened outside a tool call, which is
 * essential for previews — and dangerous in a review tool. This banner makes the
 * distinction impossible to miss, and every page shows it whenever
 * `hasHostData()` is false.
 */
export function DemoBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="piq-demo-banner">
      <strong>Sample data</strong>
      <span>
        {children ??
          'No live tool output was supplied, so this preview shows a representative case. Figures are illustrative, not from the live queue.'}
      </span>
    </div>
  );
}

export function GridStat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="piq-card" style={{ padding: '15px 17px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: COLORS.textSecondary,
          marginBottom: 8,
        }}
      >
        {icon && <span style={{ display: 'flex' }}>{icon}</span>}
        <span className="piq-eyebrow">{label}</span>
      </div>
      <div
        style={{
          fontSize: 25,
          fontWeight: 750,
          letterSpacing: '-.03em',
          lineHeight: 1,
          color: tone ?? COLORS.textPrimary,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11.5, color: COLORS.textSecondary, marginTop: 6, lineHeight: 1.45 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
