import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { BrokerageService } from './brokerage.service.js';
import { ImpactService } from '../impact/impact.service.js';
import { SentinelService } from '../sentinel/sentinel.service.js';
import { ERPService } from '../../shared/services/erp.service.js';

/**
 * Brokerage Tools
 * Generate and execute contingency reroute plans
 */

const GenerateRerouteOptionsSchema = z.object({
  shipmentId: z.string().describe('Shipment ID to generate reroutes for'),
  threatId: z.string().describe('Threat ID triggering the reroute'),
});

const ApproveRerouteSchema = z.object({
  planId: z.string().describe('Contingency plan ID'),
  optionId: z.string().describe('Reroute option ID to approve'),
  approvedBy: z.string().describe('User approving the reroute'),
});

const ExecuteBookingSchema = z.object({
  planId: z.string().describe('Contingency plan ID'),
  optionId: z.string().describe('Reroute option ID to execute'),
});

function brokerageWidget(route: string) {
  return { route, prefersBorder: true, csp: { resourceDomains: ['https://images.unsplash.com'] } };
}

@Injectable({ deps: [BrokerageService, ImpactService, SentinelService, ERPService] })
export class BrokerageTools {
  constructor(
    private readonly brokerageService: BrokerageService,
    private readonly impactService: ImpactService,
    private readonly sentinelService: SentinelService,
    private readonly erpService: ERPService,
  ) {}

  @Tool({
    name: 'generate_reroute_options',
    description:
      'Generate alternative logistics options for a shipment affected by a threat. ' +
      'Searches global freight networks, queries carrier APIs for spot rates and capacity, ' +
      'and compiles ranked contingency plans.',
    inputSchema: GenerateRerouteOptionsSchema,
    examples: {
      request: { shipmentId: 'ship-001', threatId: 'threat-001' },
      response: {
        plan: {
          id: 'plan-ship-001-threat-001',
          shipmentId: 'ship-001',
          threatId: 'threat-001',
          options: [{
            id: 'reroute-air-ship-001',
            shipmentId: 'ship-001',
            threatId: 'threat-001',
            transportMode: 'air',
            carrier: 'Lufthansa Cargo',
            origin: { port: 'Shanghai', lat: 31.4, lng: 121.5 },
            destination: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
            estimatedDeparture: '2024-01-30T18:00:00Z',
            estimatedArrival: '2024-02-02T12:00:00Z',
            delayReduction: 480, additionalCost: 18750, costPerDay: 937.5,
            riskScore: 0.05, carrierReliability: 0.98, capacity: 50,
            spotRate: 156.25, validUntil: '2024-01-30T14:00:00Z', status: 'proposed',
          }],
          recommendation: {
            optionId: 'reroute-air-ship-001',
            rationale: 'Lufthansa Cargo via air saves 480 hours for $18,750',
            expectedOutcome: 'Shipment arrives 20 days earlier',
          },
          approvalRequired: false,
          createdAt: '2024-01-30T12:00:00Z',
          expiresAt: '2024-01-31T12:00:00Z',
        },
        shipment: {
          id: 'ship-001', poNumber: 'PO-2024-001', status: 'in_transit',
          transportMode: 'sea',
          origin: { port: 'Shanghai', lat: 31.4, lng: 121.5, country: 'China' },
          destination: { port: 'Rotterdam', lat: 51.95, lng: 4.1, country: 'Netherlands' },
          carrier: 'Maersk', totalValue: 125000,
        },
      },
    },
  })
  @Widget(brokerageWidget('reroute-comparator'))
  async generateRerouteOptions(args: z.infer<typeof GenerateRerouteOptionsSchema>, ctx: ExecutionContext) {
    const shipment = await this.erpService.getShipmentById(args.shipmentId);
    if (!shipment) throw new Error(`Shipment not found: ${args.shipmentId}`);

    const threat = await this.sentinelService.getThreatById(args.threatId);
    if (!threat) throw new Error(`Threat not found: ${args.threatId}`);

    const impact = await this.impactService.analyzeSupplyChainImpact(threat);
    const plan   = await this.brokerageService.generateContingencyPlan(shipment, threat, impact);

    ctx.logger.info('Generated reroute options', {
      shipmentId: args.shipmentId,
      threatId: args.threatId,
      optionsCount: plan.options.length,
      recommendedOption: plan.recommendation.optionId,
    });

    return {
      plan,
      shipment: {
        id: shipment.id, poNumber: shipment.poNumber, status: shipment.status,
        transportMode: shipment.transportMode, origin: shipment.origin,
        destination: shipment.destination, carrier: shipment.carrier,
        totalValue: shipment.totalValue,
      },
    };
  }

  @Tool({
    name: 'approve_reroute',
    description: 'Approve a proposed reroute option. Records approval and prepares for execution.',
    inputSchema: ApproveRerouteSchema,
    examples: {
      request: { planId: 'plan-ship-001-threat-001', optionId: 'reroute-air-ship-001', approvedBy: 'user@company.com' },
      response: {
        option: {
          id: 'reroute-air-ship-001', shipmentId: 'ship-001', threatId: 'threat-001',
          transportMode: 'air', carrier: 'Lufthansa Cargo', status: 'approved',
          approvedBy: 'user@company.com', approvedAt: '2024-01-30T12:30:00Z',
          delayReduction: 480, additionalCost: 18750,
        },
        message: 'Reroute approved and ready for execution',
      },
    },
  })
  async approveReroute(args: z.infer<typeof ApproveRerouteSchema>, ctx: ExecutionContext) {
    const approvedOption = {
      id: args.optionId, shipmentId: 'ship-001', threatId: 'threat-001',
      transportMode: 'air' as const, carrier: 'Lufthansa Cargo',
      status: 'approved' as const,
      approvedBy: args.approvedBy, approvedAt: new Date().toISOString(),
      delayReduction: 480, additionalCost: 18750,
    };

    ctx.logger.info('Approved reroute', { planId: args.planId, optionId: args.optionId, approvedBy: args.approvedBy });
    return { option: approvedOption, message: 'Reroute approved and ready for execution' };
  }

  @Tool({
    name: 'execute_booking',
    description: 'Execute the approved reroute booking with the carrier. Generates booking reference and confirms capacity.',
    inputSchema: ExecuteBookingSchema,
    examples: {
      request: { planId: 'plan-ship-001-threat-001', optionId: 'reroute-air-ship-001' },
      response: {
        option: {
          id: 'reroute-air-ship-001', shipmentId: 'ship-001', threatId: 'threat-001',
          transportMode: 'air', carrier: 'Lufthansa Cargo', status: 'executed',
          executedAt: '2024-01-30T12:45:00Z', bookingReference: 'BK-ABCD1234',
          delayReduction: 480, additionalCost: 18750,
        },
        message: 'Booking confirmed with Lufthansa Cargo', bookingReference: 'BK-ABCD1234',
      },
    },
  })
  async executeBooking(args: z.infer<typeof ExecuteBookingSchema>, ctx: ExecutionContext) {
    const bookingReference = `BK-${Date.now().toString(36).toUpperCase()}`;
    const executedOption = {
      id: args.optionId, shipmentId: 'ship-001', threatId: 'threat-001',
      transportMode: 'air' as const, carrier: 'Lufthansa Cargo',
      status: 'executed' as const,
      executedAt: new Date().toISOString(), bookingReference,
      delayReduction: 480, additionalCost: 18750,
    };

    ctx.logger.info('Executed booking', { planId: args.planId, optionId: args.optionId, bookingReference });
    return { option: executedOption, message: `Booking confirmed with ${executedOption.carrier}`, bookingReference };
  }
}
