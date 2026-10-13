import { PharmacyItem } from "./pharmacy.types.js";

/** Data access contract for pharmacy items. Swap the implementation, not this interface. */
export interface PharmacyRepository {
  findAll(filter?: { category?: string }): Promise<PharmacyItem[]>;
  findById(id: string): Promise<PharmacyItem | null>;
}

/** In-memory implementation used until the SQLite repository exists. */
export class InMemoryPharmacyRepository implements PharmacyRepository {
  private readonly items: PharmacyItem[];

  constructor(seed?: PharmacyItem[]) {
    this.items = seed ?? InMemoryPharmacyRepository.defaultSeed();
  }

  async findAll(filter?: { category?: string }): Promise<PharmacyItem[]> {
    if (!filter?.category) {
      return [...this.items];
    }
    return this.items.filter(
      (item) => item.category.toLowerCase() === filter.category!.toLowerCase()
    );
  }

  async findById(id: string): Promise<PharmacyItem | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  private static defaultSeed(): PharmacyItem[] {
    const now = Date.now();
    const daysFromNow = (days: number) =>
      new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
    const daysAgo = (days: number) =>
      new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

    return [
      {
        id: "PH-001",
        name: "Amoxicillin 500mg",
        category: "antibiotics",
        currentStock: 40,
        reorderThreshold: 100,
        maxCapacity: 1000,
        unit: "capsules",
        expiryDate: daysFromNow(20),
        lastRestockedAt: daysAgo(45),
      },
      {
        id: "PH-002",
        name: "Paracetamol 500mg",
        category: "analgesics",
        currentStock: 850,
        reorderThreshold: 200,
        maxCapacity: 1000,
        unit: "tablets",
        expiryDate: daysFromNow(400),
        lastRestockedAt: daysAgo(5),
      },
      {
        id: "PH-003",
        name: "Insulin Glargine",
        category: "hormones",
        currentStock: 12,
        reorderThreshold: 30,
        maxCapacity: 200,
        unit: "vials",
        expiryDate: daysFromNow(10),
        lastRestockedAt: daysAgo(60),
      },
      {
        id: "PH-004",
        name: "Atorvastatin 20mg",
        category: "cardiovascular",
        currentStock: 300,
        reorderThreshold: 100,
        maxCapacity: 500,
        unit: "tablets",
        expiryDate: daysFromNow(200),
        lastRestockedAt: daysAgo(15),
      },
      {
        id: "PH-005",
        name: "Sodium Chloride 0.9% IV",
        category: "fluids",
        currentStock: 480,
        reorderThreshold: 100,
        maxCapacity: 500,
        unit: "bags",
        expiryDate: daysFromNow(500),
        lastRestockedAt: daysAgo(10),
      },
    ];
  }
}