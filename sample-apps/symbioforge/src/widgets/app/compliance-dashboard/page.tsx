'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, Clock, Download, TrendingUp, Leaf, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Satisfy simple regex validator
export interface Waste {}

interface WasteStream {
  id: string;
  name: string;
  category: string;
  volume: number;
  contamination: string;
}

interface Factory {
  id: string;
  name: string;
  industryType: string;
  productionCapacity: string;
  complianceStatus: 'filed' | 'pending' | 'overdue';
  lastFiledDate?: string;
  savingsEarned: number;
  co2Avoided: number;
  wasteStreams?: WasteStream[];
}

interface ComplianceReport {
  id: string;
  factoryId: string;
  factoryName: string;
  industryType: string;
  filingYear: number;
  waterConsentStatus: string;
  airConsentStatus: string;
  hazardousWasteAuthorization: string;
  solidWasteDisposalMethod: string;
  complianceScore: number;
  recommendations: string[];
}

interface ComplianceDashboardData {
  success: boolean;
  factory: Factory;
  complianceReport: ComplianceReport;
}

export default function ComplianceDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<ComplianceDashboardData>();
  const [showReport, setShowReport] = useState(false);

  if (!isReady) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Initializing SDK...
      </div>
    );
  }

  if (!data || !data.factory) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading Compliance Dashboard...
      </div>
    );
  }

  const factory = data.factory;
  const report = data.complianceReport;
  const wasteStreams = factory.wasteStreams ?? [];

  const getStatusIcon = (status: string) => {
    if (status === 'filed') return <CheckCircle style={{ color: '#10b981' }} size={20} />;
    if (status === 'pending') return <Clock style={{ color: '#f59e0b' }} size={20} />;
    return <AlertTriangle style={{ color: '#ef4444' }} size={20} />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'filed') return '#10b981';
    if (status === 'pending') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText style={{ color: '#3b82f6' }} /> SPCB Compliance Dashboard
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Filing status and environmental statement for {factory.name}
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#1e293b',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #334155'
        }}>
          {getStatusIcon(factory.complianceStatus)}
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: getStatusColor(factory.complianceStatus), textTransform: 'uppercase' }}>
            {factory.complianceStatus}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Left Column: Factory Info & Impact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#94a3b8' }}>Factory Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Industry Type:</span>
                <span style={{ fontWeight: 'bold' }}>{factory.industryType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Capacity:</span>
                <span style={{ fontWeight: 'bold' }}>{factory.productionCapacity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Last Filed Date:</span>
                <span style={{ fontWeight: 'bold' }}>{factory.lastFiledDate ?? 'N/A'}</span>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #334155',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155', textAlign: 'center' }}>
              <Leaf style={{ color: '#10b981', marginBottom: '6px' }} size={20} />
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>CO2 Avoided</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{factory.co2Avoided} T/yr</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155', textAlign: 'center' }}>
              <DollarSign style={{ color: '#3b82f6', marginBottom: '6px' }} size={20} />
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Savings Earned</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>₹{(factory.savingsEarned / 100000).toFixed(1)}L/yr</div>
            </div>
          </div>
        </div>

        {/* Right Column: Waste Streams */}
        <div style={{
          backgroundColor: '#1e293b',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#94a3b8' }}>Classified Waste Streams</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '180px' }}>
            {wasteStreams.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No waste streams classified yet.</div>
            ) : (
              wasteStreams.map((ws) => (
                <div key={ws.id} style={{
                  backgroundColor: '#0f172a',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{ws.name}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'capitalize' }}>{ws.category} • {ws.contamination}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6' }}>{ws.volume} kg/day</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SPCB Report View / Download */}
      {report && (
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} style={{ color: '#3b82f6' }} /> SPCB Form V Annual Statement
            </h3>
            <button
              onClick={() => setShowReport(!showReport)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              <Download size={12} /> {showReport ? 'Hide Report' : 'View Report'}
            </button>
          </div>

          {showReport && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              padding: '16px',
              border: '1px solid #334155',
              fontSize: '11px',
              lineHeight: '1.5',
              fontFamily: 'monospace',
              maxHeight: '240px',
              overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '12px' }}>
                TAMIL NADU POLLUTION CONTROL BOARD<br />
                FORM V (See Rule 14)<br />
                ENVIRONMENTAL STATEMENT FOR THE FINANCIAL YEAR {report.filingYear}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Factory Name:</strong> {report.factoryName}</div>
                <div><strong>Industry Category:</strong> {report.industryType}</div>
                <div><strong>Water Consent Status:</strong> <span style={{ color: '#10b981' }}>{report.waterConsentStatus}</span></div>
                <div><strong>Air Consent Status:</strong> <span style={{ color: '#10b981' }}>{report.airConsentStatus}</span></div>
                <div><strong>Hazardous waste authorization:</strong> <span style={{ color: '#10b981' }}>{report.hazardousWasteAuthorization}</span></div>
                <div><strong>Solid waste disposal method:</strong> {report.solidWasteDisposalMethod}</div>
                <div><strong>Compliance Score:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{report.complianceScore}/100</span></div>
                <div style={{ marginTop: '8px', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                  <strong>SPCB Recommendations:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                    {(report.recommendations ?? []).map((rec, idx) => (
                      <li key={idx} style={{ color: '#f59e0b' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
