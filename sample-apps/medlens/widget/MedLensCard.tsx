import React from "react";

/**
 * MedLens comparison card.
 *
 * Renders the agent's synthesized multi-tool report as one structured card.
 * Stateless with respect to medical data: it only displays whatever payload
 * it's given and never calls openFDA/RxNorm itself. Any section may be
 * absent — each block below guards on its own presence and renders nothing
 * (not an empty placeholder) when its data isn't there.
 *
 * Colors/spacing/type are expressed as CSS custom properties so this can be
 * dropped into any host design system by remapping the --medlens-* tokens
 * below to that system's real tokens — "NitroStack Studio" isn't an
 * environment available while building this, so there's nothing to bind to
 * directly yet.
 */

export interface AdverseReactionCount {
  term: string;
  count: number;
}

export interface MedLensReportPayload {
  drugName: string;
  sections: {
    regulatory?: {
      brandName?: string;
      genericName?: string;
      manufacturer?: string;
      route?: string;
      pharmClass?: string;
      boxedWarning: boolean;
      indicationSnippet?: string;
    };
    safety?: {
      warningsSnippet?: string;
      contraindicationsSnippet?: string;
      topAdverseReactions?: AdverseReactionCount[];
      boxedWarningSnippet?: string;
    };
    combination?: {
      risky: boolean;
      recommendation: string;
      comparedDrug?: string;
    };
    generic?: {
      rxcui?: string;
      resolvedTTY?: string;
      ingredientName?: string;
      genericOptions?: string[];
    };
    cost?: {
      costSignal: string;
      note: string;
    };
  };
  sourcesUsed: string[];
}

export interface MedLensCardProps {
  payload: MedLensReportPayload;
  /**
   * Called when the user clicks a generic-option name. Non-destructive:
   * this is a lookup request the host app re-invokes the agent with, not a
   * hardcoded navigation to a fixed page.
   */
  onRequestLookup?: (drugName: string) => void;
}

const rootStyle: React.CSSProperties = {
  // --medlens-* tokens: remap these to the host design system.
  ["--medlens-bg" as string]: "var(--surface-primary, #ffffff)",
  ["--medlens-border" as string]: "var(--border-subtle, #e2e2e5)",
  ["--medlens-text" as string]: "var(--text-primary, #1a1a1e)",
  ["--medlens-text-muted" as string]: "var(--text-secondary, #5c5c66)",
  ["--medlens-accent" as string]: "var(--accent-primary, #2f6fed)",
  ["--medlens-danger-bg" as string]: "var(--danger-surface, #fdecec)",
  ["--medlens-danger-border" as string]: "var(--danger-border, #e0554f)",
  ["--medlens-danger-text" as string]: "var(--danger-text, #9c2b26)",
  ["--medlens-ok-bg" as string]: "var(--success-surface, #eaf7ee)",
  ["--medlens-ok-border" as string]: "var(--success-border, #3fa360)",
  ["--medlens-ok-text" as string]: "var(--success-text, #1e6b3a)",
  ["--medlens-radius" as string]: "var(--radius-md, 10px)",
  ["--medlens-font" as string]: "var(--font-body, system-ui, sans-serif)",

  fontFamily: "var(--medlens-font)",
  color: "var(--medlens-text)",
  background: "var(--medlens-bg)",
  border: "1px solid var(--medlens-border)",
  borderRadius: "var(--medlens-radius)",
  padding: "16px 18px",
  maxWidth: 480,
  lineHeight: 1.45,
  fontSize: 14,
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--medlens-text-muted)",
        marginTop: 14,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

