-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAudit" (
    "id" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "filePath" TEXT,
    "overallThreatScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "structuralFlags" JSONB NOT NULL,
    "linkFlags" JSONB NOT NULL,
    "aiFraudReport" JSONB NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ScanAudit_riskLevel_idx" ON "ScanAudit"("riskLevel");

-- CreateIndex
CREATE INDEX "ScanAudit_createdAt_idx" ON "ScanAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "ScanAudit" ADD CONSTRAINT "ScanAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
