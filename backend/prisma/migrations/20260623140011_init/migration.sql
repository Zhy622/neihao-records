-- CreateEnum
CREATE TYPE "Category" AS ENUM ('WORK', 'STUDY', 'RELATIONSHIP', 'CONSUMPTION', 'CHOICE', 'EMOTION', 'OTHER');

-- CreateEnum
CREATE TYPE "Emotion" AS ENUM ('ANXIETY', 'OVERTHINKING', 'FEAR', 'GRIEVANCE', 'ANGER', 'AVOIDANCE', 'BLANK');

-- CreateEnum
CREATE TYPE "TimeCost" AS ENUM ('WITHIN_5_MINUTES', 'WITHIN_30_MINUTES', 'WITHIN_1_HOUR', 'HALF_DAY', 'OVER_1_DAY');

-- CreateEnum
CREATE TYPE "WorthIt" AS ENUM ('WORTH_IT', 'NOT_WORTH_IT', 'UNCLEAR');

-- CreateEnum
CREATE TYPE "RecordSyncStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "emotions" "Emotion"[],
    "emotionIntensity" INTEGER NOT NULL,
    "decisionDifficulty" INTEGER NOT NULL,
    "timeCost" "TimeCost" NOT NULL,
    "thoughts" TEXT NOT NULL DEFAULT '',
    "finalDecision" TEXT NOT NULL DEFAULT '',
    "worthIt" "WorthIt" NOT NULL,
    "syncStatus" "RecordSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "records_userId_createdAt_idx" ON "records"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "records_userId_category_idx" ON "records"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "records_userId_clientId_key" ON "records"("userId", "clientId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
