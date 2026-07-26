import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { CITY_CONFIGS } from './engine/cities.js';
import { loadOsmCity, CITY_OSM_CONFIG } from './engine/osm_loader.js';

/**
 * Standalone TypeScript REST API Server
 * 
 * Runs on port 3000 (matching React frontend default VITE_API_URL || 'http://localhost:3000').
 * Replaces the legacy Python FastAPI backend entirely WITHOUT touching any NitroStack files or MCP servers.
 */

const app = express();
app.use(cors());
app.use(express.json());

// In-memory global state for active simulated city
let activeCity: {
  city_id: string;
  city_name: string;
  nodes: Record<string, { id: string; lat: number; lon: number }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    name?: string;
    length?: number;
    lanes?: number;
    highway?: string;
    maxspeed?: number;
    rci?: number;
    criticality?: number;
    failure_probability?: number;
  }>;
  emergency_services: Array<any>;
} | null = null;

// Helper: Deterministic hash 0..1 from string
function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

// ─── 1. List Cities ──────────────────────────────────────────────────────────
app.get('/cities', (req: Request, res: Response): void => {
  const summaries = Object.keys(CITY_OSM_CONFIG).map((cid) => {
    const config = CITY_CONFIGS[cid] || { name: cid, theme: '#4fc3f7', subtitle: 'Urban Grid' };
    const h1 = hash01(cid + '_roads');
    const h2 = hash01(cid + '_rci');
    const h3 = hash01(cid + '_pop');
    const h4 = hash01(cid + '_budget');
    return {
      id: cid,
      name: config.name || cid,
      theme: config.theme || '#4fc3f7',
      subtitle: config.subtitle || 'Urban Grid Corridor',
      emoji: config.emoji || '🏙️',
      total_roads: Math.round(950 + h1 * 150),
      avg_rci: Math.round((60 + h2 * 25) * 10) / 10,
      critical_roads: Math.round(12 + h1 * 28),
      population_covered: Math.round(900000 + h3 * 3500000),
      last_survey: `2024-0${Math.floor(1 + h4 * 8)}-${Math.floor(10 + h1 * 18)}`,
      pending_repairs: Math.round(15 + h2 * 90),
      budget_utilized_pct: Math.round((40 + h4 * 48) * 10) / 10,
      cache_status: 'ready',
    };
  });
  res.json(summaries);
});

// ─── 2. Cache Status ────────────────────────────────────────────────────────
app.get('/cities/cache-status', (req: Request, res: Response): void => {
  const status: Record<string, string> = {};
  Object.keys(CITY_OSM_CONFIG).forEach((cid) => {
    status[cid] = 'ready';
  });
  res.json(status);
});

// ─── 3. Load City ───────────────────────────────────────────────────────────
app.get('/cities/:id/load', async (req: Request, res: Response): Promise<void> => {
  const cityId = String(req.params['id'] || '');
  if (!CITY_OSM_CONFIG[cityId] && !CITY_CONFIGS[cityId]) {
    res.status(404).json({ detail: `City '${cityId}' not found.` });
    return;
  }

  try {
    const rawCity = await loadOsmCity(cityId);

    // Enhance edges with analytics metrics if not present
    const enhancedEdges = rawCity.edges.map((edge: any, idx: number) => {
      const rciNoise = hash01(`${cityId}_rci_${edge.id || idx}`);
      const critNoise = hash01(`${cityId}_crit_${edge.id || idx}`);
      const failNoise = hash01(`${cityId}_fail_${edge.id || idx}`);
      return {
        ...edge,
        rci: edge.rci ?? Math.round((0.65 + rciNoise * 0.3) * 100) / 100,
        criticality: edge.criticality ?? Math.round((0.2 + critNoise * 0.7) * 100) / 100,
        failure_probability: edge.failure_probability ?? Math.round(failNoise * 0.25 * 100) / 100,
        lanes: edge.lanes || (critNoise > 0.8 ? 4 : 2),
        maxspeed: edge.maxspeed || 50,
      };
    });

    // Generate localized emergency services aligned within active city nodes
    const nodeList = Object.values(rawCity.nodes) as Array<{ id: string; lat: number; lon: number }>;
    const services: any[] = [];
    const serviceTypes = [
      { name: 'Central General Hospital', type: 'hospital', color: '#e53935', badge: 'H', details: 'Level 1 Trauma Center, 450 beds' },
      { name: 'St. Jude Medical Hub', type: 'hospital', color: '#e53935', badge: 'H', details: 'Regional Burn & Fracture Center, 220 beds' },
      { name: 'District Fire & Rescue 1', type: 'fire', color: '#fb8c00', badge: 'F', details: 'Heavy Rescue & Hazardous Material Response, 8 engines' },
      { name: 'Station 4 Rapid Fire Support', type: 'fire', color: '#fb8c00', badge: 'F', details: 'Fast Response Pumping Depot, 4 engines' },
      { name: 'Metro Police Command Hub', type: 'police', color: '#1e88e5', badge: 'P', details: 'Emergency Traffic Coordination & Riot Squad, 12 tactical patrol units' },
      { name: 'North Sector Patrol Post', type: 'police', color: '#1e88e5', badge: 'P', details: 'Road Blockade & Public Order Support, 6 rapid intervention units' },
    ];

    serviceTypes.forEach((svc, index) => {
      const targetNode = nodeList[Math.floor((index * 37 + 13) % nodeList.length)] || { lat: 28.6139, lon: 77.2090 };
      services.push({
        id: `svc_${index}`,
        name: svc.name,
        type: svc.type,
        lat: targetNode.lat + (hash01(`lat_${index}`) - 0.5) * 0.004,
        lon: targetNode.lon + (hash01(`lon_${index}`) - 0.5) * 0.004,
        color: svc.color,
        badge: svc.badge,
        details: svc.details,
      });
    });

    activeCity = {
      city_id: rawCity.city_id,
      city_name: rawCity.city_name || cityId,
      nodes: rawCity.nodes as Record<string, { id: string; lat: number; lon: number }>,
      edges: enhancedEdges,
      emergency_services: services,
    };

    res.json({
      message: `City '${activeCity.city_name}' loaded.`,
      nodes: Object.keys(activeCity.nodes).length,
      roads: activeCity.edges.length,
      city_id: activeCity.city_id,
      city_name: activeCity.city_name,
      source: 'TypeScript Standalone Engine (Instant)',
      cache_status: 'ready',
    });
  } catch (e: any) {
    console.error(`Failed loading city ${cityId}:`, e);
    res.status(500).json({ detail: `Error loading city: ${e.message || e}` });
  }
});

