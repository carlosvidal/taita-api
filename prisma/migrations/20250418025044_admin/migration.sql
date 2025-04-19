-- DropForeignKey
ALTER TABLE "Blog" DROP CONSTRAINT "Blog_adminId_fkey";

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
