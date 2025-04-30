-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('REGULAR', 'BURNER', 'DISPOSABLE');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "emailDomain" TEXT,
ADD COLUMN     "emailType" "EmailType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBurnerEmail" BOOLEAN NOT NULL DEFAULT false;
