'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface DocumentChecklistItem {
  document: string;
  whereToObtain: string;
  copies: number;
  estimatedCostInr: number;
  notes: string;
}

interface AssetSpecificDoc {
  assetType: string;
  institutionType: string;
  documents: DocumentChecklistItem[];
}

interface ClaimRoadmapData {
  sharedDocuments: DocumentChecklistItem[];
  assetSpecificDocuments: AssetSpecificDoc[];
  deathCertificateCopiesNeeded: number;
  totalEstimatedCostInr: number;
  totalEstimatedDays: { min: number; max: number };
  costDriver: string;
  overallConfidence: 'regulatory' | 'institution_policy' | 'estimate';
  honestNote: string;
}

export default function ClaimRoadmap() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ClaimRoadmapData>();

  if (!isReady) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>
        Initializing...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: theme === 'dark' ? '#fff' : '#000' }}>
        Loading claim roadmap...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1a1a1a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e7eb';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'regulatory':
        return '#10b981';
      case 'institution_policy':
        return '#f59e0b';
      case 'estimate':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'regulatory':
        return 'Regulatory';
      case 'institution_policy':
        return 'Institution Policy';
      case 'estimate':
        return 'Estimate';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        background: bgColor,
        color: textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '600px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
          📋 Claim Roadmap
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: mutedColor }}>
          Timeline & document checklist for {data.assetSpecificDocuments.length} asset(s)
        </p>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '12px',
            background: isDark ? '#2d3748' : '#f3f4f6',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
          }}
        >
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
            Timeline
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {data.totalEstimatedDays.min}–{data.totalEstimatedDays.max} days
          </div>
        </div>
        <div
          style={{
            padding: '12px',
            background: isDark ? '#2d3748' : '#f3f4f6',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
          }}
        >
          <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
            Estimated Cost
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            ₹{data.totalEstimatedCostInr.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Death Certificate Callout */}
      <div
        style={{
          padding: '12px',
          background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '14px',
        }}
      >
        <strong>⚠️ Death Certificates:</strong> Get <strong>{data.deathCertificateCopiesNeeded} copies</strong> from the municipal office.
        Families routinely under-order — extra copies save a second trip.
      </div>

      {/* Asset-Specific Timeline */}
      {data.assetSpecificDocuments.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Assets & Documents
          </h3>
          {data.assetSpecificDocuments.map((asset, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '16px',
                paddingLeft: '24px',
                position: 'relative',
              }}
            >
              {/* Timeline dot and line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  border: `2px solid ${bgColor}`,
                  boxShadow: `0 0 0 2px #3b82f6`,
                }}
              />
              {idx < data.assetSpecificDocuments.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '5px',
                    top: '12px',
                    width: '2px',
                    height: '60px',
                    background: borderColor,
                  }}
                />
              )}

              {/* Asset card */}
              <div
                style={{
                  padding: '12px',
                  background: isDark ? '#2d3748' : '#f9fafb',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {asset.assetType}
                    </div>
                    <div style={{ fontSize: '12px', color: mutedColor }}>
                      {asset.institutionType}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      background: getConfidenceColor(data.overallConfidence),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    {getConfidenceLabel(data.overallConfidence)}
                  </div>
                </div>

                {/* Documents for this asset */}
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  <div style={{ color: mutedColor, marginBottom: '4px' }}>Documents needed:</div>
                  <ul style={{ margin: '0', paddingLeft: '16px', color: textColor }}>
                    {asset.documents.map((doc, docIdx) => (
                      <li key={docIdx} style={{ marginBottom: '4px' }}>
                        {doc.document} ({doc.copies} copy/copies)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared Documents */}
      {data.sharedDocuments.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Shared Documents (All Assets)
          </h3>
          <div
            style={{
              padding: '12px',
              background: isDark ? '#2d3748' : '#f9fafb',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              {data.sharedDocuments.map((doc, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>
                  <strong>{doc.document}</strong> ({doc.copies} copy/copies)
                  <div style={{ fontSize: '12px', color: mutedColor, marginTop: '2px' }}>
                    {doc.whereToObtain}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Honest Note */}
      <div
        style={{
          padding: '12px',
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: '8px',
          fontSize: '12px',
          color: mutedColor,
          lineHeight: '1.5',
        }}
      >
        <strong>📌 Important:</strong> {data.honestNote}
      </div>
    </div>
  );
}
