export interface PriceBenchmark {
  material_type: string;
  grade: string;
  market_price_per_kg: number;
  min_price_per_kg: number;
  max_price_per_kg: number;
  virgin_price_per_kg: number;
}

const MARKET_RATES: Record<string, PriceBenchmark> = {
  aluminum_scrap: {
    material_type: 'aluminum_scrap', grade: 'A-B', market_price_per_kg: 155,
    min_price_per_kg: 120, max_price_per_kg: 180, virgin_price_per_kg: 230,
  },
  hdpe_regrind: {
    material_type: 'hdpe_regrind', grade: 'A-B', market_price_per_kg: 35,
    min_price_per_kg: 22, max_price_per_kg: 48, virgin_price_per_kg: 85,
  },
  pp_granulate: {
    material_type: 'pp_granulate', grade: 'A-B', market_price_per_kg: 40,
    min_price_per_kg: 25, max_price_per_kg: 55, virgin_price_per_kg: 95,
  },
  steel_offcut: {
    material_type: 'steel_offcut', grade: 'A-B', market_price_per_kg: 32,
    min_price_per_kg: 22, max_price_per_kg: 45, virgin_price_per_kg: 68,
  },
  copper_wire: {
    material_type: 'copper_wire', grade: 'A-B', market_price_per_kg: 650,
    min_price_per_kg: 480, max_price_per_kg: 780, virgin_price_per_kg: 850,
  },
  textile_waste: {
    material_type: 'textile_waste', grade: 'A-B', market_price_per_kg: 15,
    min_price_per_kg: 8, max_price_per_kg: 25, virgin_price_per_kg: 45,
  },
};

export function getMarketBenchmark(materialType: string, grade: string): PriceBenchmark | null {
  const key = materialType.toLowerCase().replace(/[\s-]/g, '_');
  const benchmark = MARKET_RATES[key];
  if (!benchmark) return null;

  const gradeMultiplier = grade === 'A' ? 1.15 : grade === 'B' ? 1.0 : grade === 'C' ? 0.75 : 0.85;
  return {
    ...benchmark,
    market_price_per_kg: Math.round(benchmark.market_price_per_kg * gradeMultiplier),
    min_price_per_kg: Math.round(benchmark.min_price_per_kg * gradeMultiplier),
    max_price_per_kg: Math.round(benchmark.max_price_per_kg * gradeMultiplier),
    virgin_price_per_kg: benchmark.virgin_price_per_kg,
  };
}

export function validateSellerPrice(sellerPrice: number, benchmark: PriceBenchmark): {
  isReasonable: boolean;
  flag: string | null;
} {
  const deviation = (sellerPrice - benchmark.market_price_per_kg) / benchmark.market_price_per_kg;
  if (deviation > 0.5) {
    return { isReasonable: false, flag: `Seller price is ${Math.round(deviation * 100)}% above market benchmark` };
  }
  if (deviation < -0.5) {
    return { isReasonable: false, flag: `Seller price is ${Math.round(Math.abs(deviation) * 100)}% below market benchmark — possible underpricing` };
  }
  return { isReasonable: true, flag: null };
}
