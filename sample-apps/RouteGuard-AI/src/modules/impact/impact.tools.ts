import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { ImpactService } from './impact.service.js';
import { SentinelService } from '../sentinel/sentinel.service.js';
import { ThreatSchema } from '../../shared/domain/threat.js';

/**
 * Impact Analysis Tools
 * Evaluate supply chain vulnerability and quantify damage
 */

const AnalyzeSupplyChainImpactSchema = z.object({
  threatId: z.string().describe('Threat ID to analyze impact for'),
});

function impactWidget(route: string) {
  return {
    route,
    prefersBorder: true,
    csp: {
      resourceDomains: ['https://images.unsplash.com'],
    },
  };
}

@Injectable({ deps: [ImpactService, SentinelService] })
export class ImpactTools {
  constructor(
    private readonly impactService: ImpactService,
    private readonly sentinelService: SentinelService
  ) {}

  @Tool({
    name: 'analyze_supply_chain_impact',
    description:
      'Evaluate which in-transit orders, inventory components, and manufacturing lines are vulnerable to a detected threat. ' +
      'Calculates financial exposure, delay windows, and SLA breach risk.',
    inputSchema: AnalyzeSupplyChainImpactSchema,
    examples: {
      request: { threatId: 'threat-001' },
      response: {
        impact: {
          id: 'impact-threat-001-1234567890',
          threatId: 'threat-001',
          affectedShipments: [
            {
              shipmentId: 'ship-001',
              delayDays: 5,
              delayHours: 120,
              financialExposure: 20833.33,
              skusAffected: ['SKU-A001', 'SKU-B002'],
            },
          ],
          totalFinancialExposure: 20833.33,
          totalDelayHours: 120,
          customerCount: 1,
          slaBreachRisk: 0.35,
          calculatedAt: '2024-01-30T12:00:00Z',
          scenario: 'Impact from Typhoon Approaching Port of Shanghai',
        },
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
      },
    },
  })
  @Widget(impactWidget('impact-radar'))
  async analyzeSupplyChainImpact(
    args: z.infer<typeof AnalyzeSupplyChainImpactSchema>,
    ctx: ExecutionContext
  ) {
    const threat = await this.sentinelService.getThreatById(args.threatId);

    if (!threat) {
      throw new Error(`Threat not found: ${args.threatId}`);
    }

    const impact = await this.impactService.analyzeSupplyChainImpact(threat);

    ctx.logger.info('Analyzed supply chain impact', {
      threatId: args.threatId,
      affectedShipments: impact.affectedShipments.length,
      totalExposure: impact.totalFinancialExposure,
      slaBreachRisk: impact.slaBreachRisk,
    });

    return {
      impact,
      threat,
    };
  }
}
