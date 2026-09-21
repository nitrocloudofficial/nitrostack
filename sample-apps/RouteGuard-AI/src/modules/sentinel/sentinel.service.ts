import { Injectable } from '@nitrostack/core';
import { Threat, ThreatSeverity, ThreatType } from '../../shared/domain/threat.js';
import { MOCK_THREATS, getMockThreatById, getMockThreatsBySeverity, getMockThreatsAffectingRoute } from '../../shared/fixtures/threats.fixture.js';
import { NewsAPIService } from '../../shared/services/newsapi.service.js';
import { OpenWeatherService } from '../../shared/services/openweather.service.js';
import { CacheService } from '../../shared/services/cache.service.js';
import { DatabaseService } from '../../shared/services/database.service.js';

const THREAT_FEED_CACHE_KEY = 'threat:feed:all';
const THREAT_CACHE_TTL = 3600; // 1 hour

/**
 * Sentinel Service
 * Manages threat detection, lookup, and filtering.
 * Integrates NewsAPI + OpenWeather APIs with in-memory cache and database persistence.
 */
@Injectable({ deps: [NewsAPIService, OpenWeatherService, CacheService, DatabaseService] })
export class SentinelService {
  constructor(
    private newsAPI: NewsAPIService,
    private weather: OpenWeatherService,
    private cache: CacheService,
    private db: DatabaseService,
  ) {}

  /**
   * Get all active threats.
   * Strategy: cache-first → mock baseline + real API enrichment → persist new threats to DB.
   */
  async getAllThreats(): Promise<Threat[]> {
    // 1. Try cache first
    const cached = await this.cache.get<Threat[]>(THREAT_FEED_CACHE_KEY);
    if (cached && cached.length > 0) {
      return cached;
    }

    // 2. Start with mock baseline threats
    let threats: Threat[] = [...MOCK_THREATS];

    // 3. Enrich with real weather threats from OpenWeather API
    try {
      const weatherThreats = await this.weather.checkPortWeatherThreats();
      const weatherThreatObjects: Threat[] = weatherThreats.map((wt) => ({
        id: `threat-weather-${wt.location.replace(/\s+/g, '-').toLowerCase()}`,
        type: ThreatType.WEATHER,
        severity: wt.severity as ThreatSeverity,
        title: `${wt.threatType} - ${wt.location}`,
        description: wt.description,
        location: { lat: wt.lat, lng: wt.lon, region: wt.location },
        affectedRoutes: [],
        estimatedImpactStart: new Date().toISOString(),
        estimatedImpactEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'OpenWeather API',
        confidence: 0.9,
        detectedAt: wt.timestamp,
        tags: ['weather', 'real-time'],
      }));
      // Merge — avoid duplicates by ID
      const existingIds = new Set(threats.map(t => t.id));
      for (const wt of weatherThreatObjects) {
        if (!existingIds.has(wt.id)) {
          threats.push(wt);
          existingIds.add(wt.id);
        }
      }
    } catch (_err) {
      // OpenWeather unavailable — continue with mock data
    }

    // 4. Enrich with real news-based threats from NewsAPI
    try {
      const articles = await this.newsAPI.searchSupplyChainDisruptions();
      const newsThreats: Threat[] = articles
        .filter(a => a.title && a.description)
        .slice(0, 5) // cap at 5 news-derived threats
        .map((article, idx) => ({
          id: `threat-news-${Date.now()}-${idx}`,
          type: ThreatType.GEOPOLITICAL,
          severity: ThreatSeverity.MEDIUM,
          title: article.title.slice(0, 120),
          description: article.description ?? article.title,
          location: { lat: 0, lng: 0, region: 'Global' },
          affectedRoutes: [],
          estimatedImpactStart: article.publishedAt,
          source: article.source.name,
          confidence: 0.6,
          detectedAt: article.publishedAt,
          tags: ['news', 'real-time'],
        }));
      const existingIds = new Set(threats.map(t => t.id));
      for (const nt of newsThreats) {
        if (!existingIds.has(nt.id)) {
          threats.push(nt);
        }
      }
    } catch (_err) {
      // NewsAPI unavailable — continue with existing threats
    }

    // 5. Persist any new threats to the database
    try {
      for (const threat of threats) {
        const existing = await this.db.getThreatById(threat.id);
        if (!existing) {
          await this.db.createThreat({
            type: threat.type,
            severity: threat.severity,
            title: threat.title,
            description: threat.description,
            lat: threat.location.lat,
            lng: threat.location.lng,
            region: threat.location.region,
            port: threat.location.port,
            affectedRoutes: threat.affectedRoutes,
            estimatedImpactStart: threat.estimatedImpactStart,
            estimatedImpactEnd: threat.estimatedImpactEnd,
            source: threat.source,
            confidence: threat.confidence,
            detectedAt: threat.detectedAt,
            tags: threat.tags ?? [],
          });
        }
      }
    } catch (_err) {
      // DB write failure is non-fatal
    }

    // 6. Cache the enriched feed
    await this.cache.set(THREAT_FEED_CACHE_KEY, threats, THREAT_CACHE_TTL);

    return threats;
  }

