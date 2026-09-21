/**
 * Mock carrier and rate data for testing
 */

export interface CarrierRate {
  id: string;
  carrier: string;
  origin: string;
  destination: string;
  transportMode: 'sea' | 'air' | 'truck' | 'rail';
  ratePerUnit: number; // USD per TEU or per kg
  transitDays: number;
  capacity: number; // Available capacity
  reliability: number; // 0-1 on-time rate
  lastUpdated: string;
}

export const MOCK_CARRIER_RATES: CarrierRate[] = [
  {
    id: 'rate-001',
    carrier: 'Maersk',
    origin: 'Shanghai',
    destination: 'Rotterdam',
    transportMode: 'sea',
    ratePerUnit: 1200,
    transitDays: 30,
    capacity: 500,
    reliability: 0.94,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rate-002',
    carrier: 'CMA CGM',
    origin: 'Shanghai',
    destination: 'Rotterdam',
    transportMode: 'sea',
    ratePerUnit: 1150,
    transitDays: 32,
    capacity: 300,
    reliability: 0.91,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rate-003',
    carrier: 'Lufthansa Cargo',
    origin: 'Shanghai',
    destination: 'Frankfurt',
    transportMode: 'air',
    ratePerUnit: 8500,
    transitDays: 2,
    capacity: 50,
    reliability: 0.98,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rate-004',
    carrier: 'FedEx International',
    origin: 'Shanghai',
    destination: 'Los Angeles',
    transportMode: 'air',
    ratePerUnit: 6200,
    transitDays: 3,
    capacity: 100,
    reliability: 0.97,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rate-005',
    carrier: 'Sennder',
    origin: 'Rotterdam',
    destination: 'Frankfurt',
    transportMode: 'truck',
    ratePerUnit: 450,
    transitDays: 1,
    capacity: 200,
    reliability: 0.93,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rate-006',
    carrier: 'Flexport',
    origin: 'Singapore',
    destination: 'Rotterdam',
    transportMode: 'sea',
    ratePerUnit: 1400,
    transitDays: 28,
    capacity: 400,
    reliability: 0.95,
    lastUpdated: new Date().toISOString(),
  },
];

export function getCarrierRatesByRoute(origin: string, destination: string): CarrierRate[] {
  return MOCK_CARRIER_RATES.filter(
    r => r.origin === origin && r.destination === destination
  );
}

export function getCarrierRatesByMode(mode: 'sea' | 'air' | 'truck' | 'rail'): CarrierRate[] {
  return MOCK_CARRIER_RATES.filter(r => r.transportMode === mode);
}

export function getCarriersByName(carrier: string): CarrierRate[] {
  return MOCK_CARRIER_RATES.filter(r => r.carrier.toLowerCase().includes(carrier.toLowerCase()));
}