export function MedLensCard({ payload, onRequestLookup }: MedLensCardProps) {
  const { drugName, sections, sourcesUsed } = payload;

  const anyBoxedWarning =
    Boolean(sections.regulatory?.boxedWarning) || Boolean(sections.safety?.boxedWarningSnippet);

  const brandGenericLine =
    sections.regulatory?.brandName && sections.regulatory?.genericName
      ? `${sections.regulatory.brandName} → ${sections.regulatory.genericName}`
      : sections.generic?.ingredientName
      ? `${drugName} → ${sections.generic.ingredientName}`
      : undefined;

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div style={{ fontSize: 17, fontWeight: 700 }}>{drugName}</div>
      {brandGenericLine && (
        <div style={{ fontSize: 13, color: "var(--medlens-text-muted)", marginTop: 2 }}>{brandGenericLine}</div>
      )}

      {/* Boxed warning — always at top, never buried */}
      {anyBoxedWarning && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "var(--medlens-danger-bg)",
            border: "1px solid var(--medlens-danger-border)",
            color: "var(--medlens-danger-text)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⚠ Boxed warning on file for this drug — review before use.
          {sections.safety?.boxedWarningSnippet && (
            <div style={{ fontWeight: 400, marginTop: 4 }}>{sections.safety.boxedWarningSnippet}</div>
          )}
        </div>
      )}

      {/* Regulatory */}
      {sections.regulatory && (
        <div>
          <SectionHeading>Regulatory</SectionHeading>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px" }}>
            {sections.regulatory.manufacturer && (
              <>
                <dt style={{ color: "var(--medlens-text-muted)" }}>Manufacturer</dt>
                <dd style={{ margin: 0 }}>{sections.regulatory.manufacturer}</dd>
              </>
            )}
            {sections.regulatory.route && (
              <>
                <dt style={{ color: "var(--medlens-text-muted)" }}>Route</dt>
                <dd style={{ margin: 0 }}>{sections.regulatory.route}</dd>
              </>
            )}
            {sections.regulatory.pharmClass && (
              <>
                <dt style={{ color: "var(--medlens-text-muted)" }}>Class</dt>
                <dd style={{ margin: 0 }}>{sections.regulatory.pharmClass}</dd>
              </>
            )}
          </dl>
          {sections.regulatory.indicationSnippet && (
            <p style={{ marginTop: 6, marginBottom: 0 }}>{sections.regulatory.indicationSnippet}</p>
          )}
        </div>
      )}

      {/* Safety */}
      {sections.safety && (
        <div>
          <SectionHeading>Safety</SectionHeading>
          {sections.safety.warningsSnippet && <p style={{ margin: "0 0 6px" }}>{sections.safety.warningsSnippet}</p>}
          {sections.safety.contraindicationsSnippet && (
            <p style={{ margin: "0 0 6px" }}>
              <strong>Contraindications: </strong>
              {sections.safety.contraindicationsSnippet}
            </p>
          )}
          {sections.safety.topAdverseReactions && sections.safety.topAdverseReactions.length > 0 && (
            <div>
              <div style={{ color: "var(--medlens-text-muted)", marginBottom: 2 }}>Top reported reactions</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {sections.safety.topAdverseReactions.map((r) => (
                  <li key={r.term}>
                    {r.term} <span style={{ color: "var(--medlens-text-muted)" }}>({r.count})</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Combination check */}
      {sections.combination && (
        <div>
          <SectionHeading>Combination check{sections.combination.comparedDrug ? ` — vs ${sections.combination.comparedDrug}` : ""}</SectionHeading>
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: sections.combination.risky ? "var(--medlens-danger-bg)" : "var(--medlens-ok-bg)",
              border: `1px solid ${
                sections.combination.risky ? "var(--medlens-danger-border)" : "var(--medlens-ok-border)"
              }`,
              color: sections.combination.risky ? "var(--medlens-danger-text)" : "var(--medlens-ok-text)",
            }}
          >
            <strong>{sections.combination.risky ? "⚠ Possible interaction" : "✓ No documented interaction"}</strong>
            <div style={{ marginTop: 4, fontWeight: 400 }}>{sections.combination.recommendation}</div>
          </div>
        </div>
      )}

      {/* Generic / Cost */}
      {(sections.generic || sections.cost) && (
        <div>
          <SectionHeading>Generic &amp; cost</SectionHeading>
          {sections.generic?.ingredientName && (
            <p style={{ margin: "0 0 4px" }}>
              Ingredient: <strong>{sections.generic.ingredientName}</strong>
            </p>
          )}
          {sections.generic?.genericOptions && sections.generic.genericOptions.length > 0 && (
            <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>
              {sections.generic.genericOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => onRequestLookup?.(option)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--medlens-accent)",
                      textDecoration: "underline",
                      cursor: onRequestLookup ? "pointer" : "default",
                      font: "inherit",
                    }}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {sections.cost && (
            <p style={{ margin: 0, color: "var(--medlens-text-muted)" }}>
              <strong style={{ color: "var(--medlens-text)" }}>{sections.cost.costSignal}</strong> — {sections.cost.note}
            </p>
          )}
        </div>
      )}

      {/* Footer: sources, for auditability */}
      {sourcesUsed.length > 0 && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 8,
            borderTop: "1px solid var(--medlens-border)",
            fontSize: 11,
            color: "var(--medlens-text-muted)",
          }}
        >
          Sources: {sourcesUsed.join(" · ")}
        </div>
      )}
    </div>
  );
}

export default MedLensCard;
