-- AlterTable: make blogId optional and add adminId
ALTER TABLE "ApiKey" ALTER COLUMN "blogId" DROP NOT NULL;

-- AddColumn
ALTER TABLE "ApiKey" ADD COLUMN "adminId" INTEGER;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
