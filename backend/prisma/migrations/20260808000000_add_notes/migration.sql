CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "content" TEXT NOT NULL,
    "noteType" TEXT NOT NULL,
    "emotions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "syncStatus" "RecordSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_userId_createdAt_idx" ON "notes"("userId", "createdAt");
CREATE UNIQUE INDEX "notes_userId_clientId_key" ON "notes"("userId", "clientId");

ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
