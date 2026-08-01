import { prisma } from "./client.js";
import { seedCatalog } from "./seed/catalog.js";
import { seedCore } from "./seed/core.js";
import { seedInventory } from "./seed/inventory.js";
import { seedScenarios } from "./seed/scenarios.js";
import { seedSuppliers } from "./seed/suppliers.js";

async function main(): Promise<void> {
  const core = await seedCore(prisma);
  const catalog = await seedCatalog(prisma, core);
  const suppliers = await seedSuppliers(prisma, catalog);
  const inventory = await seedInventory(prisma, core, catalog);
  const scenarios = await seedScenarios(prisma, core, suppliers);

  const counts = await Promise.all([
    prisma.organization.count(),
    prisma.location.count({ where: { organizationId: core.organizationId } }),
    prisma.user.count({ where: { organizationId: core.organizationId, active: true } }),
    prisma.catalogItem.count({ where: { organizationId: core.organizationId } }),
    prisma.supplier.count({ where: { organizationId: core.organizationId } }),
    prisma.stockBatch.count(),
    prisma.inventoryLedgerEntry.count(),
    prisma.stockPosition.count(),
    prisma.asset.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        seeded: true,
        declaredLedgerRows: inventory.ledgerEntryCount,
        scenarioRequirementId: scenarios.requirementId,
        counts: {
          organizations: counts[0],
          locations: counts[1],
          activeUsers: counts[2],
          items: counts[3],
          suppliers: counts[4],
          batches: counts[5],
          ledgerEntries: counts[6],
          stockPositions: counts[7],
          assets: counts[8],
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error("CareFlow seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
