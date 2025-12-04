-- DropIndex: Remove unique constraint from Blog.adminId to allow multiple blogs per admin
DROP INDEX IF EXISTS "Blog_adminId_key";
