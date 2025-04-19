/*
  Warnings:

  - You are about to drop the `BlogUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[adminId]` on the table `Blog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `adminId` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BlogUser" DROP CONSTRAINT "BlogUser_blogId_fkey";

-- DropForeignKey
ALTER TABLE "BlogUser" DROP CONSTRAINT "BlogUser_userId_fkey";

-- AlterTable: agrega columnas nuevas como opcionales
ALTER TABLE "Blog"
  ADD COLUMN "adminId" INTEGER,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "googleAnalyticsId" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "socialNetworks" JSONB,
  ADD COLUMN "template" TEXT,
  ADD COLUMN "title" TEXT;

-- Pobla adminId con el primer admin existente si es necesario
UPDATE "Blog" SET "adminId" = (SELECT id FROM "Admin" LIMIT 1) WHERE "adminId" IS NULL;

-- DropTable
DROP TABLE "BlogUser";

-- CreateIndex
CREATE UNIQUE INDEX "Blog_adminId_key" ON "Blog"("adminId");

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
