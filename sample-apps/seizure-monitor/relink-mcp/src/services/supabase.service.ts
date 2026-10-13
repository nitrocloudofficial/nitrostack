import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let mockInstance: SupabaseClient | null = null;

const MOCK_LISTINGS = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    factory_id: 'f101',
    material_type: 'aluminum_scrap',
    grade: 'A',
    quantity_kg: 1500,
    seller_quoted_price_per_kg: 145,
    ai_benchmark_price_per_kg: 148,
    negotiable: true,
    usage_classification: ['remelting', 'automotive'],
    health_flags: [],
    status: 'verified',
    created_at: new Date().toISOString(),
    factories: {
      name: 'Chakan Auto Components',
      mobile: '+919876543210',
      trust_score: 88,
      location: { lat: 18.75, lng: 73.85 },
      gstin: '27AAACC1234H1Z5',
    },
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    factory_id: 'f102',
    material_type: 'hdpe_regrind',
    grade: 'B',
    quantity_kg: 800,
    seller_quoted_price_per_kg: 72,
    ai_benchmark_price_per_kg: 78,
    negotiable: false,
    usage_classification: ['injection_molding'],
    health_flags: [],
    status: 'verified',
    created_at: new Date().toISOString(),
    factories: {
      name: 'Pimpri Polymer Works',
      mobile: '+919812345678',
      trust_score: 94,
      location: { lat: 18.62, lng: 73.80 },
      gstin: '27BBBDD5678K1Z2',
    },
  },
];

function createMockClient(): SupabaseClient {
  const createQueryChain = (data: unknown[] = MOCK_LISTINGS) => {
    const chain: Record<string, any> = {
      select: () => chain,
      eq: () => chain,
      ilike: () => chain,
      gte: () => chain,
      lte: () => chain,
      in: () => chain,
      limit: () => chain,
      order: () => chain,
      single: () => Promise.resolve({ data: data[0] || null, error: null }),
      maybeSingle: () => Promise.resolve({ data: data[0] || null, error: null }),
      then: (onfulfilled: (res: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data, error: null }).then(onfulfilled),
    };
    return chain;
  };

  return {
    from: () => ({
      select: () => createQueryChain(),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => createQueryChain(),
      delete: () => createQueryChain(),
    }),
  } as unknown as SupabaseClient;
}

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url === 'https://your-project.supabase.co') {
    console.warn('[Supabase] Not configured — using mock client. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for full functionality.');
    if (!mockInstance) mockInstance = createMockClient();
    return mockInstance;
  }

  supabaseInstance = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'public' },
  });

  return supabaseInstance;
}

export function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url === 'https://your-project.supabase.co') {
    console.warn('[Supabase] Anon client not configured — using mock.');
    if (!mockInstance) mockInstance = createMockClient();
    return mockInstance;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
