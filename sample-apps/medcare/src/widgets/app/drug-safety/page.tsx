'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneRiskFlag {
  gene: string;
  phenotype: string;
  severity: 'high' | 'moderate' | 'low';
  risk: string;
  recommendation: string;
  fda_boxed_warning: boolean;
}

interface DrugInteraction {
  interacting_drug: string;
  description: string;
  severity: 'high' | 'moderate' | 'low';
}

interface DrugSafetyData {
  patient_id: string;
  patient_name: string;
  medication: string;
  gene_risk_flags: GeneRiskFlag[];
  drug_interactions: DrugInteraction[];
  overall_risk: 'high' | 'moderate' | 'low' | 'none';
  warnings: string[];
  active_medications_count: number;
  genetic_markers_checked: string[];
  checked_at: string;
}

// ---------------------------------------------------------------------------
// Dev fallback data
// ---------------------------------------------------------------------------

const DEV_MOCK: DrugSafetyData = {
  patient_id: 'P001',
  patient_name: 'Arthur Krishnamurthy',
  medication: 'Warfarin',
  gene_risk_flags: [
    {
      gene: 'CYP2C19',
      phenotype: 'Poor Metabolizer',
      severity: 'high',
      risk: 'CYP2C19 is involved in S-warfarin metabolism. Poor metabolizers may have increased warfarin exposure and bleeding risk.',
      recommendation: 'Monitor INR closely. Use validated pharmacogenomic dosing algorithms.',
      fda_boxed_warning: false,
    },
  ],
  drug_interactions: [
    {
      interacting_drug: 'Metformin',
      description: 'Minor interaction. Metformin may slightly enhance anticoagulant effect of Warfarin.',
      severity: 'low',
    },
  ],
  overall_risk: 'high',
  warnings: ['🚨 HIGH RISK: One or more high-severity interactions detected. This medication requires immediate clinical review before use.'],
  active_medications_count: 3,
  genetic_markers_checked: ['CYP2C19', 'SLCO1B1'],
  checked_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Widget Component
// ---------------------------------------------------------------------------

export default function DrugSafetyWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const liveData = getToolOutput<DrugSafetyData>();
  const data = liveData ?? (isReady ? null : DEV_MOCK);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#161616' : '#ffffff';
  const textColor = isDark ? '#f4f4f4' : '#161616';
  const secondaryColor = isDark ? '#c6c6c6' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  if (!data) {
    return <div style={{ padding: 16 }}>No data received from tool.</div>;
  }

  const hasNoIssues =
    data.gene_risk_flags.length === 0 &&
    data.drug_interactions.length === 0 &&
    data.warnings.length === 0;

  let riskColor = '#8d8d8d';
  if (data.overall_risk === 'high') riskColor = '#da1e28';
  if (data.overall_risk === 'moderate') riskColor = '#f1c21b';
  if (data.overall_risk === 'low') riskColor = '#24a148';
  if (data.overall_risk === 'none') riskColor = '#24a148';

  const severityColor = (severity: string) => {
    if (severity === 'high') return '#da1e28';
    if (severity === 'moderate') return '#f1c21b';
    if (severity === 'low') return '#24a148';
    return '#8d8d8d';
  };

  return (
    <div style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      fontFamily: 'sans-serif',
      maxWidth: '520px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: secondaryColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Drug Safety Report — {data.patient_name}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
            {data.medication}
          </div>
        </div>
        <div style={{
          backgroundColor: `${riskColor}22`,
          color: riskColor,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {data.overall_risk === 'none' ? '✓ No Risk Found' : `${data.overall_risk.charAt(0).toUpperCase() + data.overall_risk.slice(1)} Risk`}
        </div>
      </div>

      {/* Markers checked */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: secondaryColor, marginRight: '4px' }}>Markers checked:</span>
        {data.genetic_markers_checked.length > 0 ? (
          data.genetic_markers_checked.map(gene => (
            <span key={gene} style={{ backgroundColor: '#0f62fe22', color: '#0f62fe', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
              {gene}
            </span>
          ))
        ) : (
          <span style={{ fontSize: '12px', color: secondaryColor }}>None on file</span>
        )}
      </div>

      {/* No issues state */}
      {hasNoIssues && (
        <div style={{
          backgroundColor: '#defbe6',
          border: '1px solid #24a148',
          padding: '12px',
          borderRadius: '4px',
          color: '#161616',
          marginBottom: '12px',
          fontSize: '14px'
        }}>
          ✅ No gene-drug conflicts or interactions detected for <strong>{data.medication}</strong> with this patient's profile.
        </div>
      )}

      {/* FDA Boxed Warning alert */}
      {data.warnings.some(w => w.includes('BLACK BOX')) && (
        <div style={{
          backgroundColor: '#fff1f1',
          border: '2px solid #da1e28',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '12px',
          color: '#161616'
        }}>
          {data.warnings.filter(w => w.includes('BLACK BOX')).map((w, i) => (
            <div key={i} style={{ fontSize: '13px', fontWeight: 'bold' }}>{w}</div>
          ))}
        </div>
      )}

      {/* Gene risk flags */}
      {data.gene_risk_flags.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: secondaryColor, textTransform: 'uppercase', marginBottom: '8px' }}>
            🧬 Gene-Drug Risk Flags ({data.gene_risk_flags.length})
          </div>
          <div style={{ borderTop: `1px solid ${borderColor}` }}>
            {data.gene_risk_flags.map((flag, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${borderColor}`, padding: '8px 0', display: 'flex' }}>
                <div style={{ width: '30%', paddingRight: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{flag.gene}</div>
                  <div style={{ fontSize: '12px', color: secondaryColor }}>{flag.phenotype}</div>
                  {flag.fda_boxed_warning && (
                    <div style={{ marginTop: '4px', fontSize: '10px', backgroundColor: '#da1e28', color: '#fff', padding: '2px 4px', borderRadius: '4px', display: 'inline-block' }}>
                      FDA Boxed Warning
                    </div>
                  )}
                </div>
                <div style={{ width: '50%', paddingRight: '8px', fontSize: '13px' }}>
                  <div style={{ marginBottom: '4px' }}>{flag.risk}</div>
                  <div style={{ fontSize: '12px', color: secondaryColor, fontStyle: 'italic' }}>Rec: {flag.recommendation}</div>
                </div>
                <div style={{ width: '20%', textAlign: 'right' }}>
                  <span style={{
                    backgroundColor: `${severityColor(flag.severity)}22`,
                    color: severityColor(flag.severity),
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {flag.severity.charAt(0).toUpperCase() + flag.severity.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drug-drug interactions */}
      {data.drug_interactions.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: secondaryColor, textTransform: 'uppercase', marginBottom: '8px' }}>
            ⚠️ Drug Interactions ({data.drug_interactions.length})
          </div>
          <div style={{ borderTop: `1px solid ${borderColor}` }}>
            {data.drug_interactions.map((interaction, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${borderColor}`, padding: '8px 0', display: 'flex' }}>
                <div style={{ width: '30%', paddingRight: '8px', fontSize: '14px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {interaction.interacting_drug}
                </div>
                <div style={{ width: '50%', paddingRight: '8px', fontSize: '13px' }}>
                  {interaction.description}
                </div>
                <div style={{ width: '20%', textAlign: 'right' }}>
                  <span style={{
                    backgroundColor: `${severityColor(interaction.severity)}22`,
                    color: severityColor(interaction.severity),
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {interaction.severity.charAt(0).toUpperCase() + interaction.severity.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General warnings (non-boxed) */}
      {data.warnings.filter(w => !w.includes('BLACK BOX')).length > 0 && (
        <div style={{ marginTop: '8px', borderTop: `1px solid ${borderColor}`, paddingTop: '8px' }}>
          {data.warnings.filter(w => !w.includes('BLACK BOX')).map((w, i) => (
            <div key={i} style={{ margin: '4px 0', fontSize: '13px', color: textColor }}>{w}</div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        color: secondaryColor,
        borderTop: `1px solid ${borderColor}`,
        paddingTop: '8px'
      }}>
        Checked {data.genetic_markers_checked.length} genetic marker(s) · {new Date(data.checked_at).toLocaleString()}
      </div>
    </div>
  );
}
