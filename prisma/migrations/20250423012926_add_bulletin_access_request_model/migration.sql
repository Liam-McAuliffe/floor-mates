-- CreateEnum
CREATE TYPE "BulletinAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "BulletinAccessRequest" (
    "id" TEXT NOT NULL,
    "clubName" TEXT,
    "status" "BulletinAccessStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "reviewedByAdminId" TEXT,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "BulletinAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulletinAccessRequest_userId_idx" ON "BulletinAccessRequest"("userId");

-- CreateIndex
CREATE INDEX "BulletinAccessRequest_schoolId_status_idx" ON "BulletinAccessRequest"("schoolId", "status");

-- CreateIndex
CREATE INDEX "BulletinAccessRequest_reviewedByAdminId_idx" ON "BulletinAccessRequest"("reviewedByAdminId");

-- AddForeignKey
ALTER TABLE "BulletinAccessRequest" ADD CONSTRAINT "BulletinAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinAccessRequest" ADD CONSTRAINT "BulletinAccessRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinAccessRequest" ADD CONSTRAINT "BulletinAccessRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
