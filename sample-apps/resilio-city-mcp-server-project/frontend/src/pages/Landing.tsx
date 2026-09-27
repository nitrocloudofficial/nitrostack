import { useEffect, useState } from 'react';
import axios from 'axios';
import bgRoad from '../assets/bg_road.jpg';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface CityCard {
  id: string; name: string; subtitle: string; emoji: string; theme: string;
  total_roads: number; avg_rci: number; critical_roads: number;
  population_covered: number; last_survey: string;
  pending_repairs: number; budget_utilized_pct: number;
}

interface Props {
  onSelectCity: (cityId: string, cityName: string) => void;
}

function RciBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-bar" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: 'right', fontFamily: 'Space Grotesk' }}>{pct}%</span>
    </div>
  );
}

export default function Landing({ onSelectCity }: Props) {
  const [cities, setCities] = useState<CityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCity, setLoadingCity] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/cities`)
      .then(r => { setCities(r.data); setLoading(false); })
      .catch(() => { setError('Backend unreachable — start FastAPI on port 8000.'); setLoading(false); });
  }, []);

  const handleSelect = async (city: CityCard) => {
    setLoadingCity(city.id);
    setLoadingStage('Initializing city engine...');
    try {
      setTimeout(() => setLoadingStage('Loading road network...'), 300);
      setTimeout(() => setLoadingStage('Applying graph analysis...'), 900);
      setTimeout(() => setLoadingStage('Calibrating resilience metrics...'), 1500);
      await axios.get(`${API}/cities/${city.id}/load`);
      setLoadingStage('Rendering 3D map...');
      setTimeout(() => onSelectCity(city.id, city.name), 300);
    } catch {
      setError(`Failed to load ${city.name}`);
      setLoadingCity(null);
    }
  };

  const rciColor = (rci: number) =>
    rci >= 75 ? 'var(--green)' : rci >= 50 ? 'var(--yellow)' : 'var(--red)';

  const healthLabel = (rci: number) =>
    rci >= 75 ? ['GOOD', 'badge-green'] : rci >= 50 ? ['FAIR', 'badge-yellow'] : ['CRITICAL', 'badge-red'];

  // Global stats aggregated
  const totalRoads = cities.reduce((a, c) => a + c.total_roads, 0);
  const totalCritical = cities.reduce((a, c) => a + c.critical_roads, 0);
  const totalPop = cities.reduce((a, c) => a + c.population_covered, 0);
  const avgRci = cities.length ? (cities.reduce((a, c) => a + c.avg_rci, 0) / cities.length) : 0;
  const loadingCityObj = cities.find(c => c.id === loadingCity);

  return (
    <div style={{
      position: 'relative', zIndex: 2, width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      backgroundImage: `url(${bgRoad})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(180deg, rgba(3,6,16,0.85) 0%, rgba(5,10,22,0.75) 40%, rgba(3,6,16,0.90) 100%)',
      }} />

      {/* ── FULL-SCREEN CITY LOADING OVERLAY ── */}
      {loadingCity && (
        <div className="city-loading-overlay">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{loadingCityObj?.emoji ?? '🏙️'}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 22, color: loadingCityObj?.theme ?? 'var(--cyan)', marginBottom: 6 }}>
              {loadingCityObj?.name ?? 'Loading city...'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 24, letterSpacing: 1 }}>{loadingCityObj?.subtitle}</div>
          </div>
          <div className="city-loading-spinner" style={{ borderTopColor: loadingCityObj?.theme ?? 'var(--cyan)' }} />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{loadingStage}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {['Initializing', 'Roads', 'Analysis', 'Rendering'].map((s, i) => (
              <div key={s} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: loadingStage.toLowerCase().includes(s.toLowerCase()) ? (loadingCityObj?.theme ?? 'var(--cyan)') : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s ease',
                boxShadow: loadingStage.toLowerCase().includes(s.toLowerCase()) ? `0 0 8px ${loadingCityObj?.theme ?? 'var(--cyan)'}` : 'none',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Content wrapper — sits above overlay */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,100,200,0.2))', border: '1px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏙️</div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 22, color: 'var(--cyan)', letterSpacing: 1 }}>RESILIO CITY</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 2.5, textTransform: 'uppercase' }}>AI Infrastructure Resilience Platform</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
            <div className="pulse-dot" />
            <span>SYSTEM ONLINE</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </div>

      {/* ── GLOBAL STATS BAR ── */}
      <div style={{ padding: '0 32px 20px', display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Roads', val: totalRoads.toLocaleString(), color: 'var(--cyan)', icon: '🛣️' },
          { label: 'Avg Network RCI', val: avgRci.toFixed(1) + '%', color: rciColor(avgRci), icon: '📊' },
          { label: 'Critical Alerts', val: totalCritical, color: 'var(--red)', icon: '🚨' },
          { label: 'Population Covered', val: (totalPop/1e6).toFixed(1) + 'M', color: 'var(--purple)', icon: '👥' },
          { label: 'Cities Monitored', val: cities.length, color: 'var(--yellow)', icon: '📍' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ flex: 1, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label" style={{ marginBottom: 4 }}>{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 20 }}>{s.val}</div>
              </div>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="hr" style={{ margin: '0 32px 20px' }} />

      {/* ── SECTION TITLE ── */}
      <div style={{ padding: '0 32px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="sec" style={{ margin: 0 }}>Select City Network</div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }} />
        <div className="badge badge-cyan">5 Cities Available</div>
      </div>

      {/* ── CITY CARDS GRID ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, alignContent: 'start' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-dim)', padding: 60 }}>
            <div className="spinner" /> <span>Loading city data...</span>
          </div>
        ) : error ? (
          <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: 'var(--red)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{error}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Run: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>uvicorn main:app --reload</code> in the backend folder</div>
          </div>
        ) : cities.map(city => {
          const [healthText, healthClass] = healthLabel(city.avg_rci);
          const isLoading = loadingCity === city.id;
          return (
            <div
              key={city.id}
              className="glass"
              style={{
                padding: '18px', cursor: 'pointer', transition: 'all 0.22s ease',
                border: `1px solid ${loadingCity === city.id ? city.theme : 'var(--border)'}`,
                boxShadow: isLoading ? `0 0 40px ${city.theme}30` : '',
                transform: isLoading ? 'translateY(-2px)' : '',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${city.theme}88`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${city.theme}20`;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                if (!isLoading) {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid var(--border)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                }
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{city.emoji}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: city.theme }}>{city.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{city.subtitle}</div>
                </div>
                <span className={`badge ${healthClass}`}>{healthText}</span>
              </div>

              {/* RCI bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span className="stat-label" style={{ marginBottom: 0 }}>Avg RCI</span>
                </div>
                <RciBar pct={city.avg_rci} color={rciColor(city.avg_rci)} />
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                {[
                  { l: 'Total Roads', v: city.total_roads.toLocaleString() },
                  { l: 'Critical', v: city.critical_roads, c: city.critical_roads > 30 ? 'var(--red)' : 'var(--yellow)' },
                  { l: 'Pending Repairs', v: city.pending_repairs },
                  { l: 'Budget Used', v: `${city.budget_utilized_pct}%` },
                ].map(item => (
                  <div key={item.l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '7px 9px' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{item.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Space Grotesk', color: (item as any).c ?? 'var(--text)' }}>{item.v}</div>
                  </div>
                ))}
              </div>

              {/* Last survey */}
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 12 }}>
                Last Survey: <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{city.last_survey}</span>
              </div>

              {/* Budget utilization */}
              <div style={{ marginBottom: 14 }}>
                <div className="stat-label" style={{ marginBottom: 5 }}>Budget Utilization</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${city.budget_utilized_pct}%`, background: `linear-gradient(90deg, ${city.theme}, ${city.theme}88)` }} />
                </div>
              </div>

              {/* Action button */}
              <button
                className={`btn ${isLoading ? 'btn-cyan' : 'btn-ghost'} btn-full`}
                style={{ borderColor: city.theme, color: isLoading ? city.theme : city.theme + 'aa' }}
                onClick={() => handleSelect(city)}
                disabled={!!loadingCity}
              >
                {isLoading ? <><div className="spinner" style={{ borderTopColor: city.theme }} /> Loading...</> : '▶  Enter City'}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ padding: '10px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>
          RESILIO CITY v2.0 — AI-Powered Infrastructure Resilience &amp; Disaster Planning
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-dim)' }}>
          <span>🟢 API: Connected</span>
          <span>📡 Deck.GL: Active</span>
          <span>🧠 OR-Tools: Ready</span>
        </div>
      </div>
      {/* ── FOOTER end ── */}
    </div>
    {/* ── content wrapper end ── */}
  </div>
  );
}
