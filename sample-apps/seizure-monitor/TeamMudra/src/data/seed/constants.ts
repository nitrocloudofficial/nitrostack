export const REFERENCE_TIME = new Date("2026-07-01T00:00:00.000Z");
export const RANDOM_SEED = 24_072_026;
export const ORGANIZATION_ID = "org-careflow-001";
export const ICU_ITEM_ID = "item-036";
export const RECALL_ITEM_ID = "item-001";
export const RECEIVING_ITEM_ID = "item-002";
export const LINEN_ITEM_ID = "item-098";
export const OXYGEN_ITEM_ID = "item-106";

export const LOCATION_IDS = {
  central: "loc-01",
  pharmacy: "loc-02",
  emergency: "loc-03",
  icu: "loc-04",
  wardA: "loc-05",
  wardB: "loc-06",
  theatre: "loc-07",
  outpatient: "loc-08",
  laboratory: "loc-09",
  biomedical: "loc-10",
  linen: "loc-11",
  gas: "loc-12",
} as const;

export function at(days: number, hours = 0): Date {
  return new Date(REFERENCE_TIME.getTime() + days * 86_400_000 + hours * 3_600_000);
}

export function positionKey(
  itemId: string,
  locationId: string,
  batchId: string | null,
  stockStatus: string,
  ownership = "HOSPITAL",
  reservationKey = "UNRESERVED",
): string {
  return [itemId, locationId, batchId ?? "NO_BATCH", stockStatus, ownership, reservationKey].join("|");
}

export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextInt(minimum: number, maximum: number): number {
    this.state = (Math.imul(this.state, 1_664_525) + 1_013_904_223) >>> 0;
    return minimum + (this.state % (maximum - minimum + 1));
  }
}
