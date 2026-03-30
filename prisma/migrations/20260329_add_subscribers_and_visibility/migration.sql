-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'SUBSCRIBERS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriberTier" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "tier" "SubscriberTier" NOT NULL DEFAULT 'FREE',
    "blogId" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "patreonId" TEXT,
    "patreonLinkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "subscriberId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogIntegration" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "blogId" INTEGER NOT NULL,
    "patreonClientId" TEXT,
    "patreonClientSecret" TEXT,
    "patreonCampaignId" TEXT,
    "patreonWebhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_uuid_key" ON "Subscriber"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BlogIntegration_uuid_key" ON "BlogIntegration"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "BlogIntegration_blogId_key" ON "BlogIntegration"("blogId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_email_blog_unique" ON "Subscriber"("email", "blogId");

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogIntegration" ADD CONSTRAINT "BlogIntegration_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
