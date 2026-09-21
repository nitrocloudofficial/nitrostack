import { z } from 'zod';

/**
 * Shipment Domain Types
 * Represents in-transit orders and inventory movements
 */

export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  AT_PORT = 'at_port',
  DELAYED = 'delayed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum TransportMode {
  SEA = 'sea',
  AIR = 'air',
  TRUCK = 'truck',
  RAIL = 'rail',
  MULTIMODAL = 'multimodal',
}

export const ShipmentSchema = z.object({
  id: z.string().describe('Shipment/PO identifier'),
  poNumber: z.string().describe('Purchase order number'),
  status: z.nativeEnum(ShipmentStatus).describe('Current shipment status'),
  transportMode: z.nativeEnum(TransportMode).describe('Primary transport method'),
  origin: z.object({
    port: z.string(),
    lat: z.number(),
    lng: z.number(),
    country: z.string(),
  }).describe('Departure location'),
  destination: z.object({
    port: z.string(),
    lat: z.number(),
    lng: z.number(),
    country: z.string(),
  }).describe('Arrival location'),
  carrier: z.string().describe('Carrier/3PL name'),
  vesselName: z.string().optional().describe('Ship/vessel name if sea freight'),
  estimatedDeparture: z.string().datetime().describe('Planned departure'),
  estimatedArrival: z.string().datetime().describe('Planned arrival'),
  actualDeparture: z.string().datetime().optional().describe('Actual departure'),
  actualArrival: z.string().datetime().optional().describe('Actual arrival'),
  skus: z.array(z.object({
    sku: z.string(),
    quantity: z.number(),
    value: z.number().describe('USD value'),
  })).describe('Items in shipment'),
  totalValue: z.number().describe('Total shipment value in USD'),
  weight: z.number().describe('Total weight in kg'),
  containerCount: z.number().describe('Number of containers/pallets'),
  lastUpdate: z.string().datetime(),
  currentLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    description: z.string(),
  }).optional().describe('Real-time GPS/AIS location'),
});

export type Shipment = z.infer<typeof ShipmentSchema>;

/**
 * Shipment Registry Resource
 */
export const ShipmentRegistrySchema = z.object({
  id: z.string(),
  shipments: z.array(ShipmentSchema),
  totalValue: z.number(),
  lastUpdated: z.string().datetime(),
});

export type ShipmentRegistry = z.infer<typeof ShipmentRegistrySchema>;
