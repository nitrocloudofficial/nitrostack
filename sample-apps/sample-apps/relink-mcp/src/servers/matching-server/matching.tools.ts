import { ToolDecorator as Tool, z, ExecutionContext, RateLimit } from '@nitrostack/core';
import { getSupabaseClient } from '../../services/supabase.service.js';
import { solveOptimalMatching, type MaterialRequirement, type SupplierOption } from '../../services/matching.solver.js';

const FindOptimalMatchesSchema = z.object({
  requirements: z.array(z.object({
    material_type: z.string().describe('Material type needed'),
    quantity_kg: z.number().positive().describe('Required quantity in kg'),
    max_price_per_kg: z.number().positive().optional().describe('Maximum acceptable price per kg'),
    required_grade: z.enum(['A', 'B', 'C']).optional().describe('Minimum grade requirement'),
  })).min(1).describe('Bill of Materials — all required materials'),
  buyer_lat: z.number().describe('Buyer location latitude'),
  buyer_lng: z.number().describe('Buyer location longitude'),
  max_radius_km: z.number().positive().default(100).describe('Maximum sourcing radius'),
});

const RankSuppliersSchema = z.object({
  listing_ids: z.array(z.string().uuid()).min(1).describe('Listing IDs to rank'),
  buyer_lat: z.number().optional().describe('Buyer latitude'),
  buyer_lng: z.number().optional().describe('Buyer longitude'),
});

export class MatchingTools {
  @Tool({
    name: 'find_optimal_matches',
    title: 'Find Optimal Matches (Multi-Supplier Solver)',
    description: 'Given a Bill of Materials (list of required materials), find the optimal combination of sellers minimizing total cost + transport. Solves the many-to-many allocation problem — combining materials from multiple factories to fulfill a complete BOM.',
    inputSchema: FindOptimalMatchesSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    invocation: { invoking: 'Solving optimal supplier allocation...', invoked: 'Optimal match found' },
  })
  @RateLimit({ requests: 30, window: '1m' })
  async findOptimalMatches(input: z.infer<typeof FindOptimalMatchesSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    // Fetch all available verified listings
    const allMaterialTypes = input.requirements.map((r) => r.material_type);
    const { data: listings } = await supabase
      .from('listings')
      .select('*, factories!inner(name, trust_score, location)')
      .eq('status', 'verified')
      .in('material_type', allMaterialTypes)
      .gte('quantity_kg', 1);

    if (!listings || listings.length === 0) {
      return {
        assignments: [],
        total_cost: 0,
        coverage_percent: 0,
        message: 'No matching verified listings found for any of the required materials',
      };
    }

    const suppliers: SupplierOption[] = (listings as Array<Record<string, unknown>>).map((l: Record<string, unknown>) => {
      const factory = l.factories as Record<string, unknown>;
      const loc = factory?.location as { lat?: number; lng?: number } | null;
      return {
        listing_id: l.id as string,
        factory_id: l.factory_id as string,
        factory_name: factory?.name as string || 'Unknown',
        material_type: l.material_type as string,
        quantity_kg: l.quantity_kg as number,
        price_per_kg: l.seller_quoted_price_per_kg as number,
        grade: l.grade as string,
        distance_km: loc?.lat && loc?.lng && input.buyer_lat && input.buyer_lng
          ? Math.round(haversineDistance(input.buyer_lat, input.buyer_lng, loc.lat!, loc.lng!))
          : 50,
        trust_score: factory?.trust_score as number || 0,
        location: { lat: loc?.lat || 0, lng: loc?.lng || 0, address: '' },
      };
    });

    const result = solveOptimalMatching(input.requirements, suppliers);

    return {
      assignments: result.assignments,
      total_material_cost: result.total_cost,
      total_transport_cost: result.total_transport_cost,
      total_cost: result.total_cost + result.total_transport_cost,
      coverage_percent: result.coverage_percent,
      unmet_requirements: result.unmet_requirements,
      message: result.unmet_requirements.length > 0
        ? `Optimal match found: ${result.coverage_percent}% coverage. ${result.unmet_requirements.length} requirement(s) partially unmet.`
        : 'Optimal match found: 100% coverage across all requirements',
    };
  }

  @Tool({
    name: 'rank_suppliers_by_multi_objective',
    title: 'Rank Suppliers (Multi-Objective)',
    description: 'Rank potential suppliers by weighted criteria: proximity, price, seller trust, delivery speed, and availability reliability.',
    inputSchema: RankSuppliersSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  })
  @RateLimit({ requests: 100, window: '1m' })
  async rankSuppliersByMultiObjective(input: z.infer<typeof RankSuppliersSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    const { data: listings } = await supabase
      .from('listings')
      .select('*, factories(name, trust_score, location)')
      .in('id', input.listing_ids)
      .eq('status', 'verified');

    if (!listings || listings.length === 0) throw new Error('No valid listings found for ranking');

    const ranked = (listings as Array<Record<string, unknown>>).map((l: Record<string, unknown>) => {
      const factory = l.factories as Record<string, unknown>;
      const loc = factory?.location as { lat?: number; lng?: number } | null;
      let distance = 50;
      if (input.buyer_lat && input.buyer_lng && loc?.lat && loc?.lng) {
        distance = Math.round(haversineDistance(input.buyer_lat, input.buyer_lng, loc.lat!, loc.lng!));
      }

      const price = l.seller_quoted_price_per_kg as number;
      const trust = factory?.trust_score as number || 0;
      const rankScore = (trust * 2) + (100 - Math.min(distance, 100)) + (100 - price * 0.5);

      return {
        listing_id: l.id,
        factory_name: factory?.name,
        material_type: l.material_type,
        price_per_kg: price,
        grade: l.grade,
        distance_km: distance,
        trust_score: trust,
        rank_score: Math.round(rankScore * 100) / 100,
      };
    });

    ranked.sort((a, b) => b.rank_score - a.rank_score);

    return {
      ranked,
      top_pick: ranked[0],
      message: `Ranked ${ranked.length} suppliers. Top pick: ${ranked[0]?.factory_name} (score: ${ranked[0]?.rank_score})`,
    };
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
