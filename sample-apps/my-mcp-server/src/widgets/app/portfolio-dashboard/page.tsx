'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { emptyStateMessage, usePreview, usePreviewTheme } from '../preview';

/**
 * Layer A surface: the user's holdings plus a news feed ranked by how much it actually
 * touches THIS portfolio rather than by how loud the headline is.
 */

interface Holding {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  day_change_pct: number;
  market_value: number;
  unrealized_gain: number;
  unrealized_gain_pct: number;
  weight_of_total: number;
}

interface RelevantEvent {
  event_id: string;
  headline: string;
  date: string;
  relevance_band: 'high' | 'medium' | 'low' | 'noise';
  relevance_score: number;
  driver: 'broad_market' | 'sector' | 'company_specific' | 'unrelated';
  exposure_pct_of_portfolio: number;
  affected_holdings: Array<{ symbol: string }>;
  explanation: string;
  why_it_matters_or_not: string;
}

interface DashboardData {
  currency: string;
  as_of: string;
  profile: { display_name: string; stated_horizon_years: number; stated_goal: string };
  holdings: Holding[];
  sector_breakdown: Array<{ sector: string; market_value: number; weight_of_total: number; symbols: string[] }>;
  totals: {
    invested_value: number;
    cash: number;
    total_value: number;
    unrealized_gain: number;
    unrealized_gain_pct: number;
    day_change_value: number;
    day_change_pct: number;
  };
  concentration_note: string;
  relevant_events: RelevantEvent[];
  news_note: string;
}

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)'];

const BAND: Record<RelevantEvent['relevance_band'], { label: string; icon: string; token: string }> = {
  high: { label: 'Directly affects you', icon: '●', token: 'var(--status-critical)' },
  medium: { label: 'Partly affects you', icon: '◐', token: 'var(--status-serious)' },
  low: { label: 'Barely touches you', icon: '○', token: 'var(--status-warning)' },
  noise: { label: 'Not about your money', icon: '·', token: 'var(--ink-muted)' }
};

const DRIVER_LABEL: Record<RelevantEvent['driver'], string> = {
  broad_market: 'Market-wide move',
  sector: 'Sector-level move',
  company_specific: 'Company-specific news',
  unrelated: 'No exposure'
};