// ─── 4. Get City GeoJSON ────────────────────────────────────────────────────
app.get('/city', (req: Request, res: Response): void => {
  if (!activeCity || !activeCity.edges.length) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }

  const features = activeCity.edges.map((edge) => {
    const u = activeCity!.nodes[edge.source];
    const v = activeCity!.nodes[edge.target];
    if (!u || !v) return null;

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [u.lon, u.lat],
          [v.lon, v.lat],
        ],
      },
      properties: edge,
    };
  }).filter(Boolean);

  res.json({ type: 'FeatureCollection', features });
});

// ─── 5. Get City Analysis ───────────────────────────────────────────────────
app.get('/city/analysis', (req: Request, res: Response): void => {
  if (!activeCity || !activeCity.edges.length) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }

  const edges = activeCity.edges;
  const avg_rci = edges.reduce((acc, e) => acc + (e.rci || 0), 0) / edges.length;
  const avg_crit = edges.reduce((acc, e) => acc + (e.criticality || 0), 0) / edges.length;
  const critical = edges.filter((e) => (e.failure_probability || 0) > 0.7).length;

  res.json({
    average_rci: Math.round(avg_rci * 1000) / 1000,
    average_criticality: Math.round(avg_crit * 1000) / 1000,
    total_roads: edges.length,
    critical_roads: critical,
    city_id: activeCity.city_id,
    city_name: activeCity.city_name,
  });
});

// ─── 6. Get Single Road Detail ──────────────────────────────────────────────
app.get('/city/road/:road_id', (req: Request, res: Response): void => {
  if (!activeCity) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }
  const roadId = String(req.params['road_id'] || '');
  const road = activeCity.edges.find((e) => e.id === roadId);
  if (!road) {
    res.status(404).json({ detail: 'Road not found.' });
    return;
  }
  res.json(road);
});

// ─── 7. List Emergency Services ─────────────────────────────────────────────
app.get('/city/emergency-services', (req: Request, res: Response): void => {
  if (!activeCity) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }
  res.json(activeCity.emergency_services);
});

// ─── 8. Get Road Emergency ETAs ─────────────────────────────────────────────
app.get('/city/road/:road_id/emergency', (req: Request, res: Response): void => {
  if (!activeCity) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }

  const roadId = String(req.params['road_id'] || '');
  const road = activeCity.edges.find((e) => e.id === roadId);
  if (!road) {
    res.status(404).json({ detail: 'Road not found.' });
    return;
  }

  const src = activeCity.nodes[road.source];
  const tgt = activeCity.nodes[road.target];
  if (!src || !tgt) {
    res.status(400).json({ detail: 'Road nodes missing.' });
    return;
  }

  const midLat = (src.lat + tgt.lat) / 2;
  const midLon = (src.lon + tgt.lon) / 2;

  const nearest_services = activeCity.emergency_services.map((svc) => {
    const distMeters = Math.sqrt(Math.pow(midLat - svc.lat, 2) + Math.pow(midLon - svc.lon, 2)) * 111000;
    const speedMs = svc.type === 'hospital' ? 10 : 13;
    const trafficPenalty = 1.25;
    const timeSecs = Math.round((distMeters / speedMs) * trafficPenalty);

    const mins = Math.floor(timeSecs / 60);
    const secs = timeSecs % 60;
    const etaStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    return {
      id: svc.id,
      name: svc.name,
      type: svc.type,
      distance_meters: Math.round(distMeters),
      eta_seconds: timeSecs,
      eta_string: etaStr,
      details: svc.details,
    };
  }).sort((a, b) => a.eta_seconds - b.eta_seconds);

  res.json({
    road_id: road.id,
    road_name: road.name || 'Urban Road Segment',
    road_lat: midLat,
    road_lon: midLon,
    nearest_services,
  });
});

