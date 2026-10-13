'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

// --- Types ---

interface SourcingZoneData {
  name: string;
  distance_km: number;
  seller_count: number;
  total_available_kg: number;
  avg_price_per_kg: number;
  avg_grade: string;
  avg_trust_score: number;
  zone_score: number;
}

interface SupplierData {
  listing_id: string;
  factory_name: string;
  material_type: string;
  available_quantity_kg: number;
  price_per_kg: number;
  grade: string;
  distance_km: number;
  trust_score: number;
  is_negotiable: boolean;
  procurement_score: number;
  distance_score: number;
  price_score: number;
  grade_score: number;
  trust_score_normalized: number;
  quantity_score: number;
}

interface AllocationData {
  factory_name: string;
  allocated_kg: number;
  price_per_kg: number;
  cost: number;
  transport_cost_estimate: number;
  distance_km: number;
  grade: string;
  trust_score: number;
}

interface CombinationData {
  requirement: { material_type: string; quantity_kg: number };
  allocations: AllocationData[];
  total_cost: number;
  total_transport_cost: number;
  coverage_percent: number;
  unfulfilled_kg: number;
}

interface SearchStep {
  radius_km: number;
  suppliers_found: number;
  quantity_found_kg: number;
}

interface ProcurementPlanData {
  recommended_zones: SourcingZoneData[];
  ranked_suppliers: SupplierData[];
  supplier_combinations: CombinationData[];
  search_metadata: {
    radius_used_km: number;
    total_suppliers_found: number;
    total_available_quantity_kg: number;
    search_steps: SearchStep[];
  };
  ai_reasoning: string;
}

// --- Main Component ---

