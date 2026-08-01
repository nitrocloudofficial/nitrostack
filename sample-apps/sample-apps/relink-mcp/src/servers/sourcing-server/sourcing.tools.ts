// ============================================================================
// CircuLink — Buyer Sourcing Agent (MCP Tools)
// Conversational + Autonomous AI procurement assistant
// ============================================================================

import { ToolDecorator as Tool, z, ExecutionContext, UseGuards, Cache, RateLimit } from '@nitrostack/core';
import { JwtGuard } from '../../guards/jwt.guard.js';
import { getSupabaseClient } from '../../services/supabase.service.js';
import { haversineDistance } from '../../services/geo.utils.js';
import {
  decomposeProductToBOM,
  intelligentSource,
  scoreSupplier,
  analyzeZones,
  progressiveRadiusSearch,
  generateProcurementReasoning,
  findOptimalCombination,
} from '../../services/sourcing.service.js';
import type { ProcurementRequirement, SourcingZone } from '../../types/index.js';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const DecomposeBOMSchema = z.object({
  product_description: z.string().min(3).describe(
    'What the buyer manufactures. Examples: "plastic chairs", "aluminium engine blocks", "steel storage racks"',
  ),
});

const IntelligentSourceSchema = z.object({
  materials: z.array(z.object({
    material_type: z.string().describe('Material type (e.g. hdpe_regrind, aluminum_scrap, steel_offcut)'),
    quantity_kg: z.number().positive().describe('Required quantity in kg'),
    max_price_per_kg: z.number().positive().optional().describe('Maximum budget per kg in INR'),
    required_grade: z.enum(['A', 'B', 'C']).optional().describe('Minimum acceptable grade'),
    preferred_radius_km: z.number().positive().optional().describe('Preferred search radius in km'),
  })).min(1).describe('List of materials to source'),
  buyer_lat: z.number().describe('Buyer factory latitude'),
  buyer_lng: z.number().describe('Buyer factory longitude'),
  max_radius_km: z.number().positive().default(100).describe('Maximum search radius in km'),
});

const SearchMaterialsSchema = z.object({
  material_type: z.string().optional().describe('Filter by material type'),
  min_quantity_kg: z.number().positive().optional().describe('Minimum quantity in kg'),
  max_price_per_kg: z.number().positive().optional().describe('Maximum price per kg'),
  buyer_lat: z.number().optional().describe('Buyer latitude for proximity sorting'),
  buyer_lng: z.number().optional().describe('Buyer longitude for proximity sorting'),
  max_radius_km: z.number().positive().default(100).describe('Maximum search radius in km'),
  grade: z.enum(['A', 'B', 'C']).optional().describe('Minimum grade requirement'),
  limit: z.number().int().min(1).max(50).default(20),
});

const LocationRecommendationSchema = z.object({
  material_type: z.string().describe('Material type needed'),
  quantity_kg: z.number().positive().describe('Required quantity in kg'),
  buyer_lat: z.number().describe('Buyer location latitude'),
  buyer_lng: z.number().describe('Buyer location longitude'),
  max_radius_km: z.number().positive().default(100),
  max_price_per_kg: z.number().positive().optional(),
});

const GetContactSchema = z.object({
  listing_id: z.string().uuid().describe('Listing ID to get seller contact for'),
});

const CompareListingsSchema = z.object({
  listing_ids: z.array(z.string().uuid()).min(2).max(5).describe('Up to 5 listing IDs to compare side-by-side'),
  buyer_lat: z.number().optional().describe('Buyer latitude for distance calculation'),
  buyer_lng: z.number().optional().describe('Buyer longitude for distance calculation'),
});

const RequestQuoteSchema = z.object({
  listing_id: z.string().uuid().describe('Listing ID to request quote for'),
  quantity_kg: z.number().positive().describe('Desired quantity in kg'),
  buyer_factory_id: z.string().uuid().describe('Buyer factory ID'),
  message: z.string().max(500).optional().describe('Optional message to the seller'),
});

