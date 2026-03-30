-- AlterTable
ALTER TABLE "Blog" ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Blog" ADD COLUMN "adsensePublisherId" TEXT;
ALTER TABLE "Blog" ADD COLUMN "adSlots" JSONB;
