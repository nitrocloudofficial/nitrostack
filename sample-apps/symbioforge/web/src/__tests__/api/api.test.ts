import { expect, test, describe, vi } from 'vitest';
import { GET, POST } from '../../app/api/factories/route';
import { NextRequest } from 'next/server';

// Mock the synced engine so we don't try to actually hit DB or complex logic in tests
vi.mock('@/lib/server/synced-engine', () => ({
  getSyncedEngine: vi.fn().mockResolvedValue({
    getFactories: vi.fn().mockReturnValue([{ id: 'mock1', name: 'Mock Factory' }]),
    registerFactory: vi.fn().mockReturnValue({ id: 'mock2', name: 'New Factory' })
  }),
  persistFactory: vi.fn().mockResolvedValue(true)
}));

// Mock rate limit
vi.mock('@/lib/server/rate-limit', () => ({
  consumeRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 10 }),
  buildRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
  getRequestIdentifier: vi.fn().mockReturnValue('test-ip')
}));

// Mock auth
vi.mock('@/lib/server/auth', () => ({
  requireAuthenticatedUser: vi.fn().mockResolvedValue({ id: 'test-user' })
}));

describe('Factories API Route', () => {
  test('GET /api/factories returns list of factories', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.factories).toHaveLength(1);
    expect(data.factories[0].name).toBe('Mock Factory');
  });

  test('POST /api/factories validates and creates a factory', async () => {
    // We send a valid payload according to factoryRegistrationSchema
    const payload = {
      name: 'New Factory',
      industryType: 'Automotive',
      location: {
        lat: 10,
        lng: 10,
        address: '123 Test St'
      },
      productionCapacity: '1000 units',
      rawMaterials: ['steel'],
      declaredWastes: ['scrap metal'],
      complianceStatus: 'filed'
    };

    const req = new NextRequest('http://localhost/api/factories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.factory.name).toBe('New Factory');
  });

  test('POST /api/factories returns 400 on invalid payload', async () => {
    const req = new NextRequest('http://localhost/api/factories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Incomplete Payload' })
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
