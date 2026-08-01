-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TransferLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "requirementId" TEXT,
    "itemId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantityBaseUnits" INTEGER NOT NULL,
    CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CatalogItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TransferLine" ("batchId", "id", "itemId", "quantityBaseUnits", "requirementId", "transferId") SELECT "batchId", "id", "itemId", "quantityBaseUnits", "requirementId", "transferId" FROM "TransferLine";
DROP TABLE "TransferLine";
ALTER TABLE "new_TransferLine" RENAME TO "TransferLine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
