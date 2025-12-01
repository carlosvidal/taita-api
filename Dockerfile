# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production && \
    npm cache clean --force

# Generar Prisma Client
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copiar node_modules y prisma desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copiar el código fuente
COPY . .

# Copiar y dar permisos al script de entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Crear directorios para uploads con permisos correctos
RUN mkdir -p uploads uploads/profiles /uploads /uploads/profiles .data && \
    chown -R node:node /app /uploads

# Usar usuario no-root
USER node

# Exponer puerto (por defecto 3000)
EXPOSE 3000

# Health check - aumentar start-period para dar tiempo a las migraciones
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio usando el entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
