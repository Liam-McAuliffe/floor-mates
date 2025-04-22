/*
  Warnings:

  - Made the column `schoolId` on table `Floor` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Floor" ALTER COLUMN "schoolId" SET NOT NULL;
