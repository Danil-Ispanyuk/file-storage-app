-- AlterTable
ALTER TABLE "User" ADD COLUMN "storageQuota" INTEGER NOT NULL DEFAULT 104857600,
ADD COLUMN "usedStorage" INTEGER NOT NULL DEFAULT 0;

-- Update existing users' usedStorage based on their files
UPDATE "User"
SET "usedStorage" = COALESCE(
  (SELECT SUM("size") FROM "File" WHERE "File"."userId" = "User"."id"),
  0
);

