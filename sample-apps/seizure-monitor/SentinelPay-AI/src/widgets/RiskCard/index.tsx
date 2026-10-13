/**
 * SentinelPay AI — RiskCard Widget
 * Source: Technical Specification §3.1 (widgets/RiskCard), Phase 7 (Widgets)
 *
 * Presentational React component: renders a computed RiskResult. Plain
 * props in, plain JSX out — no NitroStack widget-runtime import, since
 * the exact widget integration syntax is an unverified platform item
 * (Appendix B). Wire this component into the NitroStack widget host once
 * that API is confirmed; nothing here needs to change to do so.
 *
 * Never renders the score as a certainty ("this transaction is fraud") —
 * always as a labeled prototype heuristic (§22 Claims Boundary).
 */

import type { RiskCardProps } from "./types";

const LEVEL_COLOR: Record<RiskCardProps["riskLevel"], string> = {
  LOW: "#1a7f37",
  MEDIUM: "#9a6700",
  HIGH: "#cf222e",
};

const FACTOR_LABEL: Record<RiskCardProps["factors"][number]["name"], string> = {
  beneficiaryMismatch: "Beneficiary mismatch",
  amountAnomaly: "Amount anomaly",
  policyViolation: "Policy violation",
};

export function RiskCard({ caseId, riskScore, riskLevel, factors }: RiskCardProps) {
  const color = LEVEL_COLOR[riskLevel];

  return (
    <div
      style={{
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: 16,
        maxWidth: 360,
        fontFamily: "system-ui, sans-serif",
      }}
      data-testid="risk-card"
    >
      <div style={{ fontSize: 12, color: "#57606a", marginBottom: 4 }}>{caseId}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color }}>{riskScore}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color, textTransform: "uppercase" }}>
          {riskLevel}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "#57606a", marginBottom: 12 }}>
        Prototype heuristic — not a validated fraud probability.
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
        {factors.map((factor) => (
          <li
            key={factor.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              opacity: factor.triggered ? 1 : 0.45,
            }}
          >
            <span>{FACTOR_LABEL[factor.name]}</span>
            <span>{factor.triggered ? `+${factor.weight}` : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RiskCard;
export type { RiskCardProps } from "./types";
