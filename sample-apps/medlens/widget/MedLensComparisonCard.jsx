import React from 'react';

/**
 * MedLensComparisonCard
 *
 * Renders the agent's synthesized multi-tool medicine report as a single
 * structured card. Stateless with respect to medical data — it only ever
 * displays what's in `payload`; it never calls openFDA/RxNorm itself.
 *
 * THEME TOKENS: every color/spacing/font value below is a CSS custom
 * property (--medlens-*) with a sensible fallback. Swap in NitroStack
 * Studio's real design-system tokens by defining these variables at a
 * parent scope (or renaming them to NitroStack's own token names) — do not
 * hardcode raw hex/px values here.
 *
 * Props:
 *   payload: {
 *     drugName: string,
 *     sections: {
 *       regulatory?, safety?, combination?, generic?, cost?
 *     },
 *     sourcesUsed: string[]
 *   }
 *   onSelectGenericOption?: (name: string) => void
 *     Called when the user clicks a generic option. NitroStack wires this to
 *     re-invoke the agent — the widget never navigates or fetches itself.
 */
export default function MedLensComparisonCard({ payload, onSelectGenericOption }) {
  if (!payload || !payload.drugName) {
    return (
      <div style={styles.card}>
        <p style={styles.emptyState}>No report to display yet.</p>
      </div>
    );
  }

  const { drugName, sections = {}, sourcesUsed = [] } = payload;
  const { regulatory, safety, combination, generic, cost } = sections;

  const hasBoxedWarning = Boolean(regulatory?.boxedWarning) || Boolean(safety?.boxedWarningSnippet);

  const namingReconciliation =
    regulatory?.brandName && regulatory?.genericName && regulatory.brandName !== regulatory.genericName
      ? `${regulatory.brandName} → ${regulatory.genericName}`
      : generic?.ingredientName && generic.ingredientName.toLowerCase() !== drugName.toLowerCase()
      ? `${drugName} → ${generic.ingredientName}`
      : null;

  return (
    <div style={styles.card}>
      {hasBoxedWarning && (
        <div style={styles.boxedWarningBanner} role="alert">
          <span style={styles.boxedWarningIcon} aria-hidden="true">⚠</span>
          <span>Boxed warning on file for this medicine — review safety details below.</span>
        </div>
      )}

      <header style={styles.header}>
        <h2 style={styles.drugName}>{drugName}</h2>
        {namingReconciliation && <p style={styles.namingLine}>{namingReconciliation}</p>}
      </header>

      {regulatory && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Regulatory</h3>
          <dl style={styles.dl}>
            {regulatory.manufacturer && (
              <Row label="Manufacturer" value={regulatory.manufacturer} />
            )}
            {regulatory.route && <Row label="Route" value={regulatory.route} />}
            {regulatory.pharmClass && <Row label="Class" value={regulatory.pharmClass} />}
          </dl>
          {regulatory.indicationSnippet && (
            <p style={styles.snippet}>{regulatory.indicationSnippet}</p>
          )}
        </section>
      )}

      {safety && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Safety</h3>
          {safety.warningsSnippet && <p style={styles.snippet}>{safety.warningsSnippet}</p>}
          {safety.contraindicationsSnippet && (
            <p style={styles.snippet}>
              <strong style={styles.inlineLabel}>Contraindications: </strong>
              {safety.contraindicationsSnippet}
            </p>
          )}
          {safety.topAdverseReactions?.length > 0 && (
            <ul style={styles.reactionList}>
              {safety.topAdverseReactions.map((r) => (
                <li key={r.term} style={styles.reactionItem}>
                  <span>{r.term}</span>
                  <span style={styles.reactionCount}>{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {combination && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Combination check</h3>
          <div
            style={{
              ...styles.combinationBadge,
              ...(combination.risky ? styles.combinationRisky : styles.combinationSafe),
            }}
          >
            <span aria-hidden="true">{combination.risky ? '⚠' : '✓'}</span>
            <span>
              {combination.risky
                ? `Potential interaction with ${combination.comparedDrug}`
                : `No documented interaction with ${combination.comparedDrug}`}
            </span>
          </div>
          <p style={styles.snippet}>{combination.recommendation}</p>
        </section>
      )}

      {(generic || cost) && (
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>Generic &amp; cost</h3>
          {generic?.ingredientName && (
            <p style={styles.snippet}>
              <strong style={styles.inlineLabel}>Ingredient: </strong>
              {generic.ingredientName}
            </p>
          )}
          {generic?.genericOptions?.length > 0 && (
            <ul style={styles.genericList}>
              {generic.genericOptions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    style={styles.genericOptionButton}
                    onClick={() => onSelectGenericOption && onSelectGenericOption(name)}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cost?.costSignal && (
            <p style={styles.snippet}>
              <strong style={styles.inlineLabel}>Cost signal: </strong>
              {cost.costSignal} — {cost.note}
            </p>
          )}
        </section>
      )}

      {sourcesUsed.length > 0 && (
        <footer style={styles.footer}>
          <span style={styles.footerLabel}>Sources: </span>
          {sourcesUsed.join(' · ')}
        </footer>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <>
      <dt style={styles.dt}>{label}</dt>
      <dd style={styles.dd}>{value}</dd>
    </>
  );
}

const styles = {
  card: {
    fontFamily: 'var(--medlens-font-body, inherit)',
    background: 'var(--medlens-surface, #fff)',
    color: 'var(--medlens-text, #1a1a1a)',
    border: '1px solid var(--medlens-border, #e2e2e2)',
    borderRadius: 'var(--medlens-radius, 12px)',
    padding: 'var(--medlens-spacing-lg, 20px)',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--medlens-spacing-md, 16px)',
  },
  emptyState: {
    margin: 0,
    color: 'var(--medlens-text-muted, #767676)',
  },
  boxedWarningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--medlens-warning-bg, #fdecea)',
    color: 'var(--medlens-warning-text, #8a1c13)',
    border: '1px solid var(--medlens-warning-border, #f3b7ae)',
    borderRadius: 'var(--medlens-radius-sm, 8px)',
    padding: '10px 12px',
    fontWeight: 600,
    fontSize: 14,
  },
  boxedWarningIcon: { fontSize: 16 },
  header: { display: 'flex', flexDirection: 'column', gap: 4 },
  drugName: { margin: 0, fontSize: 22, fontWeight: 700 },
  namingLine: {
    margin: 0,
    fontSize: 14,
    color: 'var(--medlens-text-muted, #666)',
  },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: {
    margin: 0,
    fontSize: 12,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--medlens-text-muted, #767676)',
    fontWeight: 700,
  },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: 12,
    rowGap: 4,
    margin: 0,
  },
  dt: { fontSize: 13, color: 'var(--medlens-text-muted, #767676)' },
  dd: { margin: 0, fontSize: 13 },
  snippet: { margin: 0, fontSize: 13.5, lineHeight: 1.5 },
  inlineLabel: { fontWeight: 600 },
  reactionList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  reactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '4px 8px',
    background: 'var(--medlens-subtle-bg, #f5f5f5)',
    borderRadius: 6,
  },
  reactionCount: { fontWeight: 600 },
  combinationBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    width: 'fit-content',
  },
  combinationRisky: {
    background: 'var(--medlens-warning-bg, #fdecea)',
    color: 'var(--medlens-warning-text, #8a1c13)',
  },
  combinationSafe: {
    background: 'var(--medlens-success-bg, #e7f6ec)',
    color: 'var(--medlens-success-text, #1b6b3a)',
  },
  genericList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  genericOptionButton: {
    font: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    background: 'var(--medlens-subtle-bg, #f5f5f5)',
    border: '1px solid var(--medlens-border, #e2e2e2)',
    borderRadius: 999,
    padding: '4px 10px',
    color: 'var(--medlens-accent, #2a5bd7)',
  },
  footer: {
    fontSize: 11.5,
    color: 'var(--medlens-text-muted, #8a8a8a)',
    borderTop: '1px solid var(--medlens-border, #e2e2e2)',
    paddingTop: 8,
  },
  footerLabel: { fontWeight: 600 },
};
