import { Shipment, ShipmentStatus, TransportMode } from '../domain/shipment.js';

/**
 * Mock shipment data for testing and demo
 */

export const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 'ship-001',
    poNumber: 'PO-2024-001',
    status: ShipmentStatus.IN_TRANSIT,
    transportMode: TransportMode.SEA,
    origin: {
      port: 'Shanghai',
      lat: 31.4,
      lng: 121.5,
      country: 'China',
    },
    destination: {
      port: 'Rotterdam',
      lat: 51.95,
      lng: 4.1,
      country: 'Netherlands',
    },
    carrier: 'Maersk',
    vesselName: 'MSC Gülsün',
    estimatedDeparture: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedArrival: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    actualDeparture: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    skus: [
      { sku: 'SKU-A001', quantity: 500, value: 50000 },
      { sku: 'SKU-B002', quantity: 300, value: 75000 },
    ],
    totalValue: 125000,
    weight: 45000,
    containerCount: 120,
    lastUpdate: new Date().toISOString(),
    currentLocation: {
      lat: 25.5,
      lng: 60.0,
      description: 'Arabian Sea',
    },
  },
  {
    id: 'ship-002',
    poNumber: 'PO-2024-002',
    status: ShipmentStatus.IN_TRANSIT,
    transportMode: TransportMode.SEA,
    origin: {
      port: 'Shanghai',
      lat: 31.4,
      lng: 121.5,
      country: 'China',
    },
    destination: {
      port: 'Los Angeles',
      lat: 33.74,
      lng: -118.21,
      country: 'USA',
    },
    carrier: 'Evergreen',
    vesselName: 'Ever Given',
    estimatedDeparture: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedArrival: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    actualDeparture: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    skus: [
      { sku: 'SKU-C003', quantity: 1000, value: 200000 },
      { sku: 'SKU-D004', quantity: 500, value: 100000 },
    ],
    totalValue: 300000,
    weight: 60000,
    containerCount: 150,
    lastUpdate: new Date().toISOString(),
    currentLocation: {
      lat: 15.0,
      lng: -130.0,
      description: 'Pacific Ocean',
    },
  },
  {
    id: 'ship-003',
    poNumber: 'PO-2024-003',
    status: ShipmentStatus.AT_PORT,
    transportMode: TransportMode.SEA,
    origin: {
      port: 'Singapore',
      lat: 1.35,
      lng: 103.82,
      country: 'Singapore',
    },
    destination: {
      port: 'Rotterdam',
      lat: 51.95,
      lng: 4.1,
      country: 'Netherlands',
    },
    carrier: 'CMA CGM',
    vesselName: 'CMA CGM Antoine',
    estimatedDeparture: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedArrival: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    actualDeparture: undefined,
    skus: [
      { sku: 'SKU-E005', quantity: 2000, value: 400000 },
    ],
    totalValue: 400000,
    weight: 80000,
    containerCount: 200,
    lastUpdate: new Date().toISOString(),
    currentLocation: {
      lat: 1.35,
      lng: 103.82,
      description: 'Port of Singapore - Berth 5',
    },
  },
  {
    id: 'ship-004',
    poNumber: 'PO-2024-004',
    status: ShipmentStatus.IN_TRANSIT,
    transportMode: TransportMode.AIR,
    origin: {
      port: 'Shanghai Pudong',
      lat: 31.4,
      lng: 121.5,
      country: 'China',
    },
    destination: {
      port: 'Frankfurt',
      lat: 50.03,
      lng: 8.57,
      country: 'Germany',
    },
    carrier: 'Lufthansa Cargo',
    estimatedDeparture: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    actualDeparture: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    skus: [
      { sku: 'SKU-F006', quantity: 100, value: 500000 },
    ],
    totalValue: 500000,
    weight: 5000,
    containerCount: 10,
    lastUpdate: new Date().toISOString(),
    currentLocation: {
      lat: 45.0,
      lng: 50.0,
      description: 'Over Central Asia',
    },
  },
];

export function getMockShipmentById(id: string): Shipment | undefined {
  return MOCK_SHIPMENTS.find(s => s.id === id);
}

export function getMockShipmentsByStatus(status: ShipmentStatus): Shipment[] {
  return MOCK_SHIPMENTS.filter(s => s.status === status);
}

export function getMockShipmentsBySku(sku: string): Shipment[] {
  return MOCK_SHIPMENTS.filter(s => s.skus.some(item => item.sku === sku));
}

export function getMockShipmentsByRoute(origin: string, destination: string): Shipment[] {
  return MOCK_SHIPMENTS.filter(
    s => s.origin.port === origin && s.destination.port === destination
  );
}
