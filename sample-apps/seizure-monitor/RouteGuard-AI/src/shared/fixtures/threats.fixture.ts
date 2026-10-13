import { Threat, ThreatSeverity, ThreatType } from '../domain/threat.js';

/**
 * Mock threat data for testing and demo
 */

export const MOCK_THREATS: Threat[] = [
  {
    id: 'threat-001',
    type: ThreatType.WEATHER,
    severity: ThreatSeverity.HIGH,
    title: 'Typhoon Approaching Port of Shanghai',
    description: 'Category 4 typhoon expected to hit Shanghai port in 48 hours. Port authority has issued closure notice.',
    location: {
      lat: 31.4,
      lng: 121.5,
      region: 'East China Sea',
      port: 'Shanghai',
    },
    affectedRoutes: ['Shanghai-Rotterdam', 'Shanghai-Los Angeles', 'Shanghai-Singapore'],
    estimatedImpactStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    estimatedImpactEnd: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    source: 'weather_api',
    confidence: 0.95,
    detectedAt: new Date().toISOString(),
    tags: ['weather', 'port-closure', 'asia-pacific'],
  },
  {
    id: 'threat-002',
    type: ThreatType.PORT_STRIKE,
    severity: ThreatSeverity.MEDIUM,
    title: 'Port of Rotterdam Labor Strike',
    description: 'Dock workers union announced 5-day strike starting tomorrow. Cargo handling will be severely limited.',
    location: {
      lat: 51.95,
      lng: 4.1,
      region: 'Europe',
      port: 'Rotterdam',
    },
    affectedRoutes: ['Asia-Rotterdam', 'US-Rotterdam', 'Africa-Rotterdam'],
    estimatedImpactStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    estimatedImpactEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'port_authority',
    confidence: 0.88,
    detectedAt: new Date().toISOString(),
    tags: ['labor', 'port-strike', 'europe'],
  },
  {
    id: 'threat-003',
    type: ThreatType.MARITIME_CONGESTION,
    severity: ThreatSeverity.MEDIUM,
    title: 'Severe Congestion at Port of Singapore',
    description: 'Unexpected surge in container volume. Average wait time for berth: 8 days. Spot rates up 40%.',
    location: {
      lat: 1.35,
      lng: 103.82,
      region: 'Southeast Asia',
      port: 'Singapore',
    },
    affectedRoutes: ['China-Singapore', 'Singapore-Europe', 'Singapore-US'],
    estimatedImpactStart: new Date().toISOString(),
    estimatedImpactEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'port_authority',
    confidence: 0.92,
    detectedAt: new Date().toISOString(),
    tags: ['congestion', 'capacity', 'asia-pacific'],
  },
  {
    id: 'threat-004',
    type: ThreatType.GEOPOLITICAL,
    severity: ThreatSeverity.CRITICAL,
    title: 'Suez Canal Closure - Geopolitical Escalation',
    description: 'Military conflict in Red Sea region. Suez Canal Authority has suspended transits. Rerouting via Cape of Good Hope adds 10-14 days.',
    location: {
      lat: 29.96,
      lng: 32.58,
      region: 'Middle East',
      port: 'Suez',
    },
    affectedRoutes: ['Europe-Asia', 'Europe-Middle East', 'Europe-Africa'],
    estimatedImpactStart: new Date().toISOString(),
    estimatedImpactEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'news_feed',
    confidence: 0.99,
    detectedAt: new Date().toISOString(),
    tags: ['geopolitical', 'critical', 'suez-canal'],
  },
  {
    id: 'threat-005',
    type: ThreatType.CARRIER_FAILURE,
    severity: ThreatSeverity.HIGH,
    title: 'Evergreen Marine Fleet Grounding',
    description: 'Major container ship grounded in Strait of Malacca. 20,000 TEU capacity offline. Evergreen suspending bookings for 2 weeks.',
    location: {
      lat: 2.5,
      lng: 102.0,
      region: 'Southeast Asia',
      port: 'Malacca Strait',
    },
    affectedRoutes: ['China-Europe', 'China-US', 'Asia-Europe'],
    estimatedImpactStart: new Date().toISOString(),
    estimatedImpactEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    source: 'maritime_news',
    confidence: 0.97,
    detectedAt: new Date().toISOString(),
    tags: ['carrier-failure', 'capacity', 'asia-pacific'],
  },
];

export function getMockThreatById(id: string): Threat | undefined {
  return MOCK_THREATS.find(t => t.id === id);
}

export function getMockThreatsBySeverity(severity: ThreatSeverity): Threat[] {
  return MOCK_THREATS.filter(t => t.severity === severity);
}

export function getMockThreatsAffectingRoute(route: string): Threat[] {
  return MOCK_THREATS.filter(t => t.affectedRoutes.includes(route));
}
