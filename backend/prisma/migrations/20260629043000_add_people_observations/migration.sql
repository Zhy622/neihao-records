-- CreateEnum
CREATE TYPE "PeopleObservationEmotion" AS ENUM ('CONTEMPT', 'INFERIORITY', 'JEALOUSY', 'DEFIANT', 'ENVY', 'ADMIRATION', 'OTHER');

-- CreateTable
CREATE TABLE "people_observations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "alias" TEXT NOT NULL,
    "emotions" "PeopleObservationEmotion"[],
    "triggerScene" TEXT NOT NULL DEFAULT '',
    "contemptPoints" TEXT NOT NULL DEFAULT '',
    "inferiorityOrEnvyPoints" TEXT NOT NULL DEFAULT '',
    "otherStrengths" TEXT NOT NULL DEFAULT '',
    "myStrengths" TEXT NOT NULL DEFAULT '',
    "personDefinition" TEXT NOT NULL DEFAULT '',
    "learningAction" TEXT NOT NULL DEFAULT '',
    "syncStatus" "RecordSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "people_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "people_observations_userId_createdAt_idx" ON "people_observations"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "people_observations_userId_clientId_key" ON "people_observations"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "people_observations" ADD CONSTRAINT "people_observations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
