export interface MaterialRequirement {
  material_type: string;
  quantity_kg: number;
  max_price_per_kg?: number;
  required_grade?: 'A' | 'B' | 'C' | 'U';
}

export interface SupplierOption {
  listing_id: string;
  factory_id: string;
  factory_name: string;
  material_type: string;
  quantity_kg: number;
  price_per_kg: number;
  grade: string;
  distance_km: number;
  trust_score: number;
  location: { lat: number; lng: number; address: string };
}

export interface MatchResult {
  assignments: Array<{
    requirement: MaterialRequirement;
    supplier: SupplierOption;
    allocated_kg: number;
    cost: number;
    transport_cost: number;
  }>;
  total_cost: number;
  total_transport_cost: number;
  coverage_percent: number;
  unmet_requirements: MaterialRequirement[];
}

const TRANSPORT_COST_PER_KM_PER_KG = 0.015;

function calculateTransportCost(distanceKm: number, quantityKg: number): number {
  return Math.round(distanceKm * quantityKg * TRANSPORT_COST_PER_KM_PER_KG);
}

function scoreSupplier(supplier: SupplierOption, requirement: MaterialRequirement): number {
  let score = 0;
  score += (100 - supplier.price_per_kg) * 0.4;
  score += (100 - Math.min(supplier.distance_km, 100)) * 0.25;
  score += supplier.trust_score * 0.2;
  score += (supplier.grade === requirement.required_grade ? 15 : supplier.grade === 'A' ? 10 : 0);
  return score;
}

export function solveOptimalMatching(
  requirements: MaterialRequirement[],
  suppliers: SupplierOption[]
): MatchResult {
  const assignments: MatchResult['assignments'] = [];
  const remainingSuppliers = new Map(suppliers.map((s) => [s.listing_id, { ...s }]));
  const unmet: MaterialRequirement[] = [];

  for (const req of requirements) {
    const matchingSuppliers = Array.from(remainingSuppliers.values())
      .filter((s) => s.material_type === req.material_type && s.quantity_kg > 0)
      .filter((s) => !req.max_price_per_kg || s.price_per_kg <= req.max_price_per_kg)
      .sort((a, b) => scoreSupplier(b, req) - scoreSupplier(a, req));

    let remaining = req.quantity_kg;
    let reqCovered = 0;

    for (const supplier of matchingSuppliers) {
      if (remaining <= 0) break;
      const allocate = Math.min(remaining, supplier.quantity_kg);
      const transportCost = calculateTransportCost(supplier.distance_km, allocate);

      assignments.push({
        requirement: req,
        supplier: { ...supplier },
        allocated_kg: allocate,
        cost: allocate * supplier.price_per_kg,
        transport_cost: transportCost,
      });

      supplier.quantity_kg -= allocate;
      remaining -= allocate;
      reqCovered += allocate;

      if (supplier.quantity_kg <= 0) {
        remainingSuppliers.delete(supplier.listing_id);
      }
    }

    if (remaining > 0) {
      unmet.push({ ...req, quantity_kg: remaining });
    }
  }

  const totalCost = assignments.reduce((sum, a) => sum + a.cost, 0);
  const totalTransport = assignments.reduce((sum, a) => sum + a.transport_cost, 0);
  const totalRequired = requirements.reduce((sum, r) => sum + r.quantity_kg, 0);
  const totalAllocated = assignments.reduce((sum, a) => sum + a.allocated_kg, 0);
  const coverage = totalRequired > 0 ? (totalAllocated / totalRequired) * 100 : 0;

  return {
    assignments,
    total_cost: totalCost,
    total_transport_cost: totalTransport,
    coverage_percent: Math.round(coverage),
    unmet_requirements: unmet,
  };
}
