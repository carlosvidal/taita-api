#!/bin/sh
set -e

echo "🚀 Starting API..."

# Ejecutar migraciones de Prisma
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Ejecutar seed si es necesario (opcional)
# echo "🌱 Running database seed..."
# npx prisma db seed

echo "✅ Database ready!"

# Iniciar la aplicación
echo "🎯 Starting application..."
exec npm start
