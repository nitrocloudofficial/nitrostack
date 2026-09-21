/**
 * app/page.tsx — Main dashboard page
 *
 * Three-act live feed:
 *   Panel 1 (Scout) → Panel 2 (Analyst) → Panel 3 (Skeptic)
 *
 * Polls /api/pipeline every 3 seconds to pick up orchestrator state changes.
 * Demo-ready with seed data when orchestrator isn't running.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { PipelineState, AgentStage } from "../types";
import ScoutPanel from "../components/ScoutPanel";
import AnalystPanel from "../components/AnalystPanel";
import SkepticPanel from "../components/SkepticPanel";
import PipelineProgress from "../components/PipelineProgress";

const TICKERS = ["AAPL", "TSLA", "NVDA", "BTC"];
const POLL_INTERVAL_MS = 3000;

// History summary matches data/verdict-log-store.json (real Skeptic output)
const HISTORY_SUMMARY = [
  { ticker: "AAPL", verdict: "confirmed_signal", score: 61, direction: "bearish",  date: "Jul 25" },
  { ticker: "TSLA", verdict: "rejected_signal",  score: 72, direction: "bullish",  date: "Jul 25" },
  { ticker: "NVDA", verdict: "confirmed_signal", score: 45, direction: "bullish",  date: "Jul 25" },
  { ticker: "BTC",  verdict: "weakened_signal",  score: 78, direction: "bullish",  date: "Jul 25" },
];

const verdictStyle: Record<string, { label: string; cls: string }> = {
  confirmed_signal: { label: "Confirmed", cls: "confirmed" },
  weakened_signal:  { label: "Weakened",  cls: "weakened" },
  rejected_signal:  { label: "Rejected",  cls: "rejected" },
};

export default function Home() {
  const [activeTicker, setActiveTicker] = useState<string>("BTC"); // BTC = hero demo ticker
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [running, setRunning] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<string>("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = useCallback(async (ticker: string) => {
    try {
      const res = await fetch(`/api/pipeline?ticker=${ticker}`, { cache: "no-store" });
      if (res.ok) {
        const data: PipelineState = await res.json();
        setPipelineState(data);
        setLastPollTime(new Date().toLocaleTimeString());
        if (data.stage === "done" || data.stage === "error") {
          setRunning(false);
        }
      }
    } catch {
      // Network error — keep current state
    }
  }, []);

  // Switch ticker
  useEffect(() => {
    setPipelineState(null);
    setRunning(false);
    fetchState(activeTicker);
  }, [activeTicker, fetchState]);

  // Polling loop when pipeline is running
  useEffect(() => {
    if (!running) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => fetchState(activeTicker), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [running, activeTicker, fetchState]);

  const handleRun = async () => {
    setRunning(true);
    setPipelineState({
      ticker: activeTicker,
      stage: "scout",
      startedAt: new Date().toISOString(),
    });

    try {
      await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: activeTicker }),
      });
    } catch {
      // Non-fatal — seed data will be served by GET
    }

    // Immediately start polling
    // Simulate the staged progression in demo mode (orchestrator not running live)
    simulateDemoPipeline(activeTicker);
  };

  /**
   * simulateDemoPipeline — makes the widget panels reveal one-by-one
   * even without the real orchestrator running.
   * Each stage delay matches the orchestrator's SCOUT/ANALYST/SKEPTIC_DELAY_MS.
   */
  const simulateDemoPipeline = useCallback(async (ticker: string) => {
    // Scout phase
    setPipelineState((prev) => ({ ...prev!, ticker, stage: "scout" }));
    await sleep(3000);

    // Load Scout data
    const scoutRes = await fetch(`/api/pipeline?ticker=${ticker}`);
    const fullState: PipelineState = await scoutRes.json();

    // Show Scout findings, move to Analyst stage
    setPipelineState({
      ticker,
      stage: "analyst",
      findings: fullState.findings,
      startedAt: fullState.startedAt,
    });
    await sleep(4000);

    // Show Analyst signal, move to Skeptic
    setPipelineState({
      ticker,
      stage: "skeptic",
      findings: fullState.findings,
      signal: fullState.signal,
      startedAt: fullState.startedAt,
    });
    await sleep(3500);

    // Final — show all three
    setPipelineState({
      ticker,
      stage: "done",
      findings: fullState.findings,
      signal: fullState.signal,
      verdict: fullState.verdict,
      startedAt: fullState.startedAt,
      completedAt: new Date().toISOString(),
    });
    setRunning(false);
    setLastPollTime(new Date().toLocaleTimeString());
  }, []);

  const stage: AgentStage = pipelineState?.stage ?? "idle";
  const isActive = running || (stage !== "idle" && stage !== "done" && stage !== "error");

  return (
    <>
      {/* Animated background */}
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-1" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-2" aria-hidden="true" />
      <div className="bg-gradient-orb bg-gradient-orb-3" aria-hidden="true" />

      <div className="app-wrapper">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="header" role="banner">
          <div className="header-brand">
            <div className="header-logo" aria-hidden="true">⚡</div>
            <div>
              <div className="header-title">NitroSignal</div>
              <div className="header-subtitle">Multi-Agent Market Intelligence</div>
            </div>
          </div>

          <div className="header-status" aria-live="polite">
            <span
              className={`status-dot ${isActive ? "active" : stage === "error" ? "error" : ""}`}
              aria-label={isActive ? "Pipeline running" : "Pipeline idle"}
            />
            {isActive
              ? `${stage.charAt(0).toUpperCase() + stage.slice(1)} agent running...`
              : stage === "done"
              ? `Last updated ${lastPollTime}`
              : "Ready to run"}
          </div>
        </header>

        <main className="main-content" id="main-content">
          <h1 style={{ position: "absolute", left: "-9999px" }}>
            NitroSignal — Multi-Agent Market Intelligence Dashboard
          </h1>

          {/* ── Ticker selector ────────────────────────────────────────── */}
          <div className="ticker-bar" role="toolbar" aria-label="Ticker selection">
            <span className="ticker-label">Track:</span>
            {TICKERS.map((t) => (
              <button
                key={t}
                id={`ticker-btn-${t.toLowerCase()}`}
                className={`ticker-btn ${activeTicker === t ? "active" : ""}`}
                onClick={() => { if (!running) setActiveTicker(t); }}
                disabled={running}
                aria-pressed={activeTicker === t}
                aria-label={`Select ${t}`}
              >
                {t}
              </button>
            ))}

            <button
              id="run-pipeline-btn"
              className="run-btn"
              onClick={handleRun}
              disabled={running}
              aria-label={running ? "Pipeline is running" : `Run pipeline for ${activeTicker}`}
            >
              {running ? (
                <>
                  <span className="run-btn-spinner" aria-hidden="true" />
                  Running pipeline...
                </>
              ) : (
                <>⚡ Run Pipeline</>
              )}
            </button>
          </div>

          {/* ── Pipeline progress ───────────────────────────────────────── */}
          <PipelineProgress
            stage={pipelineState?.stage ?? "idle"}
            ticker={activeTicker}
          />

          {/* ── Three agent panels ─────────────────────────────────────── */}
          <section
            className="panels-grid"
            aria-label="Agent pipeline panels"
          >
            <ScoutPanel
              findings={pipelineState?.findings}
              stage={pipelineState?.stage ?? "idle"}
            />
            <AnalystPanel
              signal={pipelineState?.signal}
              stage={pipelineState?.stage ?? "idle"}
            />
            <SkepticPanel
              verdict={pipelineState?.verdict}
              stage={pipelineState?.stage ?? "idle"}
            />
          </section>

          {/* ── Historical signal log ──────────────────────────────────── */}
          <section className="history-section" aria-label="Historical signal log">
            <div className="history-header">
              <div className="history-title">
                <span>📋</span>
                Historical Signal Log
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Last 4 signals
              </span>
            </div>
            <div className="history-grid">
              {HISTORY_SUMMARY.map((h) => {
                const vs = verdictStyle[h.verdict];
                return (
                  <button
                    key={h.ticker}
                    id={`history-card-${h.ticker.toLowerCase()}`}
                    className="history-card"
                    onClick={() => { if (!running) setActiveTicker(h.ticker); }}
                    aria-label={`Load ${h.ticker} — ${vs.label} signal`}
                    style={{ textAlign: "left", cursor: "pointer" }}
                  >
                    <div className="history-card-ticker">{h.ticker}</div>
                    <span
                      className={`history-card-verdict`}
                      style={{
                        background: `var(--${vs.cls}-bg)`,
                        color: `var(--${vs.cls})`,
                      }}
                    >
                      {vs.label}
                    </span>
                    <div className="history-card-score">
                      Score: {h.score}/100 · {h.direction} · {h.date}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Disclaimer ─────────────────────────────────────────────── */}
          <aside className="disclaimer" role="note">
            <strong>Signal surfacing, not financial advice.</strong> NitroSignal surfaces news-driven signals and their reasoning chain to support human decision-making.
            It does not claim predictive accuracy and is not a recommendation to buy, sell, or hold any security or asset.
            All signals must be independently verified before acting on them.
          </aside>
        </main>
      </div>
    </>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
