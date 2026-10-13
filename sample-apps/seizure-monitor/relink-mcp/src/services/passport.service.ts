import { getGeminiClient } from './vision.service.js';
import type { PriceBenchmark } from './pricing.service.js';

export interface DigitalPassport {
  passport_id: string;
  material: {
    type: string;
    grade: string;
    quantity_kg: number;
    condition: string[];
    availability: string;
  };
  origin: {
    factory_name: string;
    industry: string;
    gst_verified: boolean;
    trust_score: number;
    trust_badge: string;
    location: Record<string, unknown> | null;
  };
  ai_assessment: {
    confidence: number;
    health_flags: string[];
    recommended_applications: string[];
  };
  pricing: {
    seller_quoted: number | null;
    ai_benchmark: number | null;
    virgin_equivalent: number | null;
    savings_vs_virgin: string | null;
  };
  environmental_impact: {
    co2_saved_kg: number;
    energy_saved_kwh: number;
    circularity_score: string;
    landfill_diverted_kg: number;
  };
  compliance: {
    handling_notes: string[];
    regulatory_class: string;
    transport_code: string;
  };
  traceability: {
    listing_id: string;
    created_at: string;
    photos: string[];
    chain_of_custody: string[];
  };
  summary: string;
}

interface PassportInput {
  listingId?: string;
  materialType: string;
  grade: string;
  quantityKg: number;
  availability: string;
  healthFlags: string[];
  usageClassification: string[];
  confidence: number;
  sellerPrice: number | null;
  benchmark: PriceBenchmark | null;
  factoryName: string;
  factoryIndustry: string;
  gstVerified: boolean;
  trustScore: number;
  trustBadge: string;
  factoryLocation: Record<string, unknown> | null;
  photoUrls: string[];
  createdAt: string;
}

export async function generatePassport(input: PassportInput): Promise<DigitalPassport> {
  const basePassport: DigitalPassport = {
    passport_id: input.listingId || crypto.randomUUID(),
    material: {
      type: input.materialType,
      grade: input.grade,
      quantity_kg: input.quantityKg,
      condition: input.healthFlags,
      availability: input.availability,
    },
    origin: {
      factory_name: input.factoryName,
      industry: input.factoryIndustry,
      gst_verified: input.gstVerified,
      trust_score: input.trustScore,
      trust_badge: input.trustBadge,
      location: input.factoryLocation,
    },
    ai_assessment: {
      confidence: input.confidence,
      health_flags: input.healthFlags,
      recommended_applications: input.usageClassification,
    },
    pricing: {
      seller_quoted: input.sellerPrice,
      ai_benchmark: input.benchmark?.market_price_per_kg || null,
      virgin_equivalent: input.benchmark?.virgin_price_per_kg || null,
      savings_vs_virgin: input.benchmark && input.sellerPrice
        ? `${Math.round((1 - input.sellerPrice / input.benchmark.virgin_price_per_kg) * 100)}%`
        : null,
    },
    environmental_impact: {
      co2_saved_kg: 0,
      energy_saved_kwh: 0,
      circularity_score: 'U',
      landfill_diverted_kg: input.quantityKg,
    },
    compliance: {
      handling_notes: [],
      regulatory_class: 'unclassified',
      transport_code: 'N/A',
    },
    traceability: {
      listing_id: input.listingId || '',
      created_at: input.createdAt,
      photos: input.photoUrls,
      chain_of_custody: [input.factoryName, 'CircuLink Marketplace', 'Buyer'],
    },
    summary: `${input.quantityKg} kg of ${input.grade}-grade ${input.materialType.replace(/_/g, ' ')} from ${input.factoryName}.`,
  };

  try {
    const model = getGeminiClient();
    const prompt = buildPassportPrompt(input);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonStr = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const enrichment = JSON.parse(jsonStr);

    basePassport.environmental_impact = {
      co2_saved_kg: enrichment.environmental_impact?.co2_saved_kg ?? 0,
      energy_saved_kwh: enrichment.environmental_impact?.energy_saved_kwh ?? 0,
      circularity_score: enrichment.environmental_impact?.circularity_score ?? 'U',
      landfill_diverted_kg: input.quantityKg,
    };
    basePassport.compliance = {
      handling_notes: enrichment.compliance?.handling_notes ?? [],
      regulatory_class: enrichment.compliance?.regulatory_class ?? 'unclassified',
      transport_code: enrichment.compliance?.transport_code ?? 'N/A',
    };
    basePassport.summary = enrichment.summary ?? basePassport.summary;
  } catch {
    // AI enrichment failed — code-generated fallback remains
  }

  return basePassport;
}

function buildPassportPrompt(input: PassportInput): string {
  return `You are a material science and circular economy expert. Generate a digital product passport for this industrial waste material.

Material: ${input.materialType}
Grade: ${input.grade}
Quantity: ${input.quantityKg} kg
Health flags: ${input.healthFlags.join(', ') || 'none'}
Recommended applications: ${input.usageClassification.join(', ') || 'none'}
AI confidence: ${input.confidence}
${input.benchmark ? `Market price: ₹${input.benchmark.market_price_per_kg}/kg\nVirgin equivalent: ₹${input.benchmark.virgin_price_per_kg}/kg` : ''}
Factory: ${input.factoryName} (${input.factoryIndustry})
Trust score: ${input.trustScore}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "environmental_impact": {
    "co2_saved_kg": <number>,
    "energy_saved_kwh": <number>,
    "circularity_score": <"A"|"B"|"C"|"D"|"E">
  },
  "compliance": {
    "handling_notes": [<array of strings>],
    "regulatory_class": <"non-hazardous"|"hazardous"|"special_waste">,
    "transport_code": <string>
  },
  "summary": <string>
}`;
}

export function getTrustBadge(score: number): string {
  if (score >= 90) return 'Verified — Top Rated';
  if (score >= 75) return 'Verified — Trusted';
  if (score >= 50) return 'Verified';
  return 'Unverified — New';
}
