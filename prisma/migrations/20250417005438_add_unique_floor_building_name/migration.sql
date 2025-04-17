/*
  Warnings:

  - A unique constraint covering the columns `[buildingName,name]` on the table `Floor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Floor_buildingName_name_key" ON "Floor"("buildingName", "name");
