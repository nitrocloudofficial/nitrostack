/**
 * SentinelPay AI — EvidenceTimeline Widget
 * Source: Technical Specification §3.1 (widgets/EvidenceTimeline), §8 (evidence
 *         before inference), §8.7/§8.8 (missing/conflicting evidence)
 *
 * Presentational only — renders whatever Evidence[] the investigation
 * pipeline produced. Never re-derives or edits evidence: this is a
 * read-only view, matching the "evidence before inference" principle.
 */

import type { EvidenceItemView, EvidenceTimelineProps } from "./types";

const SEVERITY_COLOR: Record<EvidenceItemView["severity"], string> = {
  LOW: "#57606a",
  MEDIUM: "#9a6700",
  HIGH: "#cf222e",
};

const TYPE_LABEL: Record<EvidenceItemView["type"], string> = {
  BENEFICIARY_MISMATCH: "Beneficiary mismatch",
  AMOUNT_ANOMALY: "Amount anomaly",
  DUPLICATE_INVOICE: "Duplicate invoice",
  POLICY_VIOLATION: "Policy violation",
  INCOMPLETE_EVIDENCE: "Incomplete evidence",
  DATA_CONFLICT: "Data conflict",
};

export function EvidenceTimeline({ caseId, evidence }: EvidenceTimelineProps) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 420 }} data-testid="evidence-timeline">
      <div style={{ fontSize: 12, color: "#57606a", marginBottom: 8 }}>Evidence — {caseId}</div>
      {evidence.length === 0 ? (
        <div style={{ fontSize: 13, color: "#57606a" }}>No anomalous evidence recorded.</div>
      ) : (
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {evidence.map((item) => (
            <li
              key={item.evidenceId}
              style={{
                borderLeft: `3px solid ${SEVERITY_COLOR[item.severity]}`,
                paddingLeft: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{TYPE_LABEL[item.type]}</div>
              <div style={{ fontSize: 11, color: SEVERITY_COLOR[item.severity], marginBottom: 4 }}>
                {item.severity}
              </div>
              <div style={{ fontSize: 12, color: "#24292f" }}>
                {Object.entries(item.observations).map(([key, value]) => (
                  <div key={key}>
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#8c959f", marginTop: 4 }}>
                Sources: {item.sources.join(", ")}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default EvidenceTimeline;
export type { EvidenceTimelineProps } from "./types";
