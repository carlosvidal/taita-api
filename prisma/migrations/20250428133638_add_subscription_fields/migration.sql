-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "nextPaymentDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;