export default function ProcurementPlanWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();

  if (!isReady) return <div style={loadingStyle}>Running intelligent procurement analysis...</div>;

  const data = getToolOutput<ProcurementPlanData>();
  if (!data || (!data.ranked_suppliers?.length && !data.recommended_zones?.length)) {
    return <div style={emptyStyle(theme)}>No procurement results. Try broadening your search criteria.</div>;
  }

  const isDark = theme === 'dark';

  return (
    <div style={containerStyle(isDark)}>
      {/* ── Header ── */}
      <div style={headerStyle(isDark)}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: isDark ? '#fff' : '#111' }}>
          Procurement Plan
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <HeaderStat label="Suppliers" value={`${data.search_metadata.total_suppliers_found}`} isDark={isDark} />
          <HeaderStat label="Zones" value={`${data.recommended_zones.length}`} isDark={isDark} />
          <HeaderStat label="Radius" value={`${data.search_metadata.radius_used_km}km`} isDark={isDark} />
        </div>
      </div>

      {/* ── Search Progress ── */}
      {data.search_metadata.search_steps.length > 0 && (
        <div style={sectionStyle(isDark)}>
          <SectionTitle text="Progressive Search" isDark={isDark} />
          <div style={{ display: 'flex', gap: 6 }}>
            {data.search_metadata.search_steps.map((step) => (
              <div key={step.radius_km} style={searchStepStyle(isDark, step.radius_km === data.search_metadata.radius_used_km)}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{step.radius_km}km</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{step.suppliers_found} found</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{step.quantity_found_kg}kg</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Zone Intelligence ── */}
      {data.recommended_zones.length > 0 && (
        <div style={sectionStyle(isDark)}>
          <SectionTitle text="Recommended Sourcing Zones" isDark={isDark} />
          {data.recommended_zones.slice(0, 4).map((zone, i) => (
            <div key={zone.name} style={zoneCardStyle(isDark, i === 0)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={rankBadge(i === 0, isDark)}>#{i + 1}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
                      {zone.name}
                    </h4>
                    {i === 0 && <span style={bestPickBadge}>BEST PICK</span>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: isDark ? '#888' : '#888' }}>{zone.distance_km}km away</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                <ZoneMetric label="Sellers" value={`${zone.seller_count}`} isDark={isDark} />
                <ZoneMetric label="Available" value={`${zone.total_available_kg}kg`} isDark={isDark} />
                <ZoneMetric label="Avg Price" value={`₹${zone.avg_price_per_kg}`} isDark={isDark} highlight />
                <ZoneMetric label="Grade" value={zone.avg_grade} isDark={isDark} />
                <ZoneMetric label="Trust" value={`${zone.avg_trust_score}`} isDark={isDark} />
              </div>

              {/* Density bar */}
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: isDark ? '#222' : '#eee' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: i === 0 ? '#16a34a' : '#2563eb',
                  width: `${Math.min(100, zone.seller_count * 8)}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Multi-Supplier Combination ── */}
      {data.supplier_combinations.length > 0 && (
        <div style={sectionStyle(isDark)}>
          <SectionTitle text="Optimal Procurement Combination" isDark={isDark} />
          {data.supplier_combinations.map((combo, i) => (
            <div key={i} style={comboCardStyle(isDark)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>
                  {formatName(combo.requirement.material_type)} — {combo.requirement.quantity_kg}kg needed
                </h4>
                <CoverageBadge percent={combo.coverage_percent} isDark={isDark} />
              </div>

              {/* Allocation breakdown */}
              {combo.allocations.map((alloc, j) => (
                <div key={j} style={allocationRow(isDark)}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
                      {alloc.factory_name}
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#888' : '#888' }}>
                      Grade {alloc.grade} · Trust {alloc.trust_score} · {alloc.distance_km}km
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#93c5fd' : '#1e40af' }}>
                      {alloc.allocated_kg}kg
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#888' : '#888' }}>
                      ₹{alloc.price_per_kg}/kg
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#4ade80' : '#16a34a' }}>
                      ₹{alloc.cost.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#666' : '#999' }}>
                      +₹{alloc.transport_cost_estimate} transport
                    </div>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div style={totalRowStyle(isDark)}>
                <span>Total</span>
                <span style={{ fontWeight: 800 }}>
                  ₹{(combo.total_cost + combo.total_transport_cost).toLocaleString()}
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>
                    (material: ₹{combo.total_cost.toLocaleString()} + transport: ₹{combo.total_transport_cost.toLocaleString()})
                  </span>
                </span>
              </div>

              {combo.unfulfilled_kg > 0 && (
                <div style={warningStyle}>
                  ⚠ {combo.unfulfilled_kg}kg unfulfilled — consider expanding search radius or relaxing grade requirements.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Top Suppliers ── */}
      {data.ranked_suppliers.length > 0 && (
        <div style={sectionStyle(isDark)}>
          <SectionTitle text="Ranked Suppliers" isDark={isDark} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.ranked_suppliers.slice(0, 6).map((s, i) => (
              <div key={s.listing_id} style={supplierRowStyle(isDark)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 2 }}>
                  <span style={rankBadge(i === 0, isDark)}>#{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#111' }}>
                      {s.factory_name}
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#888' : '#888' }}>
                      {formatName(s.material_type)} · {s.distance_km}km
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <MiniMetric label="Price" value={`₹${s.price_per_kg}`} isDark={isDark} />
                  <MiniMetric label="Grade" value={s.grade} isDark={isDark} />
                  <MiniMetric label="Trust" value={`${s.trust_score}`} isDark={isDark} />
                  <MiniMetric label="Qty" value={`${s.available_quantity_kg}kg`} isDark={isDark} />
                </div>
                <div style={{ textAlign: 'right', minWidth: 60 }}>
                  <div style={scoreBadge(s.procurement_score)}>{s.procurement_score}</div>
                  <div style={{ fontSize: 10, color: isDark ? '#666' : '#999' }}>score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Reasoning ── */}
      {data.ai_reasoning && (
        <div style={reasoningSection(isDark)}>
          <SectionTitle text="AI Procurement Reasoning" isDark={isDark} />
          <div style={{ fontSize: 13, lineHeight: 1.7, color: isDark ? '#ccc' : '#444' }}>
            {data.ai_reasoning}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sub-Components ---

function HeaderStat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div style={{
      padding: '4px 12px', borderRadius: 6,
      background: isDark ? '#111' : '#f5f5f5',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: isDark ? '#888' : '#888' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#fff' : '#111' }}>{value}</div>
    </div>
  );
}

function SectionTitle({ text, isDark }: { text: string; isDark: boolean }) {
  return (
    <h4 style={{
      margin: '0 0 12px', fontSize: 13, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.5px',
      color: isDark ? '#93c5fd' : '#1e40af',
    }}>
      {text}
    </h4>
  );
}

function ZoneMetric({ label, value, isDark, highlight }: { label: string; value: string; isDark: boolean; highlight?: boolean }) {
  return (
    <div style={{
      padding: '6px 4px', borderRadius: 6, textAlign: 'center',
      background: highlight ? (isDark ? '#0d47a1' : '#e3f2fd') : (isDark ? '#111' : '#f5f5f5'),
    }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', color: isDark ? '#888' : '#888', marginBottom: 2 }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700,
        color: highlight ? (isDark ? '#93c5fd' : '#1e40af') : (isDark ? '#fff' : '#111'),
      }}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: isDark ? '#666' : '#999' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#ccc' : '#333' }}>{value}</div>
    </div>
  );
}

function CoverageBadge({ percent, isDark }: { percent: number; isDark: boolean }) {
  const color = percent >= 100 ? '#16a34a' : percent >= 75 ? '#f59e0b' : '#dc2626';
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
      color: '#fff', background: color,
    }}>
      {percent}% covered
    </span>
  );
}

// --- Utilities ---

function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Styles ---

const loadingStyle: React.CSSProperties = {
  padding: 32, textAlign: 'center', fontSize: 14, fontFamily: 'system-ui',
};

const emptyStyle = (theme: string | null): React.CSSProperties => ({
  padding: 40, textAlign: 'center', fontFamily: 'system-ui',
  color: theme === 'dark' ? '#999' : '#666', fontSize: 14,
});

const containerStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? '#000' : '#fff',
  color: isDark ? '#fff' : '#000',
  padding: 24, borderRadius: 12,
  fontFamily: 'system-ui, sans-serif',
  maxWidth: 800,
  border: `1px solid ${isDark ? '#333' : '#ddd'}`,
});

const headerStyle = (isDark: boolean): React.CSSProperties => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: 24, paddingBottom: 16,
  borderBottom: `1px solid ${isDark ? '#222' : '#eee'}`,
});

const sectionStyle = (isDark: boolean): React.CSSProperties => ({
  marginBottom: 24,
});

const searchStepStyle = (isDark: boolean, isActive: boolean): React.CSSProperties => ({
  padding: '8px 14px', borderRadius: 8, textAlign: 'center',
  background: isActive ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#111' : '#f5f5f5'),
  border: `1px solid ${isActive ? (isDark ? '#166534' : '#bbf7d0') : (isDark ? '#222' : '#eee')}`,
  color: isActive ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#999' : '#666'),
  flex: 1,
});

const zoneCardStyle = (isDark: boolean, isBest: boolean): React.CSSProperties => ({
  padding: 14, borderRadius: 10, marginBottom: 10,
  background: isBest ? (isDark ? '#041f0f' : '#f0fdf4') : (isDark ? '#0a0a0a' : '#fafafa'),
  border: `1px solid ${isBest ? (isDark ? '#166534' : '#bbf7d0') : (isDark ? '#1a1a1a' : '#eee')}`,
});

const rankBadge = (isBest: boolean, isDark: boolean): React.CSSProperties => ({
  width: 24, height: 24, borderRadius: '50%',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 800,
  background: isBest ? '#16a34a' : (isDark ? '#222' : '#e5e5e5'),
  color: isBest ? '#fff' : (isDark ? '#999' : '#666'),
  flexShrink: 0,
});

const bestPickBadge: React.CSSProperties = {
  padding: '1px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
  background: '#052e16', color: '#4ade80',
  textTransform: 'uppercase', letterSpacing: '0.3px',
  marginLeft: 6,
};

const comboCardStyle = (isDark: boolean): React.CSSProperties => ({
  padding: 16, borderRadius: 10, marginBottom: 12,
  background: isDark ? '#0a0a0a' : '#fafafa',
  border: `1px solid ${isDark ? '#1a1a1a' : '#eee'}`,
});

const allocationRow = (isDark: boolean): React.CSSProperties => ({
  display: 'flex', gap: 12, alignItems: 'center',
  padding: '8px 0',
  borderBottom: `1px solid ${isDark ? '#111' : '#f0f0f0'}`,
});

const totalRowStyle = (isDark: boolean): React.CSSProperties => ({
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginTop: 8, paddingTop: 10,
  fontSize: 14, fontWeight: 700,
  color: isDark ? '#4ade80' : '#16a34a',
});

const warningStyle: React.CSSProperties = {
  marginTop: 8, padding: '8px 12px', borderRadius: 6,
  background: '#451a03', color: '#fbbf24', fontSize: 12,
};

const supplierRowStyle = (isDark: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 12px', borderRadius: 8,
  background: isDark ? '#0a0a0a' : '#fafafa',
  border: `1px solid ${isDark ? '#1a1a1a' : '#eee'}`,
});

const scoreBadge = (score: number): React.CSSProperties => ({
  fontSize: 16, fontWeight: 800,
  color: score >= 70 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626',
});

const reasoningSection = (isDark: boolean): React.CSSProperties => ({
  padding: 18, borderRadius: 10, marginBottom: 12,
  background: isDark ? '#0a0f1a' : '#f0f4ff',
  border: `1px solid ${isDark ? '#1a2a4a' : '#c7d2fe'}`,
});
