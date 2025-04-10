/*
  Warnings:

  - The required column `uuid` was added to the `Admin` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `BlogSettings` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Category` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Media` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `label` to the `MenuItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `MenuItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `MenuItem` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `MenuItem` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Page` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `uuid` was added to the `Post` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "bio" TEXT,
    "picture" TEXT
);
INSERT INTO "new_Admin" ("bio", "email", "id", "name", "password", "picture") SELECT "bio", "email", "id", "name", "password", "picture" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
UPDATE "Admin" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "Admin_uuid_key" ON "Admin"("uuid");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE TABLE "new_BlogSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "template" TEXT NOT NULL DEFAULT 'default',
    "domain" TEXT,
    "googleAnalyticsId" TEXT,
    "socialNetworks" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BlogSettings" ("createdAt", "domain", "googleAnalyticsId", "id", "language", "socialNetworks", "template", "updatedAt") SELECT "createdAt", "domain", "googleAnalyticsId", "id", "language", "socialNetworks", "template", "updatedAt" FROM "BlogSettings";
DROP TABLE "BlogSettings";
ALTER TABLE "new_BlogSettings" RENAME TO "BlogSettings";
UPDATE "BlogSettings" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "BlogSettings_uuid_key" ON "BlogSettings"("uuid");
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);
INSERT INTO "new_Category" ("id", "name", "slug") SELECT "id", "name", "slug" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
UPDATE "Category" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "Category_uuid_key" ON "Category"("uuid");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE TABLE "new_Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Media" ("createdAt", "filename", "id", "path", "size", "type", "updatedAt") SELECT "createdAt", "filename", "id", "path", "size", "type", "updatedAt" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
UPDATE "Media" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "Media_uuid_key" ON "Media"("uuid");
CREATE TABLE "new_MenuItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parentId" INTEGER,
    CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("id", "parentId") SELECT "id", "parentId" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
UPDATE "MenuItem" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "MenuItem_uuid_key" ON "MenuItem"("uuid");
CREATE TABLE "new_Page" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "authorId" INTEGER NOT NULL,
    CONSTRAINT "Page_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Page" ("authorId", "content", "id", "publishedAt", "slug", "status", "title") SELECT "authorId", "content", "id", "publishedAt", "slug", "status", "title" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
UPDATE "Page" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "Page_uuid_key" ON "Page"("uuid");
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "image" TEXT,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "authorId" INTEGER NOT NULL,
    CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "categoryId", "content", "createdAt", "id", "image", "publishedAt", "slug", "status", "thumbnail", "title", "updatedAt") SELECT "authorId", "categoryId", "content", "createdAt", "id", "image", "publishedAt", "slug", "status", "thumbnail", "title", "updatedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
UPDATE "Post" SET uuid = (SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))));
CREATE UNIQUE INDEX "Post_uuid_key" ON "Post"("uuid");
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
