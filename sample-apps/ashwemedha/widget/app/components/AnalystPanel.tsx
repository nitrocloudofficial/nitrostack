/**
 * AnalystPanel — Panel 2
 * Shows the Analyst Agent's signal score as a radial gauge,
 * direction badge, price reaction classification, and full reasoning.
 * Data source: signal_log Resource (via pipeline state).
 */

"use client";

import { useEffect, useState } from "react";
import type { SignalLog } from "../types";

interface AnalystPanelProps {
  signal?: SignalLog;
  stage: string;
}

// Radial SVG gauge
function SignalGauge({ score, direction }: { score: number; direction: string }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Animate the score counting up
    let start = 0;
    const end = score;
    const duration = 1200;
    const step = (end / duration) * 16;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setDisplayScore(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 70;
  const circumference = Math.PI * radius; // half circle
  const filled = (score / 100) * circumference;
  const dashoffset = circumference - filled;

  const getColor = () => {
    if (score >= 65) return "#68d391";       // bullish green
    if (score >= 35) return "#f8a859";       // watch amber
    return "#fc8181";                         // weak/rejected red
  };

  const cx = 90;
  const cy = 80;

  return (
    <div className="signal-gauge-wrap">
      <svg
        className="signal-gauge-svg"
        width="180"
        height="100"
        viewBox="0 0 180 100"
      >
        {/* Background arc */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
          className="gauge-track"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0,1 ${cx + radius},${cy}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* Score number */}
        <text x={cx} y={cy - 12} className="gauge-score" textAnchor="middle" fill={getColor()}>
          {displayScore}
        </text>
        <text x={cx} y={cy + 4} className="gauge-label" textAnchor="middle">
          / 100
        </text>
      </svg>

      <span className={`signal-direction-badge direction-${direction}`}>
        {direction === "bullish" ? "↑ Bullish" : direction === "bearish" ? "↓ Bearish" : "→ Neutral"}
      </span>
    </div>
  );
}

const reactionClass: Record<string, string> = {
  already_moved: "reaction-already",
  moving_now: "reaction-moving",
  not_yet_reacted: "reaction-not-yet",
};

const reactionLabel: Record<string, string> = {
  already_moved: "Already priced in",
  moving_now: "Moving now ⚡",
  not_yet_reacted: "Not yet reacted ✓",
};

export default function AnalystPanel({ signal, stage }: AnalystPanelProps) {
  const isLoading = stage === "analyst";
  const isDone = !!signal;

  return (
    <div className={`agent-panel analyst ${isDone ? "loaded" : ""}`}>
      <div className="panel-header">
        <span className="panel-icon">📊</span>
        <div className="panel-header-text">
          <div className="panel-name">Analyst Agent</div>
          <div className="panel-description">Price cross-check &amp; signal scoring</div>
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
          {isLoading ? "Analyzing..." : isDone ? "Done" : "Waiting"}
        </span>
      </div>

      <div className="panel-body">
        {isLoading && (
          <div className="loading-shimmer">
            <div className="skeleton-line" style={{ width: "50%", margin: "0 auto", height: "80px", borderRadius: "50%" }} />
            <div className="skeleton-line" style={{ width: "70%", animationDelay: "200ms" }} />
            <div className="skeleton-line" style={{ width: "90%", animationDelay: "400ms" }} />
          </div>
        )}

        {!isLoading && !isDone && (
          <div className="panel-empty">
            <span className="panel-empty-icon">📊</span>
            <span className="panel-empty-text">
              Waiting for Scout findings...
            </span>
          </div>
        )}

        {isDone && signal && (
          <>
            <SignalGauge score={signal.signal_score} direction={signal.signal_direction} />

            <div className="price-reaction-row">
              <span className="price-reaction-label">Price reaction:</span>
              <span className={`price-reaction-value ${reactionClass[signal.price_reaction]}`}>
                {reactionLabel[signal.price_reaction]}
              </span>
            </div>

            <div className="analyst-reasoning-box">
              <div className="analyst-reasoning-label">Analyst Reasoning</div>
              <p className="analyst-reasoning-text">{signal.reasoning}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
