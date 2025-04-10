/*
  Warnings:

  - You are about to drop the column `label` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `MenuItem` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "BlogSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "template" TEXT NOT NULL DEFAULT 'default',
    "domain" TEXT,
    "googleAnalyticsId" TEXT,
    "socialNetworks" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "parentId" INTEGER,
    CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("id", "parentId") SELECT "id", "parentId" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
