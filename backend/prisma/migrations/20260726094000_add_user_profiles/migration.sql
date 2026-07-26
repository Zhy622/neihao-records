ALTER TABLE "users"
ADD COLUMN "signature" TEXT NOT NULL DEFAULT '',
ADD COLUMN "avatarData" BYTEA,
ADD COLUMN "avatarMimeType" TEXT;