  /**
   * Get threat by ID — checks mock fixtures first, then DB.
   */
  async getThreatById(id: string): Promise<Threat | undefined> {
    // Check mock fixtures first (always authoritative for demo threats)
    const mock = getMockThreatById(id);
    if (mock) return mock;

    // Fall back to DB for persisted real-time threats
    try {
      const dbThreat = await this.db.getThreatById(id);
      if (dbThreat) {
        return {
          id: dbThreat.id,
          type: dbThreat.type as ThreatType,
          severity: dbThreat.severity as ThreatSeverity,
          title: dbThreat.title,
          description: dbThreat.description,
          location: {
            lat: dbThreat.lat,
            lng: dbThreat.lng,
            region: dbThreat.region,
            port: dbThreat.port,
          },
          affectedRoutes: dbThreat.affectedRoutes,
          estimatedImpactStart: dbThreat.estimatedImpactStart,
          estimatedImpactEnd: dbThreat.estimatedImpactEnd,
          source: dbThreat.source,
          confidence: dbThreat.confidence,
          detectedAt: dbThreat.detectedAt,
          tags: dbThreat.tags,
        };
      }
    } catch (_err) {
      // DB unavailable
    }

    return undefined;
  }

  /** Get threats by severity level */
  async getThreatsBySeverity(severity: ThreatSeverity): Promise<Threat[]> {
    const all = await this.getAllThreats();
    return all.filter(t => t.severity === severity);
  }

  /** Get threats affecting a specific route */
  async getThreatsAffectingRoute(route: string): Promise<Threat[]> {
    return getMockThreatsAffectingRoute(route);
  }

  /** Get threats by type */
  async getThreatsByType(type: ThreatType): Promise<Threat[]> {
    const all = await this.getAllThreats();
    return all.filter(t => t.type === type);
  }

  /** Get critical threats (HIGH or CRITICAL severity) */
  async getCriticalThreats(): Promise<Threat[]> {
    const all = await this.getAllThreats();
    return all.filter(t => t.severity === ThreatSeverity.HIGH || t.severity === ThreatSeverity.CRITICAL);
  }

  /** Get threats within a geographic bounding box */
  async getThreatsInRegion(minLat: number, maxLat: number, minLng: number, maxLng: number): Promise<Threat[]> {
    const all = await this.getAllThreats();
    return all.filter(t => {
      const { lat, lng } = t.location;
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });
  }

  /** Get threats active within a time window */
  async getThreatsInTimeWindow(startTime: Date, endTime: Date): Promise<Threat[]> {
    const all = await this.getAllThreats();
    return all.filter(t => {
      const impactStart = new Date(t.estimatedImpactStart);
      const impactEnd = t.estimatedImpactEnd ? new Date(t.estimatedImpactEnd) : impactStart;
      return impactStart <= endTime && impactEnd >= startTime;
    });
  }

  /** Search threats by keyword in title, description, or tags */
  async searchThreats(keyword: string): Promise<Threat[]> {
    const all = await this.getAllThreats();
    const lower = keyword.toLowerCase();
    return all.filter(t =>
      t.title.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lower))
    );
  }

  /** Get threat feed summary stats */
  async getThreatFeedSummary() {
    const threats = await this.getAllThreats();
    return {
      totalThreats: threats.length,
      bySeverity: {
        critical: threats.filter(t => t.severity === ThreatSeverity.CRITICAL).length,
        high:     threats.filter(t => t.severity === ThreatSeverity.HIGH).length,
        medium:   threats.filter(t => t.severity === ThreatSeverity.MEDIUM).length,
        low:      threats.filter(t => t.severity === ThreatSeverity.LOW).length,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /** Invalidate the cached threat feed (forces fresh API fetch on next call) */
  async invalidateCache(): Promise<void> {
    await this.cache.delete(THREAT_FEED_CACHE_KEY);
  }
}
