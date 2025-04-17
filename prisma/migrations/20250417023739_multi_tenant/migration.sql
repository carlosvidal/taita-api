/*
  Warnings:

  - You are about to drop the `BlogSettings` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `blogId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogId` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogId` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogId` to the `Page` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogId` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blogId` to the `Series` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "BlogUserRole" AS ENUM ('OWNER', 'EDITOR', 'CONTRIBUTOR');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "blogId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "blogId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "blogId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "blogId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "blogId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "blogId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "BlogSettings";

-- CreateTable
CREATE TABLE "Blog" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT,
    "domain" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "blogId" INTEGER NOT NULL,
    "role" "BlogUserRole" NOT NULL,

    CONSTRAINT "BlogUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blog_uuid_key" ON "Blog"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "BlogUser_userId_blogId_key" ON "BlogUser"("userId", "blogId");

-- AddForeignKey
ALTER TABLE "BlogUser" ADD CONSTRAINT "BlogUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogUser" ADD CONSTRAINT "BlogUser_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Crea un blog dummy
INSERT INTO "Blog" ("id", "uuid", "name", "createdAt", "updatedAt") VALUES (1, gen_random_uuid(), 'Blog Migración', now(), now());

-- Actualiza los registros existentes para apuntar al blog dummy
UPDATE "Category" SET "blogId" = 1 WHERE "blogId" IS NULL;
UPDATE "Page" SET "blogId" = 1 WHERE "blogId" IS NULL;
UPDATE "Post" SET "blogId" = 1 WHERE "blogId" IS NULL;