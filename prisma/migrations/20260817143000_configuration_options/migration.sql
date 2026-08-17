CREATE TABLE "ConfigurationOption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfigurationOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConfigurationOption_organizationId_category_value_key" ON "ConfigurationOption"("organizationId", "category", "value");
CREATE INDEX "ConfigurationOption_organizationId_category_active_sortOrder_idx" ON "ConfigurationOption"("organizationId", "category", "active", "sortOrder");
ALTER TABLE "ConfigurationOption" ADD CONSTRAINT "ConfigurationOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
