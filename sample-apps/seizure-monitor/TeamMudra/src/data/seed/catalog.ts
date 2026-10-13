import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { LOCATION_IDS, ORGANIZATION_ID } from "./constants.js";
import type { CatalogSeedResult, CoreSeedResult } from "./types.js";

const categoryDefinitions = [
  ["cat-pharma", "PHARMA", "Medicines and pharmaceuticals", 35, "Asterol Medicine"],
  ["cat-surgical", "SURGICAL", "Surgical and procedural consumables", 20, "Sterile Procedure Supply"],
  ["cat-medical", "MEDICAL", "General medical consumables", 20, "Clinical Care Consumable"],
  ["cat-lab", "LAB", "Laboratory supplies", 12, "Diagnostic Reagent Supply"],
  ["cat-ppe", "PPE", "Personal protective equipment", 10, "Protective Equipment"],
  ["cat-linen", "LINEN", "Linen and housekeeping", 8, "Hospital Linen Supply"],
  ["cat-gas", "GAS", "Medical-gas supplies", 5, "Medical Gas Supply"],
  ["cat-biomed", "BIOMED", "Biomedical accessories and spares", 5, "Biomedical Spare"],
  ["cat-admin", "ADMIN", "Administrative and miscellaneous", 5, "Operations Supply"],
] as const;

export async function seedCatalog(
  client: PrismaClient,
  core: CoreSeedResult,
): Promise<CatalogSeedResult> {
  for (const [id, code, name] of categoryDefinitions) {
    await client.itemCategory.upsert({
      where: { id },
      create: { id, organizationId: ORGANIZATION_ID, code: `CF-${code}`, name, description: `${name} catalogue group` },
      update: { name },
    });
  }

  const items: Prisma.CatalogItemCreateManyInput[] = [];
  let itemNumber = 1;
  for (const [categoryId, , , count, prefix] of categoryDefinitions) {
    for (let categoryIndex = 1; categoryIndex <= count; categoryIndex += 1) {
      const id = `item-${String(itemNumber).padStart(3, "0")}`;
      let name = `${prefix} ${String(categoryIndex).padStart(2, "0")}`;
      if (id === "item-036") name = "Critical Airway Procedure Kit";
      if (id === "item-001") name = "Asterol Infusion 100 mL";
      if (id === "item-002") name = "Meraline Tablets 10 mg";
      if (id === "item-098") name = "Reusable Ward Bed Sheet";
      if (id === "item-106") name = "Medical Oxygen Cylinder 7 m3";
      const coldChain = itemNumber <= 6;
      const serialized = itemNumber >= 111 && itemNumber <= 115;
      items.push({
        id,
        organizationId: ORGANIZATION_ID,
        categoryId,
        sku: `CFI-${String(itemNumber).padStart(3, "0")}`,
        name,
        description: `Entirely fictional ${name.toLowerCase()} for deterministic demonstration data`,
        baseUnit: id === "item-106" ? "CYLINDER" : id === "item-098" ? "PIECE" : "UNIT",
        trackingMode: serialized ? "SERIAL" : "BATCH",
        storageRequirement: coldChain ? "COLD_CHAIN_2_TO_8_C" : id === "item-106" ? "SECURE_VENTILATED" : "AMBIENT_DRY",
        coldChainMinCentiCelsius: coldChain ? 200 : null,
        coldChainMaxCentiCelsius: coldChain ? 800 : null,
        shelfLifeDays: serialized ? null : 730,
        active: true,
      });
      itemNumber += 1;
    }
  }
  const existingItemIds = new Set((await client.catalogItem.findMany({ where: { id: { in: items.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingItems = items.filter(({ id }) => !existingItemIds.has(id));
  if (missingItems.length > 0) await client.catalogItem.createMany({ data: missingItems });

  const policies: Prisma.LocationItemPolicyCreateManyInput[] = [];
  const transferEligibleLocations: readonly string[] = [
    LOCATION_IDS.central,
    LOCATION_IDS.pharmacy,
    LOCATION_IDS.linen,
    LOCATION_IDS.gas,
  ];
  for (const item of items) {
    for (const locationId of core.locationIds) {
      let safety = locationId === LOCATION_IDS.central ? 24 : 8;
      let transferEligible = transferEligibleLocations.includes(locationId);
      if (item.id === "item-036" && locationId === LOCATION_IDS.central) safety = 40;
      if (item.id === "item-036" && locationId === LOCATION_IDS.pharmacy) safety = 30;
      if (item.id === "item-036" && locationId === LOCATION_IDS.icu) safety = 0;
      if (item.id === "item-036" && locationId === LOCATION_IDS.icu) transferEligible = false;
      policies.push({
        id: `policy-${locationId}-${item.id}`,
        locationId,
        itemId: item.id,
        parLevelBaseUnits: safety * 3 + 20,
        safetyStockBaseUnits: safety,
        reorderThresholdBaseUnits: safety + 10,
        transferEligible,
        minimumRemainingShelfLifeDays: 14,
      });
    }
  }
  const existingPolicyIds = new Set((await client.locationItemPolicy.findMany({ where: { id: { in: policies.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingPolicies = policies.filter(({ id }) => !existingPolicyIds.has(id));
  if (missingPolicies.length > 0) await client.locationItemPolicy.createMany({ data: missingPolicies });

  return {
    itemIds: items.map(({ id }) => id),
    categoryIds: categoryDefinitions.map(([id]) => id),
  };
}
