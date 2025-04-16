-- CreateTable
CREATE TABLE "Series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" INTEGER NOT NULL,
    CONSTRAINT "Series_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "postId" INTEGER,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ip" TEXT NOT NULL,
    "isSuspect" BOOLEAN NOT NULL DEFAULT false,
    "honeypot" TEXT,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BlogSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Mi Blog',
    "description" TEXT NOT NULL DEFAULT 'Un blog personal',
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
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "categoryId" INTEGER,
    "image" TEXT,
    "imageId" INTEGER,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "authorId" INTEGER NOT NULL,
    "seriesId" INTEGER,
    "sequenceNumber" INTEGER,
    CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "categoryId", "content", "createdAt", "excerpt", "id", "image", "publishedAt", "slug", "status", "thumbnail", "title", "updatedAt", "uuid") SELECT "authorId", "categoryId", "content", "createdAt", "excerpt", "id", "image", "publishedAt", "slug", "status", "thumbnail", "title", "updatedAt", "uuid" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_uuid_key" ON "Post"("uuid");
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Series_uuid_key" ON "Series"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_uuid_key" ON "Comment"("uuid");
