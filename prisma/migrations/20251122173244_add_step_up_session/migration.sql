-- CreateTable
CREATE TABLE "StepUpSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepUpSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StepUpSession_token_key" ON "StepUpSession"("token");

-- CreateIndex
CREATE INDEX "StepUpSession_userId_idx" ON "StepUpSession"("userId");

-- CreateIndex
CREATE INDEX "StepUpSession_expiresAt_idx" ON "StepUpSession"("expiresAt");

