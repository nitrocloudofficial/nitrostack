'use client';

import { useWidgetSDK, useWidgetState } from '@nitrostack/widgets';
import { AlertTriangle, Boxes, Building2, CheckCircle2, Clock3, Factory, IndianRupee, Route, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Equipment {
  name: string;
  spec: string;
  costInr: number;
}

interface FacilityRequirements {
  spaceSqFt: number;
  powerKw: number;
  waterLpd: number;
  ventilation: string;
}

interface Blueprint {
  id: string;
  opportunityId: string;
  opportunityType: 'match' | 'product';
  title: string;
  steps: string[];
  equipment: Equipment[];
  facilityRequirements: FacilityRequirements;
  capexInr: number;
  paybackMonths: number;
  timelineWeeks: number;
  regulatoryNotes: string[];
}

interface PathwayData {
  success: boolean;
  message?: string;
  blueprint?: Blueprint;
}

const formatInr = (value: number) =>
  `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0)}`;

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: '24px',
      minHeight: '220px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: '#64748b',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      {message}
    </div>
  );
}

export default function PathwayViewer() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<PathwayData>();
  const [state, setState] = useWidgetState<{ tab: 'steps' | 'equipment' | 'regulatory' }>(() => ({
    tab: 'steps'
  }));

  if (!isReady) return <EmptyState message="Initializing pathway viewer..." />;
  if (!data) return <EmptyState message="Loading manufacturing pathway..." />;
  if (!data.success || !data.blueprint) {
    return <EmptyState message={data.message ?? 'No manufacturing pathway is available for this opportunity.'} />;
  }

  const blueprint = data.blueprint;
  const activeTab = state?.tab ?? 'steps';
  const tabs: Array<{ id: 'steps' | 'equipment' | 'regulatory'; label: string }> = [
    { id: 'steps', label: 'Steps' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'regulatory', label: 'Regulatory' }
  ];

  return (
    <main style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid #dbe4ef',
        flexWrap: 'wrap'
      }}>
        <div style={{ minWidth: 0, flex: '1 1 340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
            <Route size={16} />
            {blueprint.opportunityType} blueprint
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: '22px', lineHeight: 1.25, letterSpacing: 0 }}>
            {blueprint.title}
          </h1>
        </div>
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(92px, 1fr))',
          gap: '8px',
          flex: '1 1 300px'
        }}>
          {[
            { icon: <IndianRupee size={16} />, label: 'CAPEX', value: formatInr(blueprint.capexInr) },
            { icon: <Clock3 size={16} />, label: 'Timeline', value: `${blueprint.timelineWeeks} weeks` },
            { icon: <Zap size={16} />, label: 'Payback', value: `${blueprint.paybackMonths} months` }
          ].map((metric) => (
            <div key={metric.label} style={{
              border: '1px solid #dbe4ef',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              padding: '10px',
              minHeight: '74px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '10px', fontWeight: 700 }}>
                {metric.icon}
                {metric.label}
              </div>
              <div style={{ marginTop: '8px', color: '#0f172a', fontSize: '14px', fontWeight: 800 }}>{metric.value}</div>
            </div>
          ))}
        </section>
      </header>

      <section style={{
        marginTop: '16px',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 270px) 1fr',
        gap: '16px'
      }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ border: '1px solid #dbe4ef', borderRadius: '8px', backgroundColor: '#ffffff', padding: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Facility Requirements</h2>
            <div style={{ marginTop: '12px', display: 'grid', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Building2 size={16} color="#2563eb" /> {blueprint.facilityRequirements.spaceSqFt} sq ft</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Zap size={16} color="#f59e0b" /> {blueprint.facilityRequirements.powerKw} kW power</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><Factory size={16} color="#0f766e" /> {blueprint.facilityRequirements.waterLpd} L/day water</div>
              <div style={{ color: '#64748b', lineHeight: 1.45 }}>{blueprint.facilityRequirements.ventilation}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #dbe4ef', borderRadius: '8px', backgroundColor: '#ffffff', padding: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Opportunity ID</h2>
            <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 700, wordBreak: 'break-word' }}>{blueprint.opportunityId}</div>
          </div>
        </aside>

        <section style={{ border: '1px solid #dbe4ef', borderRadius: '8px', backgroundColor: '#ffffff', minWidth: 0 }}>
          <nav style={{ display: 'flex', borderBottom: '1px solid #dbe4ef', padding: '8px', gap: '6px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setState({ tab: tab.id })}
                style={{
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? '#0f766e' : '#dbe4ef',
                  backgroundColor: activeTab === tab.id ? '#ccfbf1' : '#ffffff',
                  color: activeTab === tab.id ? '#115e59' : '#475569',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: '16px', minHeight: '320px' }}>
            {activeTab === 'steps' && (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '12px' }}>
                {blueprint.steps.map((step, index) => (
                  <li key={step} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: '10px', alignItems: 'start' }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#0f766e',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800
                    }}>{index + 1}</span>
                    <span style={{ color: '#334155', fontSize: '13px', lineHeight: 1.5 }}>{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {activeTab === 'equipment' && (
              <div style={{ display: 'grid', gap: '10px' }}>
                {blueprint.equipment.map((item) => (
                  <article key={`${item.name}-${item.costInr}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '14px' }}><Boxes size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px', color: '#2563eb' }} />{item.name}</h3>
                      <strong style={{ color: '#0f766e', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatInr(item.costInr)}</strong>
                    </div>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '12px', lineHeight: 1.45 }}>{item.spec}</p>
                  </article>
                ))}
              </div>
            )}

            {activeTab === 'regulatory' && (
              <div style={{ display: 'grid', gap: '10px' }}>
                {blueprint.regulatoryNotes.map((note) => (
                  <div key={note} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '8px', color: '#334155', fontSize: '13px', lineHeight: 1.5 }}>
                    {note.toLowerCase().includes('hazardous') ? <AlertTriangle size={18} color="#d97706" /> : <CheckCircle2 size={18} color="#0f766e" />}
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