// ─── 9. Simulate Disaster ───────────────────────────────────────────────────
app.post('/city/disaster', (req: Request, res: Response): void => {
  if (!activeCity) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }

  const { hazard = 'flood', intensity = 'medium' } = req.body || {};
  const validHazard = (hazard === 'flood' || hazard === 'earthquake' || hazard === 'landslide') ? hazard : 'flood';
  const validIntensity = (intensity === 'low' || intensity === 'medium' || intensity === 'high') ? intensity : 'medium';

  const config = CITY_CONFIGS[activeCity.city_id] || {};
  const baseRate = validHazard === 'flood' ? (config.flood_base ?? 0.3) : validHazard === 'earthquake' ? (config.quake_base ?? 0.1) : (config.landslide_base ?? 0.08);
  const intensityMultiplier = validIntensity === 'high' ? 1.55 : validIntensity === 'medium' ? 1.0 : 0.55;
  const impactRate = Math.min(0.92, baseRate * intensityMultiplier);

  const totalNodes = Object.keys(activeCity.nodes).length;
  const totalEdges = activeCity.edges.length;
  const affectedNodes = Math.round(totalNodes * impactRate);
  const affectedEdges = Math.round(totalEdges * impactRate);

  const damageAdd = validIntensity === 'high' ? 0.65 : validIntensity === 'medium' ? 0.45 : 0.25;
  activeCity.edges.forEach((edge, index) => {
    const damageNoise = hash01(`${activeCity?.city_id}_damage_${edge.id || index}_${validHazard}_${validIntensity}`);
    if (damageNoise < impactRate) {
      edge.failure_probability = Math.min(0.99, Math.round(((edge.failure_probability || 0.1) + damageAdd + damageNoise * 0.2) * 100) / 100);
    }
  });

  const percentage_network_lost = Math.round(((affectedNodes / totalNodes * 0.45 + affectedEdges / totalEdges * 0.55) * 100) * 10) / 10;
  const resilience_score = Math.round(Math.max(0, Math.min(100, (1 - percentage_network_lost / 100) * 100 * (1 - baseRate * 0.25))) * 10) / 10;
  const recoveryHours = validIntensity === 'high' ? 120 : validIntensity === 'medium' ? 48 : 12;
  const estimated_recovery_time = Math.round(recoveryHours * (0.7 + percentage_network_lost / 100) * (1 + baseRate * 0.5));

  res.json({
    disaster_type: validHazard,
    intensity: validIntensity,
    affected_nodes: affectedNodes,
    affected_edges: affectedEdges,
    percentage_network_lost,
    resilience_score,
    estimated_recovery_time,
    summary: `${validHazard} (${validIntensity}) on ${activeCity.city_name}: ${affectedNodes}/${totalNodes} intersections and ${affectedEdges}/${totalEdges} road segments affected (${percentage_network_lost}% network loss). Resilience score ${resilience_score}/100; estimated recovery ~${estimated_recovery_time} hours.`,
  });
});

// ─── 10. Optimize Budget ────────────────────────────────────────────────────
app.post('/city/optimize', (req: Request, res: Response): void => {
  if (!activeCity || !activeCity.edges.length) {
    res.status(400).json({ detail: 'No city loaded yet.' });
    return;
  }

  const { budget = 1000000 } = req.body || {};
  const costPerRoad = 75000;
  const affordableCount = Math.floor(Number(budget) / costPerRoad);

  const highRisk = [...activeCity.edges]
    .filter((e) => (e.failure_probability || 0) > 0.4)
    .sort((a, b) => (b.failure_probability || 0) - (a.failure_probability || 0));

  const repairedRoads = highRisk.slice(0, affordableCount);
  repairedRoads.forEach((road) => {
    road.failure_probability = 0.05;
  });

  const costSpent = repairedRoads.length * costPerRoad;
  const remainingHighRisk = activeCity.edges.filter((e) => (e.failure_probability || 0) > 0.6).length;
  const improvedScore = Math.round(Math.max(10, Math.min(99, 100 - (remainingHighRisk / activeCity.edges.length) * 100)) * 10) / 10;

  res.json({
    repaired_roads_count: repairedRoads.length,
    repaired_road_ids: repairedRoads.map((r) => r.id),
    cost_spent: costSpent,
    remaining_budget: Math.max(0, Number(budget) - costSpent),
    new_resilience_score: improvedScore,
    summary: `Allocated $${costSpent.toLocaleString()} across ${repairedRoads.length} critical road segments, restoring network resilience score to ${improvedScore}/100.`,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🌐 Standalone TypeScript REST API Server running on http://0.0.0.0:${PORT}`);
});
