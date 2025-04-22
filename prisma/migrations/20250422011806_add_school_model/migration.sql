/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,buildingName,name]` on the table `Floor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolId` to the `BulletinPost` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Floor_buildingName_name_key";

-- AlterTable
ALTER TABLE "BulletinPost" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Floor" ADD COLUMN     "schoolId" TEXT;

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- CreateIndex
CREATE INDEX "Floor_schoolId_idx" ON "Floor"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_schoolId_buildingName_name_key" ON "Floor"("schoolId", "buildingName", "name");

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPost" ADD CONSTRAINT "BulletinPost_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
