import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { SentinelService } from './sentinel.service.js';
import { ThreatSeverity, ThreatType, ThreatSchema, ThreatFeedSchema } from '../../shared/domain/threat.js';

/**
 * Sentinel Tools
 * Threat detection and lookup
 */

const ScanRiskFeedsSchema = z.object({
  severity: z.nativeEnum(ThreatSeverity).optional().describe('Filter by severity level'),
  threatType: z.nativeEnum(ThreatType).optional().describe('Filter by threat type'),
  region: z.string().optional().describe('Geographic region (e.g., "Asia-Pacific", "Europe")'),
  limit: z.number().int().min(1).max(100).default(20).describe('Max results to return'),
});

const LookupThreatSchema = z.object({
  threatId: z.string().describe('Threat ID to look up'),
});

const SearchThreatsSchema = z.object({
  keyword: z.string().describe('Search keyword (title, description, tags)'),
  limit: z.number().int().min(1).max(50).default(10).describe('Max results'),
});

function sentinelWidget(route: string) {
  return {
    route,
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://images.unsplash.com', 'https://tile.openstreetmap.org'],
    },
  };
}

@Injectable({ deps: [SentinelService] })
export class SentinelTools {
  constructor(private readonly sentinelService: SentinelService) {}

  @Tool({
    name: 'scan_risk_feeds',
    description:
      'Scan live threat feeds (news, weather, port alerts, maritime traffic) and return detected disruptions. ' +
      'Optionally filter by severity, threat type, or region.',
    inputSchema: ScanRiskFeedsSchema,
    examples: {
      request: { severity: 'high', limit: 5 },
      response: {
        threats: [
          {
            id: 'threat-001',
            type: 'weather',
            severity: 'high',
            title: 'Typhoon Approaching Port of Shanghai',
            description: 'Category 4 typhoon expected to hit Shanghai port in 48 hours.',
            location: { lat: 31.4, lng: 121.5, region: 'East China Sea', port: 'Shanghai' },
            affectedRoutes: ['Shanghai-Rotterdam', 'Shanghai-Los Angeles'],
            estimatedImpactStart: '2024-02-01T12:00:00Z',
            estimatedImpactEnd: '2024-02-04T00:00:00Z',
            source: 'weather_api',
            confidence: 0.95,
            detectedAt: '2024-01-30T10:00:00Z',
            tags: ['weather', 'port-closure', 'asia-pacific'],
          },
        ],
        totalThreats: 1,
        summary: { critical: 0, high: 1, medium: 0, low: 0 },
      },
    },
  })
  @Widget(sentinelWidget('global-threat-feed'))
  async scanRiskFeeds(args: z.infer<typeof ScanRiskFeedsSchema>, ctx: ExecutionContext) {
    let threats = await this.sentinelService.getAllThreats();

    if (args.severity) {
      threats = threats.filter((t) => t.severity === args.severity);
    }

    if (args.threatType) {
      threats = threats.filter((t) => t.type === args.threatType);
    }

    if (args.region) {
      threats = threats.filter((t) =>
        t.location.region?.toLowerCase().includes(args.region!.toLowerCase()) ||
        t.tags?.some((tag: string) => tag.toLowerCase().includes(args.region!.toLowerCase()))
      );
    }

    threats = threats.slice(0, args.limit);

    const summary = {
      critical: threats.filter((t) => t.severity === ThreatSeverity.CRITICAL).length,
      high: threats.filter((t) => t.severity === ThreatSeverity.HIGH).length,
      medium: threats.filter((t) => t.severity === ThreatSeverity.MEDIUM).length,
      low: threats.filter((t) => t.severity === ThreatSeverity.LOW).length,
    };

    ctx.logger.info('Scanned risk feeds', {
      totalThreats: threats.length,
      severity: args.severity,
      threatType: args.threatType,
      region: args.region,
    });

    return {
      threats,
      totalThreats: threats.length,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'lookup_threat',
    description: 'Get detailed information about a specific threat by ID.',
    inputSchema: LookupThreatSchema,
    examples: {
      request: { threatId: 'threat-001' },
      response: {
        threat: {
          id: 'threat-001',
          type: 'weather',
          severity: 'high',
          title: 'Typhoon Approaching Port of Shanghai',
          description: 'Category 4 typhoon expected to hit Shanghai port in 48 hours.',
          location: { lat: 31.4, lng: 121.5, region: 'East China Sea', port: 'Shanghai' },
          affectedRoutes: ['Shanghai-Rotterdam', 'Shanghai-Los Angeles', 'Shanghai-Singapore'],
          estimatedImpactStart: '2024-02-01T12:00:00Z',
          estimatedImpactEnd: '2024-02-04T00:00:00Z',
          source: 'weather_api',
          confidence: 0.95,
          detectedAt: '2024-01-30T10:00:00Z',
          tags: ['weather', 'port-closure', 'asia-pacific'],
        },
        relatedThreats: [],
      },
    },
  })
  async lookupThreat(args: z.infer<typeof LookupThreatSchema>, ctx: ExecutionContext) {
    const threat = await this.sentinelService.getThreatById(args.threatId);

    if (!threat) {
      throw new Error(`Threat not found: ${args.threatId}`);
    }

    ctx.logger.info('Looked up threat', { threatId: args.threatId, title: threat.title });

    // Find related threats (same region or type)
    const allThreats = await this.sentinelService.getAllThreats();
    const relatedThreats = allThreats
      .filter(
        (t) =>
          t.id !== threat.id &&
          (t.location.region === threat.location.region || t.type === threat.type)
      )
      .slice(0, 3);

    return {
      threat,
      relatedThreats,
    };
  }

  @Tool({
    name: 'search_threats',
    description: 'Search threats by keyword in title, description, or tags.',
    inputSchema: SearchThreatsSchema,
    examples: {
      request: { keyword: 'typhoon', limit: 5 },
      response: {
        threats: [
          {
            id: 'threat-001',
            type: 'weather',
            severity: 'high',
            title: 'Typhoon Approaching Port of Shanghai',
            description: 'Category 4 typhoon expected to hit Shanghai port in 48 hours.',
            location: { lat: 31.4, lng: 121.5, region: 'East China Sea', port: 'Shanghai' },
            affectedRoutes: ['Shanghai-Rotterdam', 'Shanghai-Los Angeles'],
            estimatedImpactStart: '2024-02-01T12:00:00Z',
            estimatedImpactEnd: '2024-02-04T00:00:00Z',
            source: 'weather_api',
            confidence: 0.95,
            detectedAt: '2024-01-30T10:00:00Z',
            tags: ['weather', 'port-closure', 'asia-pacific'],
          },
        ],
        totalResults: 1,
      },
    },
  })
  async searchThreats(args: z.infer<typeof SearchThreatsSchema>, ctx: ExecutionContext) {
    const allThreats = await this.sentinelService.searchThreats(args.keyword);
    const threats = allThreats.slice(0, args.limit);

    ctx.logger.info('Searched threats', { keyword: args.keyword, resultsCount: threats.length });

    return {
      threats,
      totalResults: threats.length,
      keyword: args.keyword,
    };
  }
}
