-- CreateTable
CREATE TABLE "FloorInvitationCode" (
    "code" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSingleUse" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloorInvitationCode_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "FloorInvitationCode_floorId_idx" ON "FloorInvitationCode"("floorId");

-- AddForeignKey
ALTER TABLE "FloorInvitationCode" ADD CONSTRAINT "FloorInvitationCode_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorInvitationCode" ADD CONSTRAINT "FloorInvitationCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
