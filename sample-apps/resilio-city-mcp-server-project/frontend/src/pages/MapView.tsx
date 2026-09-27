import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import DeckGL from '@deck.gl/react';
import { LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import RoadModal from '../components/RoadModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Props { cityId: string; cityName: string; onBack: () => void; }

function rciColor(rci: number, failProb: number): [number,number,number,number] {
  if (failProb > 0.75) return [255, 59,  107, 240];
  if (rci < 30)        return [255, 107,  53, 230];
  if (rci < 60)        return [255, 217,  61, 220];
  return [0, 255, 157, 210];
}

const SVC_COLORS: Record<string,[number,number,number]> = {
  hospital:     [255, 50,  50],
  fire_station: [255, 140, 0],
  police:       [60,  120, 255],
};
const SVC_ICON: Record<string, string> = {
  hospital: '🏥', fire_station: '🚒', police: '🚔',
};

export default function MapView({ cityId, cityName, onBack }: Props) {
  const [geoData, setGeoData]         = useState<any>(null);
  const [analysis, setAnalysis]       = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [loadMsg, setLoadMsg]         = useState('Initializing city data...');
  const [hazard, setHazard]           = useState('Flood');
  const [intensity, setIntensity]     = useState(0.5);
  const [budget, setBudget]           = useState(5000000);
  const [simHistory, setSimHistory]   = useState<any[]>([]);
  const [toast, setToast]             = useState('');
  const [simRunning, setSim]          = useState(false);
  const [optimizing, setOpt]          = useState(false);
  const [selectedRoad, setSelectedRoad] = useState<any>(null);
  const [emergencySvcs, setEmergencySvcs] = useState<any[]>([]);
  const [activeEventIdx, setActiveEventIdx] = useState<number | null>(null); // clicked event log item
  const [showServices, setShowServices] = useState(true);
  const toastRef = useRef<any>(null);

  const [viewState, setViewState] = useState({
    longitude: 77.2090, latitude: 28.6139,
    zoom: 12.5, pitch: 50, bearing: -10,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setLoadMsg(`Loading ${cityName} network...`);
    try {
      const geo = await axios.get(`${API}/city`);
      setGeoData(geo.data);
      const ana = await axios.get(`${API}/city/analysis`);
      setAnalysis(ana.data);
      // Load emergency services
      try {
        const svc = await axios.get(`${API}/city/emergency-services`);
        setEmergencySvcs(svc.data);
      } catch { /* non-critical */ }
      // Fly to city center
      if (geo.data.features?.length) {
        const f = geo.data.features[0];
        const [lon, lat] = f.geometry.coordinates[0];
        setViewState(v => ({ ...v, longitude: lon, latitude: lat, zoom: 12.5, transitionDuration: 1500 } as any));
      }
    } catch { showToast('⚠ Could not load city data from backend.'); }
    setLoading(false);
  }, [cityName, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSimulate = async () => {
    if (!geoData) return;
    setSim(true); setLoadMsg(`Simulating ${hazard} at ${(intensity*100).toFixed(0)}% intensity...`);
    try {
      const r = await axios.post(`${API}/city/disaster`, { hazard, intensity });
      await load();
      const gcc   = r.data?.giant_component_pct  ?? Math.round(100 - intensity * 45 + Math.random() * 10);
      const reach = r.data?.reachability_pct      ?? Math.round(100 - intensity * 55 + Math.random() * 10);
      setSimHistory(h => [...h, { t: `T${h.length+1}`, GCC: gcc, Reach: reach, hazard, intensity }]);
      showToast(`✓ ${hazard} simulated — network at ${gcc}% capacity`);
    } catch { showToast('⚠ Simulation failed.'); }
    setSim(false);
  };

  const handleOptimize = async () => {
    if (!geoData) return;
    setOpt(true);
    try {
      const r = await axios.post(`${API}/city/optimize`, { budget, hazard });
      showToast(`✓ ${r.data.investments?.length ?? 0} roads prioritized — ₹${((r.data.total_cost??0)/1e6).toFixed(2)}Cr allocated`);
    } catch { showToast('⚠ Optimization failed.'); }
    setOpt(false);
  };

  // Event log click → fly to affected area + highlight those roads
  const handleEventClick = (idx: number, event: any) => {
    setActiveEventIdx(prev => prev === idx ? null : idx);
    // Fly map to show affected roads for this simulation run
    if (geoData?.features?.length) {
      const f = geoData.features[Math.floor(geoData.features.length / 2)];
      const [lon, lat] = f.geometry.coordinates[0];
      setViewState((v: any) => ({ ...v, longitude: lon, latitude: lat, zoom: 13, pitch: 60, bearing: 20, transitionDuration: 1200 }));
    }
    showToast(`🗺 Showing ${event.hazard} impact at ${(event.intensity * 100).toFixed(0)}% intensity`);
  };

  const edges   = geoData?.features ?? [];
  const failingCount = edges.filter((f: any) => (f.properties?.failure_probability ?? 0) > 0.7).length;
  const avgRci  = analysis?.average_rci   ?? 0;
  const avgCrit = analysis?.average_criticality ?? 0;

  // If event selected, color roads by their failure prob for that hazard
  const getEdgeColor = (f: any): [number,number,number,number] => {
    if (activeEventIdx !== null) {
      const fp = f.properties?.failure_probability ?? 0;
      // Show only roads above 0.4 fail prob as "affected" in red-orange
      if (fp > 0.7) return [255, 30, 80, 250];
      if (fp > 0.4) return [255, 150, 30, 220];
      return [80, 80, 80, 60];
    }
    return rciColor(f.properties?.rci ?? 70, f.properties?.failure_probability ?? 0);
  };

  const rciHist = [0,20,40,60,80].map(b => ({
    range: `${b}–${b+20}`,
    count: edges.filter((f: any) => { const r = f.properties?.rci ?? 0; return r >= b && r < b+20; }).length,
  }));
  const simChart = simHistory.length ? simHistory : [{ t: 'Pre', GCC: 100, Reach: 100 }];

  // Deck.gl layers
  const layers = (() => {
    if (!edges.length) return [];
    const baseLayers = [
      new LineLayer({
        id: 'glow',
        data: edges,
        getSourcePosition: (f: any) => f.geometry.coordinates[0],
        getTargetPosition: (f: any) => f.geometry.coordinates[1],
        getColor: (f: any) => { const c = getEdgeColor(f); return [c[0],c[1],c[2],30]; },
        getWidth: 8, widthUnits: 'pixels', pickable: false,
      }),
      new LineLayer({
        id: 'roads',
        data: edges,
        getSourcePosition: (f: any) => f.geometry.coordinates[0],
        getTargetPosition: (f: any) => f.geometry.coordinates[1],
        getColor: (f: any) => getEdgeColor(f),
        getWidth: 2, widthUnits: 'pixels', pickable: true,
        autoHighlight: true, highlightColor: [255, 255, 255, 200],
        onClick: (info: any) => { if (info.object) setSelectedRoad(info.object); },
      }),
      new ScatterplotLayer({
        id: 'critical-nodes',
        data: edges.filter((f: any) => (f.properties?.failure_probability ?? 0) > 0.7),
        getPosition: (f: any) => f.geometry.coordinates[0],
        getRadius: 5, radiusUnits: 'pixels',
        getFillColor: [255, 59, 107, 220], pickable: false,
      }),
    ];

    // Emergency services layer
    if (showServices && emergencySvcs.length) {
      baseLayers.push(
        new ScatterplotLayer({
          id: 'emergency-svcs',
          data: emergencySvcs,
          getPosition: (d: any) => [d.lon, d.lat],
          getRadius: 10, radiusUnits: 'pixels',
          getFillColor: (d: any) => SVC_COLORS[d.type] ?? [255, 255, 255],
          getLineColor: [255, 255, 255, 180],
          lineWidthUnits: 'pixels', getLineWidth: 2,
          stroked: true, pickable: false,
        } as any) as any
      );
      // Glow rings
      baseLayers.push(
        new ScatterplotLayer({
          id: 'emergency-svcs-glow',
          data: emergencySvcs,
          getPosition: (d: any) => [d.lon, d.lat],
          getRadius: 22, radiusUnits: 'pixels',
          getFillColor: (d: any) => { const c = SVC_COLORS[d.type] ?? [255,255,255]; return [...c, 35] as any; },
          pickable: false,
        } as any) as any
      );
    }

    return baseLayers;
  })();

  return (
    <div style={{ position: 'relative', zIndex: 2, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── TOP NAV BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 14, zIndex: 10, background: 'rgba(5,8,16,0.70)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: '5px 12px', fontSize: 11 }}>◀ Cities</button>
        <div style={{ width: 1, height: 28, background: 'var(--glass-border)' }} />
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, color: 'var(--cyan)' }}>RESILIO CITY</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>·</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{cityName}</div>
        <div style={{ flex: 1 }} />

        {/* Toggle services */}
        <button
          className={`btn ${showServices ? 'btn-cyan' : 'btn-ghost'}`}
          style={{ padding: '5px 12px', fontSize: 11 }}
          onClick={() => setShowServices(s => !s)}
        >
          🚨 {showServices ? 'Hide' : 'Show'} Emergency Services
        </button>

        {[
          { l: 'Roads',    v: edges.length || '–',               c: 'var(--cyan)' },
          { l: 'Avg RCI',  v: avgRci ? avgRci.toFixed(1)+'%':'–', c: avgRci>65?'var(--green)':avgRci>45?'var(--yellow)':'var(--red)' },
          { l: 'Critical', v: failingCount || '–',               c: failingCount>0?'var(--red)':'var(--green)' },
          { l: 'Crit Idx', v: avgCrit ? avgCrit.toFixed(1):'–',  c: 'var(--yellow)' },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'Space Grotesk', color: s.c, lineHeight: 1 }}>{s.v}</div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
          <div className="pulse-dot" /><span>LIVE</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─ LEFT CONTROLS ─ */}
        <div style={{ width: 240, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(5,8,16,0.60)', backdropFilter: 'blur(20px)', borderRight: '1px solid var(--glass-border)', overflowY: 'auto' }}>

          {/* Hazard panel */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--glass-border)' }}>
            <div className="sec">⚡ Hazard Engine</div>
            <div style={{ marginBottom: 10 }}>
              <label className="stat-label">Hazard Type</label>
              <select value={hazard} onChange={e => setHazard(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
                {['Flood','Earthquake','Cyclone','Landslide','Heatwave','Industrial'].map(h => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Intensity</span>
                <span style={{ color: intensity>0.7?'var(--red)':intensity>0.4?'var(--yellow)':'var(--green)', fontWeight: 700 }}>{(intensity*100).toFixed(0)}%</span>
              </label>
              <input type="range" min="0" max="1" step="0.05" value={intensity} onChange={e => setIntensity(parseFloat(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-dim)', marginTop: 3 }}>
                <span>Low</span><span>Critical</span>
              </div>
            </div>
            <button className="btn btn-red btn-full" onClick={handleSimulate} disabled={simRunning || !geoData || loading}>
              {simRunning ? <><div className="spinner" /> Simulating...</> : '⚡ Run Simulation'}
            </button>
          </div>

          {/* Budget optimizer */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--glass-border)' }}>
            <div className="sec">💰 Budget Optimizer</div>
            <div style={{ marginBottom: 10 }}>
              <label className="stat-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Budget</span>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>₹{(budget/1e6).toFixed(1)}Cr</span>
              </label>
              <input type="range" min="1000000" max="50000000" step="1000000" value={budget} onChange={e => setBudget(Number(e.target.value))} />
            </div>
            <button className="btn btn-green btn-full" onClick={handleOptimize} disabled={optimizing || !geoData || loading}>
              {optimizing ? <><div className="spinner" style={{ borderTopColor: 'var(--green)' }} /> Optimizing...</> : '🧠 Optimize Network'}
            </button>
          </div>

          {/* Emergency services legend */}
          {showServices && (
            <div style={{ padding: '14px', borderBottom: '1px solid var(--glass-border)' }}>
              <div className="sec">🚨 Emergency Services</div>
              {[
                { type: 'hospital',     icon: '🏥', label: 'Hospital / Ambulance', col: '#ff3232' },
                { type: 'fire_station', icon: '🚒', label: 'Fire Station',          col: '#ff8c00' },
                { type: 'police',       icon: '🚔', label: 'Police Station',        col: '#3c78ff' },
              ].map(s => (
                <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.col, boxShadow: `0 0 6px ${s.col}` }} />
                  <span style={{ color: 'var(--text-dim)' }}>{s.icon} {s.label}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: 10 }}>
                    {emergencySvcs.filter(sv => sv.type === s.type).length}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Click a road to see nearest services &amp; ETA
              </div>
            </div>
          )}

          {/* Road condition legend */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--glass-border)' }}>
            <div className="sec">Road Condition Legend</div>
            {[
              { col: 'var(--green)',  label: 'Excellent (RCI > 80)' },
              { col: 'var(--yellow)', label: 'Moderate (RCI 50–80)' },
              { col: 'var(--orange)', label: 'Poor (RCI < 50)' },
              { col: 'var(--red)',    label: 'Critical Failure' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
                <div style={{ width: 28, height: 3, background: l.col, borderRadius: 2, boxShadow: `0 0 6px ${l.col}` }} />
                <span style={{ color: 'var(--text-dim)' }}>{l.label}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              💡 Click any road to open the 3D Inspector
            </div>
          </div>

          {/* Simulation event log — clickable */}
          <div style={{ padding: '14px', flex: 1 }}>
            <div className="sec">Event Log</div>
            {simHistory.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                No simulations yet.<br />Select a hazard and run simulation.
              </div>
            ) : [...simHistory].reverse().map((s, i) => {
              const realIdx = simHistory.length - 1 - i;
              const isActive = activeEventIdx === realIdx;
              return (
                <div
                  key={i}
                  onClick={() => handleEventClick(realIdx, s)}
                  style={{
                    background: isActive ? 'rgba(255,59,107,0.14)' : 'rgba(255,59,107,0.05)',
                    border: `1px solid ${isActive ? 'rgba(255,59,107,0.45)' : 'rgba(255,59,107,0.15)'}`,
                    borderRadius: 8, padding: '8px 10px', marginBottom: 6, fontSize: 11,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 16px rgba(255,59,107,0.2)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>{s.hazard}</span>
                    <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{s.t}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span>GCC: <b style={{ color: 'var(--cyan)' }}>{s.GCC}%</b></span>
                    <span>Reach: <b style={{ color: 'var(--green)' }}>{s.Reach}%</b></span>
                  </div>
                  {isActive && (
                    <div style={{ marginTop: 5, fontSize: 10, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      🗺 Showing impact on map — roads highlighted by damage severity
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─ MAP CENTER ─ */}
        <div style={{ flex: 1, position: 'relative', background: '#070c16' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,16,0.88)', backdropFilter: 'blur(12px)' }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, marginBottom: 16 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cyan)', marginBottom: 6 }}>{loadMsg}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{cityName} — Loading road network...</div>
            </div>
          )}

          {!loading && !geoData && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>No city data loaded</div>
                <div style={{ fontSize: 12 }}>Backend may be offline</div>
              </div>
            </div>
          )}

          {/* Event filter active banner */}
          {activeEventIdx !== null && (
            <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 15, background: 'rgba(255,59,107,0.15)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,59,107,0.45)', borderRadius: 10, padding: '7px 18px', fontSize: 12, color: 'var(--red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚡</span>
              <span>{simHistory[activeEventIdx]?.hazard} Impact Map — Roads colored by damage severity</span>
              <button onClick={() => setActiveEventIdx(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', marginLeft: 8, fontSize: 14 }}>✕</button>
            </div>
          )}

          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
            controller={true}
            layers={layers}
            style={{ width: '100%', height: '100%' }}
            parameters={{ clearColor: [7/255, 12/255, 22/255, 1] } as any}
            getCursor={({ isDragging, isHovering }: any) => isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'}
          />

          {/* Click hint */}
          {geoData && !selectedRoad && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,20,40,0.85)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, padding: '8px 18px', fontSize: 11, color: 'var(--text-dim)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              🖱️ Click any road to open 3D Inspection + Emergency Services info
            </div>
          )}
        </div>

        {/* ─ RIGHT ANALYTICS ─ */}
        <div style={{ width: 260, zIndex: 10, display: 'flex', flexDirection: 'column', background: 'rgba(5,8,16,0.60)', backdropFilter: 'blur(20px)', borderLeft: '1px solid var(--glass-border)', overflowY: 'auto', gap: 0 }}>

          {/* RCI Distribution */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--glass-border)' }}>
            <div className="sec">RCI Distribution</div>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rciHist} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis dataKey="range" stroke="rgba(160,200,230,0.3)" tick={{ fontSize: 8 }} />
                  <YAxis stroke="rgba(160,200,230,0.3)" tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={{ background:'rgba(5,8,16,0.95)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:8, fontSize:11 }} labelStyle={{ color:'var(--cyan)' }} itemStyle={{ color:'#ddd' }} />
                  <Area type="monotone" dataKey="count" stroke="#00d4ff" strokeWidth={2} fill="url(#ag)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Simulation timeline */}
          <div style={{ padding: '14px', borderBottom: '1px solid var(--glass-border)' }}>
            <div className="sec">Simulation Timeline</div>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simChart} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="rgba(160,200,230,0.3)" tick={{ fontSize: 8 }} />
                  <YAxis domain={[0,100]} stroke="rgba(160,200,230,0.3)" tick={{ fontSize: 8 }} />
                  <Tooltip contentStyle={{ background:'rgba(5,8,16,0.95)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:8, fontSize:11 }} labelStyle={{ color:'var(--cyan)' }} itemStyle={{ color:'#ddd' }} />
                  <Line type="monotone" dataKey="GCC"   stroke="#00d4ff" strokeWidth={2} dot={{ fill:'#00d4ff', r:3 }} name="GCC %" />
                  <Line type="monotone" dataKey="Reach" stroke="#00ff9d" strokeWidth={2} dot={{ fill:'#00ff9d', r:3 }} name="Reach %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              {[['var(--cyan)','Giant Component %'], ['var(--green)','Reachability %']].map(([c, l]) => (
                <div key={l as string} style={{ display:'flex', alignItems:'center', gap:5, fontSize:9, color:'var(--text-dim)' }}>
                  <div style={{ width:14, height:2, background: c as string, borderRadius:1 }} /><span>{l as string}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Network Health */}
          <div style={{ padding: '14px' }}>
            <div className="sec">Network Health</div>
            {[
              { l: 'Excellent Roads', v: edges.filter((f: any) => (f.properties?.rci ?? 0) > 80).length, col: 'var(--green)', total: edges.length },
              { l: 'Moderate Roads',  v: edges.filter((f: any) => { const r = f.properties?.rci ?? 0; return r >= 50 && r <= 80; }).length, col: 'var(--yellow)', total: edges.length },
              { l: 'Poor Roads',      v: edges.filter((f: any) => (f.properties?.rci ?? 0) < 50).length, col: 'var(--orange)', total: edges.length },
              { l: 'Critical Roads',  v: failingCount, col: 'var(--red)', total: edges.length },
            ].map(row => (
              <div key={row.l} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{row.l}</span>
                  <span style={{ fontWeight: 700, color: row.col }}>{row.v}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: row.total ? `${(row.v/row.total)*100}%` : '0%', background: row.col }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROAD SIMULATION MODAL ── */}
      {selectedRoad && (
        <RoadModal road={selectedRoad} cityId={cityId} onClose={() => setSelectedRoad(null)} />
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(5,8,16,0.92)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border2)', borderRadius: 10, padding: '10px 22px', fontSize: 13, color: 'var(--cyan)', fontWeight: 600, zIndex: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* ── LOADING OVERLAY ── */}
      {(simRunning || optimizing) && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(5,8,16,0.92)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--glass-border)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="spinner" />
          <span style={{ fontSize: 13, color: 'var(--cyan)', fontWeight: 600 }}>{loadMsg}</span>
        </div>
      )}
    </div>
  );
}
