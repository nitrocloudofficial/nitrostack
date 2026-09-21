'use client';

import { useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { ArrowRight, BadgeIndianRupee, Boxes, Factory, Leaf, Lightbulb, Target, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface WasteStreamUse {
  wasteStreamId: string;
  wasteStreamName: string;
  factoryId: string;
  factoryName: string;
  proportion: number;
}

interface ProductConcept {
  id: string;
  name: string;
  description: string;
  wasteStreamsUsed: WasteStreamUse[];
  manufacturingProcess: string;
  feasibilityScore: number;
  productionCostPerUnit: number;
  marketPricePerUnit: number;
  targetMarket: string;
  co2SavedTonsPerYear: number;
  revenuePotentialInrPerYear: number;
  status: 'New' | 'Evaluated' | 'Blueprint Ready' | 'Active';
}

interface ProductConceptData {
  success: boolean;
  products: ProductConcept[];
}

const formatCompactInr = (value: number) =>
  `INR ${(value / 100000).toFixed(value >= 1000000 ? 0 : 1)}L`;

function scoreColor(score: number) {
  if (score >= 80) return '#0f766e';
  if (score >= 60) return '#2563eb';
  if (score >= 40) return '#d97706';
  return '#dc2626';
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

export default function ProductCards() {
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<ProductConceptData>();
  const products = useMemo(() => [...(data?.products ?? [])].sort((a, b) => b.feasibilityScore - a.feasibilityScore), [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isReady) return <EmptyState message="Initializing product concepts..." />;
  if (!data) return <EmptyState message="Loading AI-invented product concepts..." />;
  if (!data.success || products.length === 0) return <EmptyState message="No product concepts have been generated yet. Run the Inventor agent to create marketable products." />;

  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  const unitMargin = selected.marketPricePerUnit - selected.productionCostPerUnit;
  const marginPercent = selected.marketPricePerUnit > 0 ? Math.round((unitMargin / selected.marketPricePerUnit) * 100) : 0;

  return (
    <main style={{
      maxWidth: '940px',
      margin: '0 auto',
      padding: '20px',
      color: '#111827',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
            <Lightbulb size={16} />
            Inventor output
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: '22px', letterSpacing: 0 }}>Product Concept Cards</h1>
        </div>
        <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 700 }}>{products.length} concepts ranked by feasibility</div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 330px', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {products.map((product) => {
            const isSelected = product.id === selected.id;
            const color = scoreColor(product.feasibilityScore);
            return (
              <button
                key={product.id}
                onClick={() => setSelectedId(product.id)}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${isSelected ? color : '#dbe4ef'}`,
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  padding: '14px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 10px 24px rgba(15, 23, 42, 0.12)' : 'none',
                  minHeight: '214px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
                  <span style={{ color, fontSize: '12px', fontWeight: 800 }}>{product.feasibilityScore}% feasible</span>
                  <span style={{ color: '#475569', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>{product.status}</span>
                </div>
                <h2 style={{ margin: '10px 0 6px', fontSize: '16px', lineHeight: 1.3 }}>{product.name}</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12px', lineHeight: 1.45, minHeight: '52px' }}>{product.description}</p>
                <div style={{ marginTop: '14px', display: 'grid', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#0f766e' }}><Leaf size={15} /> {product.co2SavedTonsPerYear} tons CO2/yr</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#2563eb' }}><BadgeIndianRupee size={15} /> {formatCompactInr(product.revenuePotentialInrPerYear)} revenue/yr</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#475569' }}><Target size={15} /> {product.targetMarket}</div>
                </div>
              </button>
            );
          })}
        </div>

        <aside style={{
          border: '1px solid #dbe4ef',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          padding: '16px',
          minHeight: '430px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', lineHeight: 1.3 }}>{selected.name}</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '12px', lineHeight: 1.45 }}>{selected.description}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800 }}>UNIT COST</div>
              <strong style={{ display: 'block', marginTop: '6px', color: '#dc2626' }}>INR {selected.productionCostPerUnit}</strong>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800 }}>MARKET PRICE</div>
              <strong style={{ display: 'block', marginTop: '6px', color: '#0f766e' }}>INR {selected.marketPricePerUnit}</strong>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800 }}>
              <span>Gross margin</span>
              <span style={{ color: marginPercent >= 25 ? '#0f766e' : '#d97706' }}>{marginPercent}%</span>
            </div>
            <div style={{ marginTop: '8px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, marginPercent))}%`, backgroundColor: marginPercent >= 25 ? '#0f766e' : '#d97706' }} />
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 8px', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>Waste Inputs</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {selected.wasteStreamsUsed.map((stream) => (
                <div key={stream.wasteStreamId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong><Boxes size={14} style={{ verticalAlign: 'text-bottom', marginRight: '5px', color: '#7c3aed' }} />{stream.wasteStreamName}</strong>
                    <span style={{ color: '#0f766e', fontWeight: 800 }}>{stream.proportion}%</span>
                  </div>
                  <div style={{ marginTop: '5px', color: '#64748b' }}><Factory size={13} style={{ verticalAlign: 'text-bottom', marginRight: '5px' }} />{stream.factoryName}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'grid', gap: '8px' }}>
            <div style={{ color: '#475569', fontSize: '12px' }}><Wrench size={14} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />{selected.manufacturingProcess}</div>
            <button
              onClick={() => callTool('get-pathway', { opportunityId: selected.id })}
              style={{
                border: 0,
                borderRadius: '8px',
                backgroundColor: '#111827',
                color: '#ffffff',
                padding: '11px 12px',
                cursor: 'pointer',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              View Pathway <ArrowRight size={16} />
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
