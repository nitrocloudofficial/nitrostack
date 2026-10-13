'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecallInformation {
  recall_number?: string;
  reason_for_recall?: string;
  classification?: string;
  recall_initiation_date?: string;
  recalling_firm?: string;
  product_description?: string;
}

interface CounterfeitWarning {
  batch_number?: string;
  drug?: string;
  reason?: string;
  reported_date?: string;
  severity?: string;
  source?: string;
}

interface AuthenticityData {
  drug_name: string;
  manufacturer: string | null;
  ndc_code: string | null;
  batch_number: string | null;
  authenticity_status:
    | 'verified'
    | 'flagged_recall'
    | 'flagged_reported_counterfeit'
    | 'unrecognized_product'
    | 'unable_to_verify';
  confidence: 'High' | 'Medium' | 'Low' | null;
  explanation: string;
  recall_information: RecallInformation | null;
  counterfeit_warning: CounterfeitWarning | null;
  source: string;
}

// ---------------------------------------------------------------------------
// Dev fallback data
// ---------------------------------------------------------------------------

const DEV_MOCK: AuthenticityData = {
  drug_name: 'Metformin',
  manufacturer: 'TEVA PHARMACEUTICALS USA INC',
  ndc_code: '0093-1075-01',
  batch_number: null,
  authenticity_status: 'verified',
  confidence: 'Medium',
  explanation: 'NDC code 0093-1075-01 is registered in the FDA NDC directory. No active recalls found. No batch number provided — counterfeit check skipped (confidence capped at Medium).',
  recall_information: null,
  counterfeit_warning: null,
  source: 'openFDA',
};

// ---------------------------------------------------------------------------
// Widget Component
// ---------------------------------------------------------------------------

export default function MedicationAuthenticityWidget() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const liveData = getToolOutput<AuthenticityData>();
  const data = liveData ?? (isReady ? null : DEV_MOCK);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#161616' : '#ffffff';
  const textColor = isDark ? '#f4f4f4' : '#161616';
  const secondaryColor = isDark ? '#c6c6c6' : '#525252';
  const borderColor = isDark ? '#393939' : '#e0e0e0';

  if (!data) {
    return <div style={{ padding: 16 }}>No data received from tool.</div>;
  }

  const status = data.authenticity_status;
  const isFlagged = status === 'flagged_recall' || status === 'flagged_reported_counterfeit';

  let statusColor = '#8d8d8d';
  let statusText = 'Unable to Verify';
  if (status === 'verified') {
    statusColor = '#24a148';
    statusText = 'Verified';
  } else if (isFlagged) {
    statusColor = '#da1e28';
    statusText = status === 'flagged_recall' ? 'Active Recall' : 'Counterfeit Report';
  } else if (status === 'unrecognized_product') {
    statusColor = '#f1c21b';
    statusText = 'Unrecognized Product';
  }

  let confidenceColor = '#8d8d8d';
  if (data.confidence === 'High') confidenceColor = '#24a148';
  if (data.confidence === 'Medium') confidenceColor = '#0043ce';
  if (data.confidence === 'Low') confidenceColor = '#da1e28';

  return (
    <div style={{
      backgroundColor: bgColor,
      color: textColor,
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${borderColor}`,
      fontFamily: 'sans-serif',
      maxWidth: '480px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: secondaryColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Medication Authenticity Check
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
            {data.drug_name}
          </div>
        </div>
        <div style={{
          backgroundColor: `${statusColor}22`,
          color: statusColor,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {statusText}
        </div>
      </div>

      {/* Warning/Info Box */}
      {(isFlagged || status === 'unrecognized_product' || status === 'unable_to_verify') && (
        <div style={{
          backgroundColor: isFlagged ? '#fff1f1' : '#fdf6dd',
          borderLeft: `4px solid ${isFlagged ? '#da1e28' : '#f1c21b'}`,
          padding: '12px',
          marginBottom: '16px',
          borderRadius: '4px',
          color: '#161616'
        }}>
          <strong>{isFlagged ? '⚠️ Alert:' : 'ℹ️ Notice:'}</strong> {data.explanation}
        </div>
      )}

      {/* Details Table */}
      <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '12px' }}>
        <table style={{ width: '100%', fontSize: '14px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <tbody>
            {data.manufacturer && (
              <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
                <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Manufacturer</th>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>{data.manufacturer}</td>
              </tr>
            )}
            {data.ndc_code && (
              <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
                <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>NDC Code</th>
                <td style={{ padding: '8px 0' }}><code>{data.ndc_code}</code></td>
              </tr>
            )}
            {data.batch_number && (
              <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
                <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Batch Number</th>
                <td style={{ padding: '8px 0' }}><code>{data.batch_number}</code></td>
              </tr>
            )}
            {data.confidence && (
              <tr style={{ borderBottom: `1px solid ${borderColor}55` }}>
                <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Confidence</th>
                <td style={{ padding: '8px 0' }}>
                  <span style={{ color: confidenceColor, fontWeight: 'bold' }}>{data.confidence}</span>
                </td>
              </tr>
            )}
            <tr>
              <th style={{ padding: '8px 0', color: secondaryColor, fontWeight: 'normal' }}>Data Source</th>
              <td style={{ padding: '8px 0' }}>{data.source}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recall Information */}
      {data.recall_information && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff1f1', borderRadius: '4px', border: '1px solid #ffb3b8', color: '#161616' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#da1e28', textTransform: 'uppercase', marginBottom: '8px' }}>
            Recall Details
          </div>
          <div style={{ fontSize: '13px' }}>
            {data.recall_information.recall_number && <div><strong>Recall #:</strong> {data.recall_information.recall_number}</div>}
            {data.recall_information.reason_for_recall && <div style={{ marginTop: '4px' }}><strong>Reason:</strong> {data.recall_information.reason_for_recall}</div>}
            {data.recall_information.classification && <div style={{ marginTop: '4px' }}><strong>Class:</strong> {data.recall_information.classification}</div>}
            {data.recall_information.recall_initiation_date && <div style={{ marginTop: '4px' }}><strong>Initiated:</strong> {data.recall_information.recall_initiation_date}</div>}
          </div>
        </div>
      )}

      {/* Counterfeit Information */}
      {data.counterfeit_warning && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff1f1', borderRadius: '4px', border: '1px solid #ffb3b8', color: '#161616' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#da1e28', textTransform: 'uppercase', marginBottom: '8px' }}>
            Counterfeit Registry Match
          </div>
          <div style={{ fontSize: '13px' }}>
            {data.counterfeit_warning.batch_number && <div><strong>Batch:</strong> {data.counterfeit_warning.batch_number}</div>}
            {data.counterfeit_warning.reason && <div style={{ marginTop: '4px' }}><strong>Reason:</strong> {data.counterfeit_warning.reason}</div>}
            {data.counterfeit_warning.reported_date && <div style={{ marginTop: '4px' }}><strong>Reported:</strong> {data.counterfeit_warning.reported_date}</div>}
            {data.counterfeit_warning.source && <div style={{ marginTop: '4px' }}><strong>Source:</strong> {data.counterfeit_warning.source}</div>}
          </div>
        </div>
      )}

      {/* Explanation for Verified */}
      {status === 'verified' && (
        <div style={{ marginTop: '16px', fontSize: '13px', color: secondaryColor, borderTop: `1px solid ${borderColor}`, paddingTop: '12px' }}>
          {data.explanation}
        </div>
      )}
    </div>
  );
}
