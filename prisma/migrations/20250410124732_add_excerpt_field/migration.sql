/*
  Warnings:

  - Made the column `uuid` on table `Admin` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uuid` on table `BlogSettings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uuid` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uuid` on table `Media` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uuid` on table `MenuItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uuid` on table `Page` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uuid` on table `Post` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "bio" TEXT,
    "picture" TEXT
);
INSERT INTO "new_Admin" ("bio", "email", "id", "name", "password", "picture", "uuid") SELECT "bio", "email", "id", "name", "password", "picture", "uuid" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_uuid_key" ON "Admin"("uuid");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE TABLE "new_BlogSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "template" TEXT NOT NULL DEFAULT 'default',
    "domain" TEXT,
    "googleAnalyticsId" TEXT,
    "socialNetworks" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_BlogSettings" ("createdAt", "domain", "googleAnalyticsId", "id", "language", "socialNetworks", "template", "updatedAt", "uuid") SELECT "createdAt", "domain", "googleAnalyticsId", "id", "language", "socialNetworks", "template", "updatedAt", "uuid" FROM "BlogSettings";
DROP TABLE "BlogSettings";
ALTER TABLE "new_BlogSettings" RENAME TO "BlogSettings";
CREATE UNIQUE INDEX "BlogSettings_uuid_key" ON "BlogSettings"("uuid");
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);
INSERT INTO "new_Category" ("id", "name", "slug", "uuid") SELECT "id", "name", "slug", "uuid" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_uuid_key" ON "Category"("uuid");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE TABLE "new_Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Media" ("createdAt", "filename", "id", "path", "size", "type", "updatedAt", "uuid") SELECT "createdAt", "filename", "id", "path", "size", "type", "updatedAt", "uuid" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE UNIQUE INDEX "Media_uuid_key" ON "Media"("uuid");
CREATE TABLE "new_MenuItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "parentId" INTEGER,
    CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("id", "label", "order", "parentId", "url", "uuid") SELECT "id", "label", "order", "parentId", "url", "uuid" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
CREATE UNIQUE INDEX "MenuItem_uuid_key" ON "MenuItem"("uuid");
CREATE TABLE "new_Page" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "authorId" INTEGER NOT NULL,
    CONSTRAINT "Page_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Page" ("authorId", "content", "id", "publishedAt", "slug", "status", "title", "uuid") SELECT "authorId", "content", "id", "publishedAt", "slug", "status", "title", "uuid" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
CREATE UNIQUE INDEX "Page_uuid_key" ON "Page"("uuid");
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
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
INSERT INTO "new_Post" ("authorId", "categoryId", "content", "createdAt", "id", "image", "publishedAt", "slug", "status", "thumbnail", "title", "updatedAt", "uuid") SELECT "authorId", "categoryId", "content", "createdAt", "id", "image", "publishedAt", "slug", "status", "thumbnail", "title", "updatedAt", "uuid" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_uuid_key" ON "Post"("uuid");
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