export default function PortfolioDashboard() {
  const hostTheme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const preview = usePreview<DashboardData>('/portfolio-dashboard');
  const previewTheme = usePreviewTheme();

  const data = getToolOutput<DashboardData>() ?? preview.data;
  const theme = previewTheme ?? hostTheme;

  if (!data) {
    return (
      <div className="pg-root" data-mode={theme}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="pg-empty">{emptyStateMessage(preview, 'portfolio')}</div>
      </div>
    );
  }

  const money = (n: number, dp = 0) =>
    `${data.currency === 'USD' ? '$' : `${data.currency} `}${n.toLocaleString('en-US', {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp
    })}`;
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
  const tone = (n: number) => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

  const sectorLabel = (s: string) => s.replace(/_/g, ' ');
  const cashWeight = data.totals.cash / data.totals.total_value;

  return (
    <div className="pg-root" data-mode={theme}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="pg-head">
        <div>
          <h1>BitWiserAI</h1>
          <p className="pg-sub">
            {data.profile.display_name} · {data.holdings.length} holdings · as of {data.as_of}
          </p>
        </div>
        <span className="pg-pill" title="This tool never recommends a trade.">
          Informational only · no recommendations
        </span>
      </header>

      {/* Stat row — hero figure plus the two deltas that matter */}
      <section className="pg-stats">
        <div className="pg-stat pg-stat--hero">
          <span className="pg-stat-label">Total value</span>
          <span className="pg-stat-value">{money(data.totals.total_value, 2)}</span>
          <span className="pg-stat-foot">
            {money(data.totals.invested_value)} invested · {money(data.totals.cash)} cash
          </span>
        </div>
        <div className="pg-stat">
          <span className="pg-stat-label">Today</span>
          <span className={`pg-stat-value pg-${tone(data.totals.day_change_pct)}`}>
            {signed(data.totals.day_change_pct)}
          </span>
          <span className="pg-stat-foot">
            {data.totals.day_change_value > 0 ? '+' : ''}
            {money(data.totals.day_change_value)} on the day
          </span>
        </div>
        <div className="pg-stat">
          <span className="pg-stat-label">Since you bought</span>
          <span className={`pg-stat-value pg-${tone(data.totals.unrealized_gain_pct)}`}>
            {signed(data.totals.unrealized_gain_pct)}
          </span>
          <span className="pg-stat-foot">
            {data.totals.unrealized_gain > 0 ? '+' : ''}
            {money(data.totals.unrealized_gain)} unrealised
          </span>
        </div>
        <div className="pg-stat">
          <span className="pg-stat-label">Horizon</span>
          <span className="pg-stat-value">{data.profile.stated_horizon_years} yrs</span>
          <span className="pg-stat-foot">Your stated plan</span>
        </div>
      </section>

      {/* Allocation — one stacked bar, every segment directly labelled in the legend */}
      <section className="pg-card">
        <h2>Where the money sits</h2>
        <div className="pg-alloc" role="img" aria-label="Allocation by sector">
          {data.sector_breakdown.map((s, i) => (
            <span
              key={s.sector}
              className="pg-alloc-seg"
              style={{ width: `${s.weight_of_total * 100}%`, background: SERIES[i % SERIES.length] }}
              title={`${sectorLabel(s.sector)} ${(s.weight_of_total * 100).toFixed(1)}%`}
            />
          ))}
          <span className="pg-alloc-seg pg-alloc-cash" style={{ width: `${cashWeight * 100}%` }} title="Cash" />
        </div>
        <ul className="pg-legend">
          {data.sector_breakdown.map((s, i) => (
            <li key={s.sector}>
              <span className="pg-swatch" style={{ background: SERIES[i % SERIES.length] }} />
              <span className="pg-legend-name">{sectorLabel(s.sector)}</span>
              <span className="pg-legend-val">{(s.weight_of_total * 100).toFixed(1)}%</span>
            </li>
          ))}
          <li>
            <span className="pg-swatch pg-alloc-cash" />
            <span className="pg-legend-name">cash</span>
            <span className="pg-legend-val">{(cashWeight * 100).toFixed(1)}%</span>
          </li>
        </ul>
        <p className="pg-note">{data.concentration_note}</p>
      </section>

      {/* Holdings */}
      <section className="pg-card">
        <h2>Holdings</h2>
        <div className="pg-table" role="table">
          <div className="pg-tr pg-th" role="row">
            <span role="columnheader">Position</span>
            <span role="columnheader">Weight</span>
            <span role="columnheader">Value</span>
            <span role="columnheader">Today</span>
            <span role="columnheader">Since buy</span>
          </div>
          {data.holdings.map((h) => (
            <div className="pg-tr" role="row" key={h.symbol}>
              <span className="pg-pos">
                <strong>{h.symbol}</strong>
                <em>
                  {h.quantity} × {money(h.current_price, 2)}
                </em>
              </span>
              <span className="pg-weight">
                <span className="pg-weight-bar">
                  <span style={{ width: `${Math.min(100, h.weight_of_total * 100 * 2.5)}%` }} />
                </span>
                <em>{(h.weight_of_total * 100).toFixed(1)}%</em>
              </span>
              <span className="pg-num">{money(h.market_value)}</span>
              <span className={`pg-num pg-${tone(h.day_change_pct)}`}>{signed(h.day_change_pct)}</span>
              <span className={`pg-num pg-${tone(h.unrealized_gain_pct)}`}>{signed(h.unrealized_gain_pct)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Relevance-scored feed */}
      <section className="pg-card">
        <h2>What actually matters to you today</h2>
        <p className="pg-note pg-note--top">{data.news_note}</p>
        <ul className="pg-feed">
          {data.relevant_events.map((e) => {
            const band = BAND[e.relevance_band];
            return (
              <li key={e.event_id} className={`pg-event pg-event--${e.relevance_band}`}>
                <div className="pg-event-head">
                  <span className="pg-band" style={{ color: band.token }}>
                    <span aria-hidden="true">{band.icon}</span> {band.label}
                  </span>
                  <span className="pg-driver">{DRIVER_LABEL[e.driver]}</span>
                  {e.exposure_pct_of_portfolio > 0 && (
                    <span className="pg-exposure">{(e.exposure_pct_of_portfolio * 100).toFixed(1)}% of your money</span>
                  )}
                </div>
                <p className="pg-headline">{e.headline}</p>
                <p className="pg-explain">{e.explanation}</p>
                {e.relevance_band !== 'noise' && <p className="pg-why">{e.why_it_matters_or_not}</p>}
                <button
                  className="pg-link"
                  onClick={() => sendFollowUpMessage(`Explain event ${e.event_id} and what it means for my holdings, in plain language.`)}
                >
                  Explain this to me →
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="pg-foot">
        Mock data for demonstration. Nothing here is investment advice — the Guardian surfaces context and never
        recommends a trade.
      </footer>
    </div>
  );
}

const CSS = `
.pg-root {
  color-scheme: light;
  --surface: #fcfcfb;
  --plane: #f9f9f7;
  --ink: #0b0b0b;
  --ink-2: #52514e;
  --ink-muted: #898781;
  --rule: #e1e0d9;
  --ring: rgba(11,11,11,0.10);
  --series-1: #2a78d6;
  --series-2: #eb6834;
  --series-3: #1baf7a;
  --series-4: #eda100;
  --series-5: #e87ba4;
  --status-critical: #d03b3b;
  --status-serious: #ec835a;
  --status-warning: #fab219;
  --up: #006300;
  --down: #d03b3b;
  background: var(--plane);
  color: var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (prefers-color-scheme: dark) {
  .pg-root:not([data-mode="light"]) {
    color-scheme: dark;
    --surface: #1a1a19; --plane: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7;
    --ink-muted: #898781; --rule: #2c2c2a; --ring: rgba(255,255,255,0.10);
    --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70;
    --series-4: #c98500; --series-5: #d55181;
    --up: #0ca30c; --down: #e66767;
  }
}
.pg-root[data-mode="dark"] {
  color-scheme: dark;
  --surface: #1a1a19; --plane: #0d0d0d; --ink: #ffffff; --ink-2: #c3c2b7;
  --ink-muted: #898781; --rule: #2c2c2a; --ring: rgba(255,255,255,0.10);
  --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70;
  --series-4: #c98500; --series-5: #d55181;
  --up: #0ca30c; --down: #e66767;
}

.pg-root * { box-sizing: border-box; }
.pg-empty { padding: 40px; text-align: center; color: var(--ink-muted); }

.pg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pg-head h1 { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: -0.01em; }
.pg-sub { margin: 2px 0 0; font-size: 12px; color: var(--ink-2); }
.pg-pill {
  font-size: 11px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--ring); color: var(--ink-2); background: var(--surface); white-space: nowrap;
}

.pg-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.pg-stat {
  background: var(--surface); border: 1px solid var(--ring); border-radius: 10px;
  padding: 12px 14px; display: flex; flex-direction: column; gap: 2px;
}
.pg-stat--hero { grid-column: span 1; }
.pg-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-muted); }
.pg-stat-value { font-size: 22px; font-weight: 620; letter-spacing: -0.02em; }
.pg-stat--hero .pg-stat-value { font-size: 26px; }
.pg-stat-foot { font-size: 11px; color: var(--ink-2); }
.pg-up { color: var(--up); }
.pg-down { color: var(--down); }
.pg-flat { color: var(--ink-2); }

.pg-card { background: var(--surface); border: 1px solid var(--ring); border-radius: 12px; padding: 16px; }
.pg-card h2 { margin: 0 0 12px; font-size: 13px; font-weight: 620; letter-spacing: 0.01em; }
.pg-note { margin: 10px 0 0; font-size: 12px; color: var(--ink-2); }
.pg-note--top { margin: -4px 0 12px; }

.pg-alloc { display: flex; gap: 2px; height: 10px; margin-bottom: 12px; }
.pg-alloc-seg { border-radius: 3px; }
.pg-alloc-cash { background: var(--rule); }
.pg-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; }
.pg-legend li { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.pg-swatch { width: 9px; height: 9px; border-radius: 2px; flex: none; }
.pg-legend-name { color: var(--ink-2); text-transform: capitalize; }
.pg-legend-val { font-variant-numeric: tabular-nums; color: var(--ink); font-weight: 550; }

.pg-table { display: flex; flex-direction: column; }
.pg-tr {
  display: grid; grid-template-columns: 1.4fr 1.1fr 0.9fr 0.7fr 0.8fr;
  gap: 8px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--rule);
}
.pg-tr:last-child { border-bottom: none; }
.pg-th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-muted); padding-bottom: 6px; }
.pg-pos { display: flex; flex-direction: column; }
.pg-pos strong { font-size: 13px; font-weight: 620; }
.pg-pos em { font-style: normal; font-size: 11px; color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.pg-weight { display: flex; align-items: center; gap: 8px; }
.pg-weight-bar { flex: 1; height: 6px; background: var(--rule); border-radius: 3px; overflow: hidden; min-width: 30px; }
.pg-weight-bar span { display: block; height: 100%; background: var(--series-1); border-radius: 3px; }
.pg-weight em { font-style: normal; font-size: 11px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.pg-num { text-align: right; font-variant-numeric: tabular-nums; font-size: 12px; }

.pg-feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.pg-event { padding: 12px 0; border-bottom: 1px solid var(--rule); }
.pg-event:last-child { border-bottom: none; }
.pg-event--noise { opacity: 0.55; }
.pg-event-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 5px; }
.pg-band { font-size: 11px; font-weight: 600; }
.pg-driver, .pg-exposure {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-muted);
}
.pg-exposure { font-variant-numeric: tabular-nums; }
.pg-headline { margin: 0 0 4px; font-size: 13px; font-weight: 550; }
.pg-explain { margin: 0; font-size: 12px; color: var(--ink-2); }
.pg-why { margin: 4px 0 0; font-size: 12px; color: var(--ink-2); }
.pg-link {
  margin-top: 6px; padding: 0; border: none; background: none; cursor: pointer;
  color: var(--series-1); font-size: 11.5px; font-family: inherit; font-weight: 550;
}
.pg-link:hover { text-decoration: underline; }

.pg-foot { font-size: 11px; color: var(--ink-muted); text-align: center; padding-top: 2px; }

@media (max-width: 520px) {
  .pg-root { padding: 14px; }
  .pg-tr { grid-template-columns: 1.3fr 1fr 0.8fr; }
  .pg-tr > *:nth-child(3), .pg-tr > *:nth-child(5) { display: none; }
}
`;
