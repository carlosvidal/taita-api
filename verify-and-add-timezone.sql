-- Script para verificar y agregar la columna timezone a la tabla Blog

-- Primero, verificar si la columna existe
DO $$
BEGIN
    -- Intentar agregar la columna solo si no existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Blog'
        AND column_name = 'timezone'
    ) THEN
        -- Agregar la columna
        ALTER TABLE "Blog" ADD COLUMN "timezone" TEXT DEFAULT 'America/Lima';
        RAISE NOTICE 'Columna timezone agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna timezone ya existe';
    END IF;
END $$;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Blog' AND column_name = 'timezone';
