/**
 * ScoutPanel — Panel 1
 * Shows the Scout Agent's findings: headline feed with sentiment tags,
 * narrative summary, entropy level, and mention velocity.
 * Data source: findings_board Resource (via pipeline state).
 */

"use client";

import type { FindingsBoard } from "../types";

interface ScoutPanelProps {
  findings?: FindingsBoard;
  stage: string;
}

export default function ScoutPanel({ findings, stage }: ScoutPanelProps) {
  const isLoading = stage === "scout";
  const isDone = !!findings;

  return (
    <div className={`agent-panel scout ${isDone ? "loaded" : ""}`}>
      <div className="panel-header">
        <span className="panel-icon">🔭</span>
        <div className="panel-header-text">
          <div className="panel-name">Scout Agent</div>
          <div className="panel-description">News &amp; sentiment scan</div>
        </div>
        <span
          className={`panel-badge ${
            isLoading
              ? "badge-running"
              : isDone
              ? "badge-done"
              : "badge-waiting"
          }`}
        >
          {isLoading ? "Scanning..." : isDone ? "Done" : "Waiting"}
        </span>
      </div>

      <div className="panel-body">
        {isLoading && (
          <div className="loading-shimmer">
            <div className="skeleton-line" style={{ width: "80%", animationDelay: "0ms" }} />
            <div className="skeleton-line" style={{ width: "60%", animationDelay: "150ms" }} />
            <div className="skeleton-line" style={{ width: "90%", animationDelay: "300ms" }} />
            <div className="skeleton-line" style={{ width: "70%", animationDelay: "450ms" }} />
          </div>
        )}

        {!isLoading && !isDone && (
          <div className="panel-empty">
            <span className="panel-empty-icon">🔭</span>
            <span className="panel-empty-text">
              Run the pipeline to start news scanning
            </span>
          </div>
        )}

        {isDone && findings && (
          <>
            {/* Headline feed */}
            {findings.headlines.map((h, i) => (
              <div
                className="headline-item"
                key={i}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="headline-meta">
                  <span className="headline-source">{h.source}</span>
                  <span
                    className={`sentiment-tag sentiment-${h.sentiment}`}
                  >
                    {h.sentiment_score >= 0 ? "+" : ""}
                    {h.sentiment_score.toFixed(2)}{" "}
                    {h.sentiment}
                  </span>
                </div>
                <p className="headline-text">{h.text}</p>
              </div>
            ))}

            {/* Narrative summary */}
            <div className="scout-summary-box">
              <div className="scout-summary-label">Narrative Summary</div>
              <p className="scout-summary-text">{findings.narrative_summary}</p>

              <div className="velocity-row">
                <span className="velocity-label">Mention velocity:</span>
                <span className={`velocity-badge velocity-${findings.mention_velocity}`}>
                  {findings.mention_velocity === "spiking" ? "⬆ " : findings.mention_velocity === "declining" ? "⬇ " : "→ "}
                  {findings.mention_velocity}
                </span>
              </div>

              {findings.narrative_entropy && (
                <div className="entropy-row">
                  <span className="entropy-label">Narrative entropy:</span>
                  <span className={`entropy-badge entropy-${findings.narrative_entropy}`}>
                    {findings.narrative_entropy === "high" ? "⚠ " : findings.narrative_entropy === "medium" ? "~ " : "✓ "}
                    {findings.narrative_entropy}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