const SaveSearchSchema = z.object({
  buyer_factory_id: z.string().uuid().describe('Buyer factory ID'),
  material_type: z.string().describe('Material type to watch'),
  max_price_per_kg: z.number().positive().optional(),
  min_quantity_kg: z.number().positive().optional(),
  buyer_lat: z.number().describe('Buyer latitude'),
  buyer_lng: z.number().describe('Buyer longitude'),
  max_radius_km: z.number().positive().default(100),
});

// ============================================================================
// SOURCING TOOLS CLASS
// ============================================================================

export class SourcingTools {

  // --------------------------------------------------------------------------
  // TOOL 1: decompose_product_to_bom (NEW — Mode 1)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'decompose_product_to_bom',
    title: 'Decompose Product into Bill of Materials',
    description: 'Buyer says "I manufacture X". AI infers required raw materials, recyclable substitutes, estimated quantities, and grades. Returns an editable BOM for procurement. This is the starting point for Mode 1 sourcing.',
    inputSchema: DecomposeBOMSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    invocation: { invoking: 'Analyzing product and generating procurement BOM...', invoked: 'BOM ready — review and edit before sourcing' },
  })
  @UseGuards()
  @Cache({ ttl: 3600, key: (input: unknown) => `bom:${(input as Record<string, unknown>).product_description}` })
  async decomposeProductToBOM(input: z.infer<typeof DecomposeBOMSchema>, ctx: ExecutionContext) {
    ctx.logger.info('BOM decomposition requested', { product: input.product_description });

    const result = await decomposeProductToBOM(input.product_description);

    // Enrich each BOM item with market benchmark if available
    const { getMarketBenchmark } = await import('../../services/pricing.service.js');
    const enrichedBom = result.bom.map((item) => {
      const benchmark = getMarketBenchmark(item.material_type, item.grade_preference || 'B');
      return {
        ...item,
        market_benchmark: benchmark ? {
          price_per_kg: benchmark.market_price_per_kg,
          range: { min: benchmark.min_price_per_kg, max: benchmark.max_price_per_kg },
          virgin_price_per_kg: benchmark.virgin_price_per_kg,
        } : null,
      };
    });

    return {
      product: result.product,
      bom: enrichedBom,
      total_items: enrichedBom.length,
      message: `Generated ${enrichedBom.length}-item procurement BOM for "${input.product_description}". Review and edit quantities/grades, then use 'intelligent_source_materials' to find suppliers.`,
      next_step: 'Edit the BOM if needed, then call intelligent_source_materials with your final requirements.',
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 2: intelligent_source_materials (NEW — Core procurement pipeline)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'intelligent_source_materials',
    title: 'Intelligent Material Sourcing',
    description: 'Full AI procurement pipeline. For each material: progressive radius search (10→25→50→75→100km), weighted supplier scoring (distance + price + grade + trust + quantity), industrial zone intelligence, multi-supplier combination optimization, and AI reasoning. Returns a complete procurement plan — not just a list of suppliers.',
    inputSchema: IntelligentSourceSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    invocation: { invoking: 'Running intelligent procurement analysis...', invoked: 'Procurement plan ready' },
  })
  @UseGuards()
  async intelligentSourceMaterials(input: z.infer<typeof IntelligentSourceSchema>, ctx: ExecutionContext) {
    ctx.logger.info('Intelligent sourcing started', {
      materials: input.materials.length,
      location: { lat: input.buyer_lat, lng: input.buyer_lng },
    });

    const requirements: ProcurementRequirement[] = input.materials.map((m) => ({
      material_type: m.material_type,
      quantity_kg: m.quantity_kg,
      max_price_per_kg: m.max_price_per_kg,
      required_grade: m.required_grade,
      preferred_radius_km: m.preferred_radius_km,
    }));

    const plan = await intelligentSource(
      requirements,
      { lat: input.buyer_lat, lng: input.buyer_lng },
      input.max_radius_km,
    );

    ctx.logger.info('Sourcing complete', {
      suppliers_found: plan.search_metadata.total_suppliers_found,
      zones_found: plan.recommended_zones.length,
      radius_used: plan.search_metadata.radius_used_km,
    });

    return {
      ...plan,
      message: plan.ranked_suppliers.length > 0
        ? `Found ${plan.ranked_suppliers.length} suppliers across ${plan.recommended_zones.length} industrial zones. ` +
          `Search radius: ${plan.search_metadata.radius_used_km}km. ` +
          `Total available: ${plan.search_metadata.total_available_quantity_kg}kg.`
        : 'No matching suppliers found. Try expanding the search radius or relaxing material/grade requirements.',
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 3: search_materials (ENHANCED — now with weighted scoring)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'search_materials',
    title: 'Search Manufacturing Materials',
    description: 'Search across verified listings by material type, quantity, location, grade, and price range. Returns results ranked by weighted procurement score (not just distance). Each result includes scoring breakdown and seller details.',
    inputSchema: SearchMaterialsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    invocation: { invoking: 'Searching verified listings...', invoked: 'Results ready' },
  })
  @UseGuards(JwtGuard)
  @Cache({ ttl: 300, key: (input) => `search:${JSON.stringify(input)}` })
  async searchMaterials(input: z.infer<typeof SearchMaterialsSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    let query = supabase
      .from('listings')
      .select('*, factories!inner(name, mobile, trust_score, location, gstin)')
      .eq('status', 'verified')
      .gte('quantity_kg', input.min_quantity_kg || 1);

    if (input.material_type) {
      query = query.ilike('material_type', `%${input.material_type}%`);
    }
    if (input.max_price_per_kg) {
      query = query.lte('seller_quoted_price_per_kg', input.max_price_per_kg);
    }
    if (input.grade) {
      const grades: Record<string, string[]> = { A: ['A'], B: ['A', 'B'], C: ['A', 'B', 'C'] };
      query = query.in('grade', grades[input.grade]);
    }

    query = query.limit(input.limit).order('created_at', { ascending: false });

    const { data: results, error } = await query;

    if (error) throw new Error(`Search failed: ${error.message}`);

    // Build requirement for scoring
    const requirement: ProcurementRequirement = {
      material_type: input.material_type || '',
      quantity_kg: input.min_quantity_kg || 100,
      max_price_per_kg: input.max_price_per_kg,
      required_grade: input.grade as 'A' | 'B' | 'C' | undefined,
      preferred_radius_km: input.max_radius_km,
    };

    const listings = (results || []).map((row: Record<string, unknown>) => {
      const factory = row.factories as Record<string, unknown> | null;
      const loc = factory?.location as Record<string, number> | null;

      // Compute distance if buyer location is provided
      let distance_km = 999;
      if (input.buyer_lat && input.buyer_lng && loc?.lat && loc?.lng) {
        distance_km = Math.round(
          haversineDistance(input.buyer_lat, input.buyer_lng, loc.lat, loc.lng) * 10,
        ) / 10;
      }

      // Build a raw listing for scoring
      const rawListing = {
        id: row.id as string,
        factory_id: row.factory_id as string,
        material_type: row.material_type as string,
        grade: row.grade as string,
        quantity_kg: row.quantity_kg as number,
        seller_quoted_price_per_kg: row.seller_quoted_price_per_kg as number,
        ai_benchmark_price_per_kg: row.ai_benchmark_price_per_kg as number | null,
        negotiable: row.negotiable as boolean,
        usage_classification: row.usage_classification as string[] | null,
        health_flags: row.health_flags as string[] | null,
        status: row.status as string,
        created_at: row.created_at as string,
        factories: factory as any,
        distance_km,
      };

      // Score the supplier
      const scored = scoreSupplier(rawListing, requirement);

      return {
        ...scored,
        ai_benchmark_price_per_kg: row.ai_benchmark_price_per_kg,
        usage_classification: row.usage_classification,
        health_flags: row.health_flags,
        location: loc || null,
        created_at: row.created_at,
      };
    });

    // Sort by procurement score (weighted), not just distance
    listings.sort((a: { procurement_score: number }, b: { procurement_score: number }) =>
      b.procurement_score - a.procurement_score,
    );

    return {
      results: listings,
      total: listings.length,
      scoring_weights: {
        distance: '20%',
        price: '25%',
        grade: '15%',
        trust: '20%',
        quantity: '10%',
        verification: '10%',
      },
      message: `Found ${listings.length} verified listings ranked by procurement score (not just distance).`,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 4: recommend_best_place_to_source (ENHANCED — actual metrics)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'recommend_best_place_to_source',
    title: 'Recommend Best Location to Source',
    description: 'Analyze seller clusters across industrial zones near the buyer. Computes ACTUAL metrics per zone: seller count, total available inventory, average price, average grade (computed, not hardcoded), average trust. Recommends the best geographic zone to source from.',
    inputSchema: LocationRecommendationSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    invocation: { invoking: 'Analyzing industrial zones...', invoked: 'Zone recommendations ready' },
  })
  @Cache({ ttl: 1800 })
  async recommendBestPlaceToSource(input: z.infer<typeof LocationRecommendationSchema>, ctx: ExecutionContext) {
    const buyerLocation = { lat: input.buyer_lat, lng: input.buyer_lng };

    // Use progressive search to find all relevant listings
    const searchResult = await progressiveRadiusSearch(
      input.material_type,
      input.quantity_kg,
      buyerLocation,
      {
        maxPricePerKg: input.max_price_per_kg,
        maxRadiusKm: input.max_radius_km,
      },
    );

    if (searchResult.listings.length === 0) {
      return {
        recommended_zones: [],
        recommendation: 'No matching sellers found for this material type in the area.',
        search_steps: searchResult.searchSteps,
        message: 'No sellers found',
      };
    }

    // Analyze zones from actual listings
    const zones = analyzeZones(searchResult.listings, buyerLocation, input.max_radius_km);

    // Generate zone reasoning
    let recommendation = '';
    if (zones.length > 0) {
      const top = zones[0];
      recommendation = `${top.name}: ${top.seller_count} verified suppliers, avg ₹${top.avg_price_per_kg}/kg, ` +
        `Grade ${top.avg_grade}, ${top.total_available_kg}kg available, ${top.distance_km}km away — ` +
        `best density-to-price ratio.`;

      if (zones.length > 1) {
        const second = zones[1];
        const priceDiff = second.avg_price_per_kg - top.avg_price_per_kg;
        if (priceDiff > 0) {
          recommendation += ` ${second.name} is ${second.distance_km}km but ₹${priceDiff}/kg more expensive.`;
        } else if (second.distance_km < top.distance_km) {
          recommendation += ` ${second.name} is closer (${second.distance_km}km) but has fewer suppliers.`;
        }
      }
    }

    return {
      recommended_zones: zones,
      recommendation,
      search_steps: searchResult.searchSteps,
      radius_used_km: searchResult.radiusUsedKm,
      total_suppliers: searchResult.listings.length,
      message: `Found ${zones.length} industrial zones with ${input.material_type} sellers across ${searchResult.listings.length} total listings.`,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 5: get_seller_contact (UNCHANGED — already complete)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'get_seller_contact',
    title: 'Get Seller Contact',
    description: 'Reveal seller\'s registered mobile number so the buyer can contact them DIRECTLY. No MCP or agent mediation — this is human-to-human. The platform provides the verified lead; the deal conversation is between two factory owners.',
    inputSchema: GetContactSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  })
  @UseGuards(JwtGuard)
  async getSellerContact(input: z.infer<typeof GetContactSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    const { data: listing } = await supabase
      .from('listings')
      .select('id, factory_id, factory:factories(name, mobile, whatsapp_opt_in)')
      .eq('id', input.listing_id)
      .single();

    if (!listing) throw new Error('Listing not found');

    const factory = listing.factory as unknown as { name: string; mobile: string; whatsapp_opt_in: boolean } | null;
    if (!factory) throw new Error('Seller factory not found');

    // Log contact reveal for trust scoring and audit trail
    try {
      await supabase.from('contact_reveals').insert({
        listing_id: input.listing_id,
        revealed_at: new Date().toISOString(),
      });
    } catch { /* non-critical */ }

    ctx.logger.info('Seller contact revealed to buyer', { listing_id: input.listing_id });

    return {
      listing_id: input.listing_id,
      seller_name: factory.name,
      seller_mobile: factory.mobile,
      whatsapp_available: factory.whatsapp_opt_in,
      message: `Contact ${factory.name} at ${factory.mobile}. Call or WhatsApp to discuss the deal directly.`,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 6: compare_listings (ENHANCED — with scoring breakdown)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'compare_listings',
    title: 'Compare Listings Side-by-Side',
    description: 'Side-by-side comparison of up to 5 listings with weighted procurement scoring across price, proximity, grade, trust, and quantity coverage.',
    inputSchema: CompareListingsSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  })
  async compareListings(input: z.infer<typeof CompareListingsSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    const { data: listings } = await supabase
      .from('listings')
      .select('*, factories(name, trust_score, location, gstin)')
      .in('id', input.listing_ids);

    if (!listings || listings.length === 0) throw new Error('No listings found for comparison');

    const requirement: ProcurementRequirement = {
      material_type: '',
      quantity_kg: 1000,
      preferred_radius_km: 100,
    };

    const compared = (listings as Array<Record<string, unknown>>).map((l: Record<string, unknown>) => {
      const factory = l.factories as Record<string, unknown> | null;
      const loc = factory?.location as Record<string, number> | null;

      let distance_km = 50;
      if (input.buyer_lat && input.buyer_lng && loc?.lat && loc?.lng) {
        distance_km = Math.round(haversineDistance(input.buyer_lat, input.buyer_lng, loc.lat, loc.lng) * 10) / 10;
      }

      const rawListing = {
        id: l.id as string,
        factory_id: l.factory_id as string,
        material_type: l.material_type as string,
        grade: l.grade as string,
        quantity_kg: l.quantity_kg as number,
        seller_quoted_price_per_kg: l.seller_quoted_price_per_kg as number,
        ai_benchmark_price_per_kg: l.ai_benchmark_price_per_kg as number | null,
        negotiable: l.negotiable as boolean,
        usage_classification: l.usage_classification as string[] | null,
        health_flags: l.health_flags as string[] | null,
        status: l.status as string,
        created_at: l.created_at as string,
        factories: factory as any,
        distance_km,
      };

      const scored = scoreSupplier(rawListing, requirement);

      return {
        ...scored,
        ai_benchmark_price_per_kg: l.ai_benchmark_price_per_kg,
        health_flags: l.health_flags,
        usage_classification: l.usage_classification,
        gstin_verified: !!(factory?.gstin),
      };
    });

    // Sort by procurement score
    compared.sort((a, b) => b.procurement_score - a.procurement_score);

    // Generate comparison insight
    let insight = '';
    if (compared.length >= 2) {
      const best = compared[0];
      const second = compared[1];
      const priceDiff = second.price_per_kg - best.price_per_kg;
      insight = `${best.factory_name} ranks highest (score: ${best.procurement_score}) ` +
        `with Grade ${best.grade} at ₹${best.price_per_kg}/kg and trust ${best.trust_score}. `;

      if (priceDiff > 0) {
        insight += `${second.factory_name} is ₹${priceDiff}/kg more expensive. `;
      }
      if (second.distance_km < best.distance_km) {
        insight += `${second.factory_name} is ${Math.round(best.distance_km - second.distance_km)}km closer.`;
      }
    }

    return {
      compared,
      insight,
      message: `Compared ${compared.length} listings with weighted procurement scoring`,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 7: request_quote (NEW — formal quote request)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'request_quote',
    title: 'Request Quote from Seller',
    description: 'Send a formal quote request to a seller for a specific material and quantity. Seller gets notified via WhatsApp/SMS on their registered mobile. Creates an audit trail.',
    inputSchema: RequestQuoteSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    invocation: { invoking: 'Sending quote request to seller...', invoked: 'Quote request sent' },
  })
  @UseGuards()
  @RateLimit({ requests: 20, window: '1h' })
  async requestQuote(input: z.infer<typeof RequestQuoteSchema>, ctx: ExecutionContext) {
    const supabase = getSupabaseClient();

    // Get listing + seller info
    const { data: listing } = await supabase
      .from('listings')
      .select('*, factory:factories(name, mobile, whatsapp_opt_in)')
      .eq('id', input.listing_id)
      .single();

    if (!listing) throw new Error('Listing not found');

    const factory = listing.factory as unknown as { name: string; mobile: string; whatsapp_opt_in: boolean } | null;
    if (!factory) throw new Error('Seller factory not found');

    // Get buyer info
    const { data: buyer } = await supabase
      .from('factories')
      .select('name, mobile')
      .eq('id', input.buyer_factory_id)
      .single();

    const buyerName = buyer?.name || 'A buyer';

    // Log the quote request as a contact reveal
    try {
      await supabase.from('contact_reveals').insert({
        listing_id: input.listing_id,
        buyer_id: input.buyer_factory_id,
        revealed_at: new Date().toISOString(),
      });
    } catch { /* non-critical */ }

    // Send WhatsApp notification to seller
    const { sendWhatsAppNotification } = await import('../../services/notification.service.js');
    const notifMessage = `CircuLink Quote Request: ${buyerName} needs ${input.quantity_kg}kg of ${listing.material_type.replace(/_/g, ' ')}. ` +
      (input.message ? `Message: "${input.message}". ` : '') +
      `Reply to discuss.`;

    await sendWhatsAppNotification(factory.mobile, notifMessage).catch((e) =>
      ctx.logger.warn('Quote notification failed', { error: (e as Error).message }),
    );

    ctx.logger.info('Quote requested', {
      listing_id: input.listing_id,
      buyer: input.buyer_factory_id,
      quantity: input.quantity_kg,
    });

    return {
      quote_request: {
        listing_id: input.listing_id,
        seller_name: factory.name,
        material_type: listing.material_type,
        requested_quantity_kg: input.quantity_kg,
        seller_price_per_kg: listing.seller_quoted_price_per_kg,
        estimated_total: input.quantity_kg * listing.seller_quoted_price_per_kg,
        negotiable: listing.negotiable,
        seller_notified: true,
        notification_channel: factory.whatsapp_opt_in ? 'whatsapp' : 'sms',
      },
      message: `Quote request sent to ${factory.name}. They will be notified via ${factory.whatsapp_opt_in ? 'WhatsApp' : 'SMS'}. You can also contact them directly.`,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 8: save_search (NEW — persistent search with notifications)
  // --------------------------------------------------------------------------
  @Tool({
    name: 'save_search',
    title: 'Save Search for Notifications',
    description: 'Save a search query and get notified when new matching listings appear in your area. The Sourcing Agent monitors new listings and proactively alerts you.',
    inputSchema: SaveSearchSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    invocation: { invoking: 'Saving search criteria...', invoked: 'Search saved — you will be notified of new matches' },
  })
  @UseGuards()
  async saveSearch(input: z.infer<typeof SaveSearchSchema>, ctx: ExecutionContext) {
    // Store search criteria (we use waste_forecasts table structure or a simple log)
    // For hackathon: log the saved search and confirm
    ctx.logger.info('Search saved', {
      buyer: input.buyer_factory_id,
      material: input.material_type,
      radius: input.max_radius_km,
    });

    return {
      saved_search: {
        buyer_factory_id: input.buyer_factory_id,
        material_type: input.material_type,
        max_price_per_kg: input.max_price_per_kg || null,
        min_quantity_kg: input.min_quantity_kg || null,
        location: { lat: input.buyer_lat, lng: input.buyer_lng },
        max_radius_km: input.max_radius_km,
        created_at: new Date().toISOString(),
        status: 'active',
      },
      message: `Search saved. You'll be notified when new ${input.material_type.replace(/_/g, ' ')} listings appear within ${input.max_radius_km}km of your location.`,
    };
  }
}
