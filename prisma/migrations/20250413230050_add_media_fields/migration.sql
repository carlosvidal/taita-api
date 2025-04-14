/*
  Warnings:

  - You are about to drop the column `type` on the `Media` table. All the data in the column will be lost.
  - Added the required column `mimeType` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Page" ADD COLUMN "image" TEXT;
ALTER TABLE "Page" ADD COLUMN "imageId" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "variants" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Insertar registros existentes con valores por defecto para los nuevos campos requeridos
INSERT INTO "new_Media" ("createdAt", "filename", "id", "path", "size", "updatedAt", "uuid", "originalName", "mimeType") 
SELECT 
    "createdAt", 
    "filename", 
    "id", 
    "path", 
    "size", 
    "updatedAt", 
    "uuid",
    "filename" AS "originalName", -- Usar filename como originalName por defecto
    COALESCE("type", 'image/jpeg') AS "mimeType" -- Usar type si existe, o 'image/jpeg' como valor por defecto
FROM "Media";

DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE UNIQUE INDEX "Media_uuid_key" ON "Media"("uuid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Actualizar los valores de variants para los registros existentes
UPDATE "Media" SET "variants" = json_array(json_object('size', 'original', 'filename', "filename")) WHERE "variants" IS NULL;
