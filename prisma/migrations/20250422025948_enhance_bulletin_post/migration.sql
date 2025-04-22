-- CreateEnum
CREATE TYPE "BulletinEventType" AS ENUM ('EVENT', 'RECURRING');

-- DropIndex
DROP INDEX "BulletinPost_createdAt_idx";

-- AlterTable
ALTER TABLE "BulletinPost" ADD COLUMN     "eventTime" TEXT,
ADD COLUMN     "eventType" "BulletinEventType" NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "flyerImageUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "recurringDays" TEXT[];

-- CreateIndex
CREATE INDEX "BulletinPost_schoolId_createdAt_idx" ON "BulletinPost"("schoolId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BulletinPost_eventType_idx" ON "BulletinPost"("eventType");
