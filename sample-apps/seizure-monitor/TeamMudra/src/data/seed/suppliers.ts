import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { ICU_ITEM_ID, ORGANIZATION_ID } from "./constants.js";
import type { CatalogSeedResult, SupplierSeedResult } from "./types.js";

const supplierNames = [
  "Blue Cedar Medical Supplies",
  "Kitebridge Clinical Distribution",
  "Amber Lotus Healthcare Goods",
  "Northstar Sterile Products",
  "Silver Fern Laboratory Supply",
  "Coral Arc Safety Equipment",
  "Juniper Ward Essentials",
  "Nimbus Gas Logistics",
  "Bright Anvil Biomedical Parts",
  "Maple Thread Linen Services",
  "Orchid Route Pharmaceuticals",
  "Pebble Creek General Supply",
] as const;

export async function seedSuppliers(
  client: PrismaClient,
  catalog: CatalogSeedResult,
): Promise<SupplierSeedResult> {
  const supplierIds: string[] = [];
  for (let index = 1; index <= supplierNames.length; index += 1) {
    const id = `supplier-${String(index).padStart(2, "0")}`;
    supplierIds.push(id);
    const name = supplierNames[index - 1];
    await client.supplier.upsert({
      where: { id },
      create: {
        id,
        organizationId: ORGANIZATION_ID,
        code: `CFS-${String(index).padStart(3, "0")}`,
        name,
        taxIdentifier: `29CFX${String(10_000 + index)}Z${index % 9}`,
        addressLine: `${200 + index} Synthetic Commerce Park`,
        city: "Navanagar",
        state: "Karnataka",
        postalCode: `561${String(100 + index).slice(-3)}`,
        complianceStatus: index === 4 ? "CONDITIONAL" : "COMPLIANT",
        performanceScoreBasisPoints: 7_200 + index * 180,
        active: true,
      },
      update: {
        name,
        complianceStatus: index === 4 ? "CONDITIONAL" : "COMPLIANT",
        performanceScoreBasisPoints: 7_200 + index * 180,
      },
    });
    await client.supplierContact.upsert({
      where: { id: `supplier-contact-${String(index).padStart(2, "0")}` },
      create: {
        id: `supplier-contact-${String(index).padStart(2, "0")}`,
        supplierId: id,
        name: `Synthetic Contact ${String(index).padStart(2, "0")}`,
        email: `orders@vendor${String(index).padStart(2, "0")}.example.invalid`,
        phone: `+91-70000-${String(10_000 + index)}`,
        portalTokenHash: `sha256-demo-token-${String(index).padStart(2, "0")}`,
        primary: true,
      },
      update: { primary: true },
    });
  }

  const supplierItems: Prisma.SupplierItemCreateManyInput[] = [];
  for (let supplierIndex = 0; supplierIndex < supplierIds.length; supplierIndex += 1) {
    const usedItemIds = new Set<string>();
    for (let offset = 0; offset < 12; offset += 1) {
      let itemId = offset === 0 ? ICU_ITEM_ID : catalog.itemIds[(supplierIndex * 9 + offset) % catalog.itemIds.length];
      let candidateOffset = 1;
      while (usedItemIds.has(itemId)) {
        itemId = catalog.itemIds[(supplierIndex * 9 + offset + candidateOffset) % catalog.itemIds.length];
        candidateOffset += 1;
      }
      usedItemIds.add(itemId);
      supplierItems.push({
        id: `supplier-item-${String(supplierIndex + 1).padStart(2, "0")}-${itemId}`,
        supplierId: supplierIds[supplierIndex],
        itemId,
        supplierSku: `VS${String(supplierIndex + 1).padStart(2, "0")}-${itemId.slice(-3)}`,
        unitPricePaise: 4_500 + supplierIndex * 175 + offset * 40,
        gstBasisPoints: 1_200,
        leadTimeDays: 2 + (supplierIndex % 7),
        minimumOrderBaseUnits: 10,
        availableBaseUnits: 20 + supplierIndex * 10,
        compliant: supplierIndex !== 3,
      });
    }
  }
  const existingSupplierItemIds = new Set((await client.supplierItem.findMany({ where: { id: { in: supplierItems.map(({ id }) => id) } }, select: { id: true } })).map(({ id }) => id));
  const missingSupplierItems = supplierItems.filter(({ id }) => !existingSupplierItemIds.has(id));
  if (missingSupplierItems.length > 0) await client.supplierItem.createMany({ data: missingSupplierItems });
  return { supplierIds };
}
