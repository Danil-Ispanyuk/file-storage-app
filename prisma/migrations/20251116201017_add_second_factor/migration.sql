-- CreateEnum
CREATE TYPE "SecondFactorType" AS ENUM ('TOTP', 'WEBAUTHN');

-- CreateTable
CREATE TABLE "SecondFactor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SecondFactorType" NOT NULL DEFAULT 'TOTP',
    "secret" TEXT,
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecondFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecondFactor_userId_key" ON "SecondFactor"("userId");

-- CreateIndex
CREATE INDEX "SecondFactor_userId_idx" ON "SecondFactor"("userId");

-- AddForeignKey
ALTER TABLE "SecondFactor" ADD CONSTRAINT "SecondFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

