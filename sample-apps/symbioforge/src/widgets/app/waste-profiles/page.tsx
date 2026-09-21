'use client';

import { useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { AlertTriangle, BadgeCheck, Beaker, Factory, FileClock, Layers, Recycle, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface WasteStream {
  id: string;
  factoryId: string;
  factoryName: string;
  name: string;
  category: 'organic' | 'metallic' | 'polymeric' | 'chemical' | 'textile' | 'cellulosic';
  physicalForm: 'powder' | 'fiber' | 'liquid' | 'solid' | 'pellets' | 'film';
  volume: number;
  contamination: 'clean' | 'mild' | 'high' | 'hazardous';
  seasonalVariation: 'none' | 'summer_peak' | 'winter_peak' | 'monsoon_peak';
  reusePotential: number;
}

interface FactoryProfile {
  id: string;
  name: string;
  industryType: string;
  productionCapacity: string;
  declaredWastes: string[];
  wasteStreams?: WasteStream[];
  complianceStatus: 'filed' | 'pending' | 'overdue';
  savingsEarned: number;
  co2Avoided: number;
}

interface WasteProfileData {
  success: boolean;
  factories: FactoryProfile[];
}

const categoryColors: Record<string, string> = {
  organic: '#0f766e',
  metallic: '#64748b',
  polymeric: '#7c3aed',
  chemical: '#dc2626',
  textile: '#2563eb',
  cellulosic: '#65a30d'
};

function contaminationColor(level: string) {
  if (level === 'clean') return '#0f766e';
  if (level === 'mild') return '#2563eb';
  if (level === 'high') return '#d97706';
  return '#dc2626';
}

function seasonalLabel(value: string) {
  return value === 'none' ? 'Stable year-round' : value.replace('_', ' ');
}

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

export default function WasteProfiles() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<WasteProfileData>();
  const factories = useMemo(() => [...(data?.factories ?? [])].sort((a, b) => (b.wasteStreams?.length ?? 0) - (a.wasteStreams?.length ?? 0)), [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isReady) return <EmptyState message="Initializing waste profiles..." />;
  if (!data) return <EmptyState message="Loading classified waste streams..." />;
  if (!data.success || factories.length === 0) return <EmptyState message="No factories are available yet. Register factories to build waste profiles." />;

  const selected = factories.find((factory) => factory.id === selectedId) ?? factories[0];
  const streams = selected.wasteStreams ?? [];
  const maxVolume = Math.max(...streams.map((stream) => stream.volume), 1);
  const averageReuse = streams.length > 0
    ? Math.round(streams.reduce((total, stream) => total + stream.reusePotential, 0) / streams.length)
    : 0;

  return (
    <main style={{
      maxWidth: '960px',
      margin: '0 auto',
      padding: '20px',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
            <Recycle size={16} />
            Profiler output
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: '22px', letterSpacing: 0 }}>Waste Profile Cards</h1>
        </div>
        <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>{factories.length} factories classified</div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
        <aside style={{ display: 'grid', gap: '8px', alignContent: 'start', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
          {factories.map((factory) => {
            const count = factory.wasteStreams?.length ?? 0;
            const isSelected = factory.id === selected.id;
            return (
              <button
                key={factory.id}
                onClick={() => setSelectedId(factory.id)}
                style={{
                  border: `1px solid ${isSelected ? '#0f766e' : '#dbe4ef'}`,
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                  <Factory size={18} color={isSelected ? '#0f766e' : '#64748b'} />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: '13px', lineHeight: 1.25 }}>{factory.name}</strong>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{factory.industryType}</span>
                  </div>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '11px' }}>
                  <span>{count} streams</span>
                  <span style={{ textTransform: 'capitalize' }}>{factory.complianceStatus}</span>
                </div>
              </button>
            );
          })}
        </aside>

        <section style={{ display: 'grid', gap: '12px', minWidth: 0 }}>
          <div style={{ border: '1px solid #dbe4ef', borderRadius: '8px', backgroundColor: '#ffffff', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>{selected.name}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>{selected.productionCapacity}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(88px, 1fr))', gap: '8px', flex: '1 1 300px', maxWidth: '420px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800 }}>REUSE</div>
                  <strong style={{ color: '#0f766e' }}>{averageReuse}%</strong>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800 }}>CO2</div>
                  <strong style={{ color: '#0f766e' }}>{selected.co2Avoided} t/yr</strong>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px' }}>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800 }}>SAVINGS</div>
                  <strong style={{ color: '#2563eb' }}>INR {(selected.savingsEarned / 100000).toFixed(1)}L</strong>
                </div>
              </div>
            </div>
          </div>

          {streams.length === 0 ? (
            <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#ffffff', padding: '28px', color: '#64748b', textAlign: 'center' }}>
              This factory has declared waste streams, but classification has not completed yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {streams.map((stream) => {
                const color = categoryColors[stream.category] ?? '#475569';
                return (
                  <article key={stream.id} style={{ border: '1px solid #dbe4ef', borderRadius: '8px', backgroundColor: '#ffffff', padding: '14px', minHeight: '218px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', lineHeight: 1.3 }}>{stream.name}</h3>
                        <div style={{ marginTop: '6px', color, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                          <Layers size={14} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />{stream.category}
                        </div>
                      </div>
                      <span style={{
                        color: contaminationColor(stream.contamination),
                        backgroundColor: `${contaminationColor(stream.contamination)}18`,
                        borderRadius: '999px',
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {stream.contamination}
                      </span>
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
                        <span>Volume</span>
                        <span>{stream.volume} kg/day</span>
                      </div>
                      <div style={{ marginTop: '7px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(4, (stream.volume / maxVolume) * 100)}%`, height: '100%', backgroundColor: color }} />
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', display: 'grid', gap: '8px', color: '#475569', fontSize: '12px' }}>
                      <div><Beaker size={14} style={{ verticalAlign: 'text-bottom', marginRight: '6px', color: '#2563eb' }} />{stream.physicalForm}</div>
                      <div><FileClock size={14} style={{ verticalAlign: 'text-bottom', marginRight: '6px', color: '#d97706' }} />{seasonalLabel(stream.seasonalVariation)}</div>
                      <div><Sparkles size={14} style={{ verticalAlign: 'text-bottom', marginRight: '6px', color: '#0f766e' }} />{stream.reusePotential}% reuse potential</div>
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: stream.reusePotential >= 70 ? '#0f766e' : '#d97706', fontSize: '12px', fontWeight: 800 }}>
                      {stream.reusePotential >= 70 ? <BadgeCheck size={16} /> : <AlertTriangle size={16} />}
                      {stream.reusePotential >= 70 ? 'High-priority symbiosis input' : 'Needs preprocessing review'}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
