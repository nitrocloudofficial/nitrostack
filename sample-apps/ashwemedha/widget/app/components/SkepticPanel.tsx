/**
 * SkepticPanel — Panel 3
 * Shows the Skeptic Agent's adversarial challenge results:
 * three check items (credibility / recycled content / volume context),
 * raised challenges list, and the final verdict banner.
 * Data source: verdict_log Resource (via pipeline state).
 */

"use client";

import type { VerdictLog } from "../types";

interface SkepticPanelProps {
  verdict?: VerdictLog;
  stage: string;
}

const verdictConfig = {
  confirmed_signal: {
    label: "✅ Confirmed Signal",
    className: "verdict-confirmed",
    titleClass: "verdict-title-confirmed",
    emoji: "✅",
  },
  weakened_signal: {
    label: "⚠️ Weakened Signal",
    className: "verdict-weakened",
    titleClass: "verdict-title-weakened",
    emoji: "⚠️",
  },
  rejected_signal: {
    label: "❌ Rejected Signal",
    className: "verdict-rejected",
    titleClass: "verdict-title-rejected",
    emoji: "❌",
  },
};

export default function SkepticPanel({ verdict, stage }: SkepticPanelProps) {
  const isLoading = stage === "skeptic";
  const isDone = !!verdict;

  const vc = verdict ? verdictConfig[verdict.final_verdict] : null;

  return (
    <div className={`agent-panel skeptic ${isDone ? "loaded" : ""}`}>
      <div className="panel-header">
        <span className="panel-icon">⚖️</span>
        <div className="panel-header-text">
          <div className="panel-name">Skeptic Agent</div>
          <div className="panel-description">Adversarial signal challenge</div>
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
          {isLoading ? "Challenging..." : isDone ? "Done" : "Waiting"}
        </span>
      </div>

      <div className="panel-body">
        {isLoading && (
          <div className="loading-shimmer">
            <div className="skeleton-line" style={{ width: "100%", height: "48px", borderRadius: "8px", animationDelay: "0ms" }} />
            <div className="skeleton-line" style={{ width: "100%", height: "48px", borderRadius: "8px", animationDelay: "150ms" }} />
            <div className="skeleton-line" style={{ width: "100%", height: "48px", borderRadius: "8px", animationDelay: "300ms" }} />
          </div>
        )}

        {!isLoading && !isDone && (
          <div className="panel-empty">
            <span className="panel-empty-icon">⚖️</span>
            <span className="panel-empty-text">
              Waiting for Analyst signal...
            </span>
          </div>
        )}

        {isDone && verdict && vc && (
          <>
            {/* Three adversarial checks */}
            <div className="check-list">
              <div className="check-item" style={{ animationDelay: "0ms" }}>
                <span className="check-icon">
                  {verdict.credibility_check === "pass" ? "✅" : "🚨"}
                </span>
                <div className="check-content">
                  <div className="check-name">Source Credibility</div>
                  <div className="check-detail">
                    {verdict.credibility_check === "pass"
                      ? "All headline sources passed credibility check"
                      : "Low-credibility or press-release source detected"}
                  </div>
                </div>
                <span
                  className={`check-status ${
                    verdict.credibility_check === "pass" ? "check-pass" : "check-flagged"
                  }`}
                >
                  {verdict.credibility_check === "pass" ? "PASS" : "FLAGGED"}
                </span>
              </div>

              <div className="check-item" style={{ animationDelay: "80ms" }}>
                <span className="check-icon">
                  {verdict.recycled_content_check === "pass" ? "✅" : "🔁"}
                </span>
                <div className="check-content">
                  <div className="check-name">Recycled Content</div>
                  <div className="check-detail">
                    {verdict.recycled_content_check === "pass"
                      ? "Headline wording is original — no significant overlap with prior coverage"
                      : "High similarity to headlines from a prior period detected (>70%)"}
                  </div>
                </div>
                <span
                  className={`check-status ${
                    verdict.recycled_content_check === "pass" ? "check-pass" : "check-flagged"
                  }`}
                >
                  {verdict.recycled_content_check === "pass" ? "PASS" : "FLAGGED"}
                </span>
              </div>

              <div className="check-item" style={{ animationDelay: "160ms" }}>
                <span className="check-icon">
                  {verdict.volume_context_check === "organic" ? "✅" : "📅"}
                </span>
                <div className="check-content">
                  <div className="check-name">Volume Context</div>
                  <div className="check-detail">
                    {verdict.volume_context_check === "organic"
                      ? "Volume spike appears news-driven — no calendar event overlap"
                      : "Volume spike coincides with a known calendar event (earnings/expiry)"}
                  </div>
                </div>
                <span
                  className={`check-status ${
                    verdict.volume_context_check === "organic"
                      ? "check-organic"
                      : "check-calendar"
                  }`}
                >
                  {verdict.volume_context_check === "organic" ? "ORGANIC" : "CALENDAR"}
                </span>
              </div>
            </div>

            {/* Raised challenges (only show if any) */}
            {verdict.challenges_raised.length > 0 && (
              <div className="challenges-list">
                {verdict.challenges_raised.map((c, i) => (
                  <div className="challenge-item" key={i} style={{ animationDelay: `${(i + 3) * 80}ms` }}>
                    <span className="challenge-bullet">▸</span>
                    {c}
                  </div>
                ))}
              </div>
            )}

            {/* Final verdict banner */}
            <div className={`verdict-banner ${vc.className}`}>
              <div className={`verdict-title ${vc.titleClass}`}>
                {vc.emoji} {vc.label}
              </div>
              <p className="verdict-reasoning">{verdict.verdict_reasoning}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
