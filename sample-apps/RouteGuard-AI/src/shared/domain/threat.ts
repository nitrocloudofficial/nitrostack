import { z } from 'zod';

/**
 * Threat Domain Types
 * Represents detected disruptions to supply chain operations
 */

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ThreatType {
  WEATHER = 'weather',
  PORT_STRIKE = 'port_strike',
  MARITIME_CONGESTION = 'maritime_congestion',
  GEOPOLITICAL = 'geopolitical',
  CARRIER_FAILURE = 'carrier_failure',
  CUSTOMS_DELAY = 'customs_delay',
  EQUIPMENT_SHORTAGE = 'equipment_shortage',
}

export const ThreatSchema = z.object({
  id: z.string().describe('Unique threat identifier'),
  type: z.nativeEnum(ThreatType).describe('Category of threat'),
  severity: z.nativeEnum(ThreatSeverity).describe('Risk level'),
  title: z.string().describe('Short threat description'),
  description: z.string().describe('Detailed threat narrative'),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    region: z.string().optional(),
    port: z.string().optional(),
  }).describe('Geographic coordinates and region'),
  affectedRoutes: z.array(z.string()).describe('Shipping routes impacted'),
  estimatedImpactStart: z.string().datetime().describe('When disruption begins'),
  estimatedImpactEnd: z.string().datetime().optional().describe('When disruption ends'),
  source: z.string().describe('Data source (news, weather API, port authority, etc.)'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  detectedAt: z.string().datetime().describe('When threat was detected'),
  tags: z.array(z.string()).optional().describe('Searchable tags'),
});

export type Threat = z.infer<typeof ThreatSchema>;

/**
 * Threat Feed Resource
 * Represents a stream of detected threats
 */
export const ThreatFeedSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  threats: z.array(ThreatSchema),
  lastUpdated: z.string().datetime(),
  totalThreats: z.number(),
});

export type ThreatFeed = z.infer<typeof ThreatFeedSchema>;
