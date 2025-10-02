-- Add timezone column to Blog table
-- Run this SQL manually in your production database

ALTER TABLE "Blog"
ADD COLUMN "timezone" TEXT DEFAULT 'America/Lima';

-- Optional: Add a comment to the column
COMMENT ON COLUMN "Blog"."timezone" IS 'Zona horaria del blog';
